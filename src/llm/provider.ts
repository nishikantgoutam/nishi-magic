// ============================================================================
// DEVWEAVER – LLM Provider (Anthropic Claude via native HTTP)
// ============================================================================

import { request } from '../utils/http.js';
import config from '../config.js';
import logger from '../utils/logger.js';
import type {
  LLMCallOptions,
  LLMResponse,
  ContentBlock,
  ToolUseBlock
} from '../types/index.js';

/**
 * Call the Anthropic Messages API.
 */
export async function callLLM(opts: LLMCallOptions): Promise<LLMResponse> {
  const { systemPrompt, messages, tools, maxTokens } = opts;

  const body: Record<string, unknown> = {
    model: config.llm.model,
    max_tokens: maxTokens || config.llm.maxTokens,
    system: systemPrompt,
    messages,
  };

  if (tools && tools.length > 0) {
    body.tools = tools;
  }

  const headers = {
    'x-api-key': config.llm.apiKey,
    'anthropic-version': '2023-06-01',
    'Content-Type': 'application/json',
  };

  logger.debug('LLM request →', config.llm.model, `| msgs=${messages.length}`);

  const res = await request<LLMResponse>(`${config.llm.baseUrl}/v1/messages`, {
    method: 'POST',
    headers,
    body,
    timeout: 120_000,
  });

  if (res.status !== 200) {
    logger.error('LLM error', res.status, JSON.stringify(res.data).slice(0, 500));
    throw new Error(`LLM API error ${res.status}: ${JSON.stringify(res.data)}`);
  }

  return res.data;
}

/**
 * Extract text content from an LLM response.
 */
export function extractText(response: LLMResponse): string {
  if (!response?.content) return '';
  return response.content
    .filter((b): b is ContentBlock & { type: 'text'; text: string } => b.type === 'text' && 'text' in b)
    .map((b) => b.text)
    .join('\n');
}

/**
 * Extract tool-use blocks from an LLM response.
 */
export function extractToolUse(response: LLMResponse): ToolUseBlock[] {
  if (!response?.content) return [];
  return response.content.filter(
    (b): b is ToolUseBlock => b.type === 'tool_use' && typeof b.name === 'string' && 'input' in b
  );
}
