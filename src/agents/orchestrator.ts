// ============================================================================
// DEVWEAVER – Orchestrator Agent
//
// The master agent that understands user intent and delegates to the
// appropriate sub-agent(s). Can chain multiple sub-agents for complex tasks.
// ============================================================================
import { callLLM, extractText, extractToolUse } from '../llm/provider.js';
import { SUB_AGENTS } from './sub-agents.js';
import logger from '../utils/logger.js';
import type { Message, ContentBlock, ToolDefinition } from '../types/index.js';

const ORCHESTRATOR_SYSTEM_PROMPT = `You are DEVWEAVER — the Next-level Intelligent System for Holistic Integration.
You are the orchestrator of a powerful SDLC agent system. Your job is to understand what the user needs
and delegate to the right sub-agent(s) to accomplish it.

AVAILABLE SUB-AGENTS (use the delegate_to_agent tool):
${Object.entries(SUB_AGENTS).map(([key, val]) => `- ${key}: ${val.description}`).join('\n')}

ROUTING RULES:
1. Analyze the user's request to determine which sub-agent(s) are needed
2. For simple tasks: delegate to a single sub-agent
3. For complex tasks: chain multiple sub-agents sequentially
4. Always explain your plan before delegating
5. After delegation, summarize the results clearly

COMPLEX TASK EXAMPLES:
- "Build feature X" → feature_analysis → code_writer → code_test → document_management
- "Review PR #5 and update Jira" → code_review → jira_management
- "Analyze the codebase and create coding standards doc" → code_analysis → document_management

You can also answer general SDLC questions directly without delegating.

IMPORTANT: If the user's intent maps to multiple sub-agents, call them one at a time in logical order,
passing context from each result to the next.`;

/**
 * Build the orchestrator's special tool for delegating to sub-agents.
 */
function buildDelegationTool(): ToolDefinition {
  return {
    name: 'delegate_to_agent',
    description: `Delegate a task to a specialized sub-agent. Available agents: ${Object.keys(SUB_AGENTS).join(', ')}`,
    input_schema: {
      type: 'object',
      properties: {
        agent: {
          type: 'string',
          enum: Object.keys(SUB_AGENTS),
          description: 'Which sub-agent to delegate to',
        },
        message: {
          type: 'string',
          description: 'The task/message to send to the sub-agent. Include all relevant context.',
        },
      },
      required: ['agent', 'message'],
    },
  };
}

interface OrchestrateResult {
  result: string;
  delegations: Array<{ agent: string; result: string }>;
  conversationHistory: Message[];
}

/**
 * Run the orchestrator for a user message.
 */
export async function orchestrate(userMessage: string, conversationHistory: Message[] = []): Promise<OrchestrateResult> {
  logger.agent('Orchestrator', `Received: "${userMessage.slice(0, 120)}..."`);

  const delegationTool = buildDelegationTool();
  const messages: Message[] = [
    ...conversationHistory,
    { role: 'user', content: userMessage },
  ];

  let finalResult = '';
  const allDelegations: Array<{ agent: string; result: string }> = [];
  const maxOrchestratorLoops = 10;

  for (let i = 0; i < maxOrchestratorLoops; i++) {
    const response = await callLLM({
      systemPrompt: ORCHESTRATOR_SYSTEM_PROMPT,
      messages,
      tools: [delegationTool],
    });

    const text = extractText(response);
    if (text) finalResult = text;

    const toolUseBlocks = extractToolUse(response);
    messages.push({ role: 'assistant', content: response.content });

    if (toolUseBlocks.length === 0) {
      // Orchestrator is done
      break;
    }

    // Process delegations
    const toolResults: ContentBlock[] = [];
    for (const tu of toolUseBlocks) {
      if (tu.name === 'delegate_to_agent') {
        const input = tu.input as { agent: string; message: string };
        const agentName = input.agent;
        const message = input.message;
        logger.agent('Orchestrator', `Delegating to → ${agentName}`);

        const subAgent = SUB_AGENTS[agentName as keyof typeof SUB_AGENTS];
        if (!subAgent) {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: tu.id,
            content: `Error: Unknown agent "${agentName}"`,
          });
          continue;
        }

        try {
          const result = await subAgent.fn({ message });
          allDelegations.push({ agent: agentName, result: result.result });
          toolResults.push({
            type: 'tool_result',
            tool_use_id: tu.id,
            content: result.result || 'Sub-agent completed but returned no text.',
          });
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          logger.error(`Sub-agent ${agentName} failed:`, errorMsg);
          toolResults.push({
            type: 'tool_result',
            tool_use_id: tu.id,
            content: `Error from ${agentName}: ${errorMsg}`,
          });
        }
      }
    }

    messages.push({ role: 'user', content: toolResults });
  }

  return {
    result: finalResult,
    delegations: allDelegations,
    conversationHistory: messages,
  };
}

/**
 * Quick-route: attempt to match a user message to a sub-agent without LLM call.
 * Returns the agent key or null.
 */
export function quickRoute(userMessage: string): keyof typeof SUB_AGENTS | null {
  const lower = userMessage.toLowerCase();
  let bestMatch: keyof typeof SUB_AGENTS | null = null;
  let bestScore = 0;

  for (const [key, agent] of Object.entries(SUB_AGENTS)) {
    let score = 0;
    for (const trigger of agent.triggers) {
      if (lower.includes(trigger)) {
        score += trigger.split(' ').length; // Longer triggers = more specific match
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = key as keyof typeof SUB_AGENTS;
    }
  }

  return bestScore > 0 ? bestMatch : null;
}
