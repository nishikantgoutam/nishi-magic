// ============================================================================
// NISHI – Agent Engine (Agentic Loop)
//
// The core execution loop: sends messages to the LLM, handles tool calls,
// collects results, and iterates until the task is done.
// ============================================================================
import { callLLM, extractText, extractToolUse } from '../llm/provider.js';
import registry from '../tools/registry.js';
import config from '../config.js';
import logger from '../utils/logger.js';
import type { Message, ToolDefinition, ContentBlock, ToolInput } from '../types/index.js';

export interface RunAgentOptions {
  name: string;
  systemPrompt: string;
  userMessage: string;
  toolNames?: string[];
  maxIterations?: number;
  priorMessages?: Message[];
}

export interface ToolCall {
  name: string;
  input: unknown;
}

export interface RunAgentResult {
  result: string;
  messages: Message[];
  toolCalls: ToolCall[];
}

/**
 * Run a single agent with a system prompt, optional tool subset, and user messages.
 */
export async function runAgent(opts: RunAgentOptions): Promise<RunAgentResult> {
  const {
    name,
    systemPrompt,
    userMessage,
    toolNames,
    maxIterations = config.agent.maxIterations,
    priorMessages = [],
  } = opts;

  logger.agent(name, `Starting — "${userMessage.slice(0, 100)}..."`);

  // Build tool list
  const tools: ToolDefinition[] = toolNames
    ? registry.definitionsFor(toolNames)
    : registry.definitions();

  // Build messages
  const messages: Message[] = [
    ...priorMessages,
    { role: 'user', content: userMessage },
  ];

  const allToolCalls: ToolCall[] = [];
  let finalText = '';

  for (let i = 0; i < maxIterations; i++) {
    const response = await callLLM({
      systemPrompt,
      messages,
      tools: tools.length > 0 ? tools : undefined,
    });

    // Collect text
    const text = extractText(response);
    if (text) finalText = text;

    // Check for tool use
    const toolUseBlocks = extractToolUse(response);

    // Add assistant response to messages
    messages.push({ role: 'assistant', content: response.content });

    if (toolUseBlocks.length === 0) {
      // No tool calls — agent is done
      logger.agent(name, `Completed in ${i + 1} iterations`);
      break;
    }

    // Execute tool calls and collect results
    const toolResults: ContentBlock[] = [];
    for (const tu of toolUseBlocks) {
      logger.tool(tu.name, `Called by ${name}`);
      allToolCalls.push({ name: tu.name, input: tu.input });

      let result: unknown;
      try {
        result = await registry.execute(tu.name, tu.input as ToolInput);
      } catch (err) {
        result = { error: err instanceof Error ? err.message : String(err) };
        logger.error(`Tool ${tu.name} failed:`, err instanceof Error ? err.message : String(err));
      }

      toolResults.push({
        type: 'tool_result',
        tool_use_id: tu.id,
        content: typeof result === 'string' ? result : JSON.stringify(result),
      });
    }

    // Add tool results to messages
    messages.push({ role: 'user', content: toolResults });
  }

  return {
    result: finalText,
    messages,
    toolCalls: allToolCalls,
  };
}
