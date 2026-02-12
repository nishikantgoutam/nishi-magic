// ============================================================================
// DevWeaver – MCP Server
//
// Exposes DevWeaver functions as MCP tools for Claude Code integration.
// Implements Model Context Protocol (MCP) using stdio transport.
// ============================================================================

import logger from '../utils/logger.js';
import { getDevWeaverTools } from './tools.js';
import type { Tool, ToolInput } from '../types/index.js';

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number;
  method: string;
  params?: unknown;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id?: string | number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

// interface JsonRpcNotification {
//   jsonrpc: '2.0';
//   method: string;
//   params?: unknown;
// }

/**
 * MCP Server for DevWeaver
 * Implements stdio transport with JSON-RPC protocol
 */
export class DevWeaverMCPServer {
  private tools: Tool[];
  private serverInfo = {
    name: 'devweaver',
    version: '1.0.0',
  };

  constructor() {
    this.tools = getDevWeaverTools();
    logger.info(`DevWeaver MCP Server initialized with ${this.tools.length} tools`);
  }

  /**
   * Start the MCP server with stdio transport
   */
  start(): void {
    logger.info('Starting DEVWEAVER MCP Server on stdio...');

    // Read from stdin line by line
    let buffer = '';

    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk: string) => {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          this.handleMessage(line);
        }
      }
    });

    process.stdin.on('end', () => {
      logger.info('DEVWEAVER MCP Server shutting down...');
      process.exit(0);
    });

    process.on('SIGINT', () => {
      logger.info('DEVWEAVER MCP Server interrupted');
      process.exit(0);
    });

    logger.success('DEVWEAVER MCP Server started and listening on stdio');
  }

  /**
   * Handle incoming JSON-RPC message
   */
  private handleMessage(message: string): void {
    try {
      const request = JSON.parse(message) as JsonRpcRequest;
      this.processRequest(request).then(response => {
        if (response) {
          this.sendResponse(response);
        }
      }).catch(error => {
        this.sendError(request.id, -32603, 'Internal error', error);
      });
    } catch (error) {
      this.sendError(undefined, -32700, 'Parse error', error);
    }
  }

  /**
   * Process JSON-RPC request
   */
  private async processRequest(request: JsonRpcRequest): Promise<JsonRpcResponse | null> {
    const { method, params, id } = request;

    switch (method) {
      case 'initialize':
        return this.handleInitialize(id, params);

      case 'initialized':
        // Notification - no response
        logger.info('MCP client initialized');
        return null;

      case 'tools/list':
        return this.handleListTools(id);

      case 'tools/call':
        return await this.handleCallTool(id, params);

      case 'ping':
        return { jsonrpc: '2.0', id, result: { status: 'ok' } };

      default:
        return {
          jsonrpc: '2.0',
          id,
          error: {
            code: -32601,
            message: `Method not found: ${method}`,
          },
        };
    }
  }

  /**
   * Handle initialize request
   */
  private handleInitialize(
    id: string | number | undefined,
    _params: unknown
  ): JsonRpcResponse {
    logger.info('Client initializing MCP connection...');

    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        serverInfo: this.serverInfo,
        capabilities: {
          tools: {},
        },
      },
    };
  }

  /**
   * Handle list_tools request
   */
  private handleListTools(id: string | number | undefined): JsonRpcResponse {
    const tools = this.tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.input_schema,
    }));

    return {
      jsonrpc: '2.0',
      id,
      result: {
        tools,
      },
    };
  }

  /**
   * Handle call_tool request
   */
  private async handleCallTool(
    id: string | number | undefined,
    params: unknown
  ): Promise<JsonRpcResponse> {
    if (!params || typeof params !== 'object') {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32602,
          message: 'Invalid params',
        },
      };
    }

    const { name, arguments: args } = params as { name: string; arguments: unknown };

    const tool = this.tools.find(t => t.name === name);
    if (!tool) {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32602,
          message: `Tool not found: ${name}`,
        },
      };
    }

    try {
      logger.tool(name, 'Executing...');
      const result = await tool.execute(args as ToolInput);

      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
            },
          ],
        },
      };
    } catch (error) {
      logger.error(`Tool execution failed: ${name}`, error);
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: 'Tool execution failed',
          data: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Send JSON-RPC response to stdout
   */
  private sendResponse(response: JsonRpcResponse): void {
    process.stdout.write(JSON.stringify(response) + '\n');
  }

  /**
   * Send JSON-RPC error response
   */
  private sendError(
    id: string | number | undefined,
    code: number,
    message: string,
    data?: unknown
  ): void {
    const error: JsonRpcResponse = {
      jsonrpc: '2.0',
      id,
      error: {
        code,
        message,
        data: data instanceof Error ? data.message : data,
      },
    };
    this.sendResponse(error);
  }

  /**
   * Send JSON-RPC notification
   * Currently unused, but available for future notifications
   */
  // private sendNotification(method: string, params?: unknown): void {
  //   const notification: JsonRpcNotification = {
  //     jsonrpc: '2.0',
  //     method,
  //     params,
  //   };
  //   process.stdout.write(JSON.stringify(notification) + '\n');
  // }
}

/**
 * Start the MCP server
 */
export function startMCPServer(): void {
  const server = new DevWeaverMCPServer();
  server.start();
}
