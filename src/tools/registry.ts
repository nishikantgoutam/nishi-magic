// ============================================================================
// DEVWEAVER – Tool Registry
// ============================================================================

import logger from '../utils/logger.js';
import type { ToolDefinition, ToolInput, Tool, ToolOutput } from '../types/index.js';

interface ToolEntry {
  definition: ToolDefinition;
  handler: (input: ToolInput) => Promise<ToolOutput>;
}

class ToolRegistry {
  private tools: Map<string, ToolEntry>;

  constructor() {
    this.tools = new Map();
  }

  /**
   * Register a tool.
   */
  register(definition: ToolDefinition, handler: (input: ToolInput) => Promise<ToolOutput>): void {
    this.tools.set(definition.name, { definition, handler });
    logger.debug(`Tool registered: ${definition.name}`);
  }

  /**
   * Register many tools at once.
   */
  registerAll(entries: Tool[]): void {
    for (const tool of entries) {
      this.register(
        {
          name: tool.name,
          description: tool.description,
          input_schema: tool.input_schema,
        },
        tool.execute
      );
    }
  }

  /**
   * Get all tool definitions (for the LLM tools param).
   */
  definitions(): ToolDefinition[] {
    return [...this.tools.values()].map((t) => t.definition);
  }

  /**
   * Get definitions filtered by tool names.
   */
  definitionsFor(names: string[]): ToolDefinition[] {
    return names
      .filter((n) => this.tools.has(n))
      .map((n) => this.tools.get(n)!.definition);
  }

  /**
   * Execute a tool by name.
   */
  async execute(name: string, input: ToolInput): Promise<ToolOutput> {
    const entry = this.tools.get(name);
    if (!entry) {
      throw new Error(`Unknown tool: ${name}`);
    }

    logger.tool(name, JSON.stringify(input).slice(0, 200));
    return entry.handler(input);
  }

  /**
   * List registered tool names.
   */
  names(): string[] {
    return [...this.tools.keys()];
  }

  /**
   * Check if a tool exists.
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Get a specific tool entry.
   */
  get(name: string): ToolEntry | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all tool entries.
   */
  getAll(): Tool[] {
    return [...this.tools.values()].map((entry) => ({
      name: entry.definition.name,
      description: entry.definition.description,
      input_schema: entry.definition.input_schema,
      execute: entry.handler,
    }));
  }
}

// Singleton
const registry = new ToolRegistry();
export default registry;
