// ============================================================================
// NISHI – MCP (Model Context Protocol) Client
//
// Connects to MCP servers (stdio or SSE) and dynamically registers their
// tools into the NISHI tool registry.
// ============================================================================
import { spawn, ChildProcess } from 'node:child_process';
import { request } from '../utils/http.js';
import logger from '../utils/logger.js';
import registry from './registry.js';
import fs from 'node:fs';
import path from 'node:path';

interface MCPServerConfig {
  name: string;
  transport: 'stdio' | 'sse';
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
}

interface ToolDefinition {
  name: string;
  description?: string;
  inputSchema?: unknown;
  input_schema?: unknown;
}

// ── Stdio Transport ─────────────────────────────────────────────────────────

class StdioMCPClient {
  private config: MCPServerConfig;
  private process: ChildProcess | null = null;
  private requestId = 0;
  private pending: Map<number, { resolve: (val: unknown) => void; reject: (err: Error) => void }> = new Map();
  private buffer = '';

  constructor(config: MCPServerConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    const { command = '', args = [], env = {} } = this.config;
    this.process = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, ...env },
    });

    this.process.stdout?.on('data', (data: Buffer) => this._onData(data.toString()));
    this.process.stderr?.on('data', (data: Buffer) => logger.debug(`MCP[${this.config.name}] stderr:`, data.toString()));
    this.process.on('error', (err: Error) => logger.error(`MCP[${this.config.name}] process error:`, err.message));
    this.process.on('exit', (code: number | null) => logger.info(`MCP[${this.config.name}] exited with code ${code}`));

    // Initialize
    await this._sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'nishi', version: '1.0.0' },
    });

    // Send initialized notification
    this._sendNotification('notifications/initialized', {});

    logger.success(`Connected to MCP server: ${this.config.name}`);
  }

  private _onData(chunk: string): void {
    this.buffer += chunk;
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const msg = JSON.parse(trimmed) as Record<string, unknown>;
        if (typeof msg.id === 'number' && this.pending.has(msg.id)) {
          const pending = this.pending.get(msg.id)!;
          this.pending.delete(msg.id);
          if (msg.error) {
            const error = msg.error as Record<string, unknown>;
            pending.reject(new Error(String(error.message) || JSON.stringify(msg.error)));
          } else {
            pending.resolve(msg.result);
          }
        }
      } catch {
        // skip non-JSON lines
      }
    }
  }

  private _sendRequest(method: string, params: unknown): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = ++this.requestId;
      this.pending.set(id, { resolve, reject });
      const msg = JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n';
      this.process?.stdin?.write(msg);

      // Timeout
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`MCP request timed out: ${method}`));
        }
      }, 30_000);
    });
  }

  private _sendNotification(method: string, params: unknown): void {
    const msg = JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n';
    this.process?.stdin?.write(msg);
  }

  async listTools(): Promise<ToolDefinition[]> {
    const result = await this._sendRequest('tools/list', {}) as Record<string, unknown>;
    return (result.tools as ToolDefinition[]) || [];
  }

  async callTool(name: string, args: unknown): Promise<unknown> {
    const result = await this._sendRequest('tools/call', { name, arguments: args });
    return result;
  }

  disconnect(): void {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
  }
}

// ── SSE Transport ───────────────────────────────────────────────────────────

class SSEMCPClient {
  private config: MCPServerConfig;
  private baseUrl: string;

  constructor(config: MCPServerConfig) {
    this.config = config;
    this.baseUrl = config.url || '';
  }

  async connect(): Promise<void> {
    // SSE transport: initialize via POST
    const res = await request(`${this.baseUrl}/initialize`, {
      method: 'POST',
      body: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'nishi', version: '1.0.0' },
      },
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.status >= 300) throw new Error(`MCP SSE init error: ${res.status}`);
    logger.success(`Connected to MCP SSE server: ${this.config.name}`);
  }

  async listTools(): Promise<ToolDefinition[]> {
    const res = await request(`${this.baseUrl}/tools/list`, {
      method: 'POST',
      body: {},
      headers: { 'Content-Type': 'application/json' },
    });
    return ((res.data as Record<string, unknown>)?.tools as ToolDefinition[]) || [];
  }

  async callTool(name: string, args: unknown): Promise<unknown> {
    const res = await request(`${this.baseUrl}/tools/call`, {
      method: 'POST',
      body: { name, arguments: args },
      headers: { 'Content-Type': 'application/json' },
    });
    return res.data;
  }

  disconnect(): void {
    // No persistent connection to close for SSE in this implementation
  }
}

// ── MCP Manager ─────────────────────────────────────────────────────────────

class MCPManager {
  clients: Map<string, StdioMCPClient | SSEMCPClient> = new Map();

  /**
   * Load MCP server configs from a JSON file.
   */
  loadConfig(configPath: string): MCPServerConfig[] {
    const absPath = path.resolve(configPath);
    if (!fs.existsSync(absPath)) {
      logger.info(`No MCP config found at ${absPath} — skipping`);
      return [];
    }
    const raw = fs.readFileSync(absPath, 'utf-8');
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return (parsed.mcpServers || parsed.servers) as MCPServerConfig[] || [];
  }

  /**
   * Connect to an MCP server and register its tools.
   */
  async connectServer(serverConfig: MCPServerConfig): Promise<number> {
    const client = serverConfig.transport === 'sse'
      ? new SSEMCPClient(serverConfig)
      : new StdioMCPClient(serverConfig);

    try {
      await client.connect();
      this.clients.set(serverConfig.name, client);

      // Discover and register tools
      const tools = await client.listTools();
      logger.info(`MCP[${serverConfig.name}] discovered ${tools.length} tools`);

      for (const tool of tools) {
        const mcpToolName = `mcp_${serverConfig.name}_${tool.name}`;
        registry.register(
          {
            name: mcpToolName,
            description: `[MCP:${serverConfig.name}] ${tool.description || tool.name}`,
            input_schema: (tool.inputSchema || tool.input_schema || { type: 'object', properties: {} }) as { type: 'object'; properties: Record<string, unknown>; required?: string[] },
          },
          (async (input: unknown) => {
            const result = await client.callTool(tool.name, input);
            return result;
          }) as any
        );
      }

      return tools.length;
    } catch (err) {
      logger.error(`Failed to connect MCP server "${serverConfig.name}":`, err instanceof Error ? err.message : String(err));
      return 0;
    }
  }

  /**
   * Connect to all servers from config.
   */
  async connectAll(configs: MCPServerConfig[]): Promise<number> {
    let totalTools = 0;
    for (const cfg of configs) {
      totalTools += await this.connectServer(cfg);
    }
    return totalTools;
  }

  /**
   * Disconnect all MCP servers.
   */
  disconnectAll(): void {
    for (const [name, client] of this.clients) {
      logger.info(`Disconnecting MCP server: ${name}`);
      client.disconnect();
    }
    this.clients.clear();
  }
}

const mcpManager = new MCPManager();
export default mcpManager;
