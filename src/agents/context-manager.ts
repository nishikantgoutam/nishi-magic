// ============================================================================
// NISHI – Context Manager
//
// Manages fresh executor contexts to prevent context rot.
// Spawns specialized agents with clean 200k token contexts.
// ============================================================================

import { runAgent, type RunAgentOptions, type RunAgentResult } from './engine.js';
import logger from '../utils/logger.js';
import type { Message } from '../types/index.js';

export interface ContextOptions {
  /**
   * Maximum iterations for this context
   */
  maxIterations?: number;

  /**
   * Tool names to make available in this context
   */
  toolNames?: string[];

  /**
   * Whether to include full conversation history
   */
  includePriorMessages?: boolean;

  /**
   * Prior messages to include (if includePriorMessages is true)
   */
  priorMessages?: Message[];
}

/**
 * Execute a task in a fresh context to prevent context rot
 */
export async function executeFreshContext(
  agentName: string,
  systemPrompt: string,
  userMessage: string,
  options: ContextOptions = {}
): Promise<RunAgentResult> {
  const {
    maxIterations = 20,
    toolNames,
    includePriorMessages = false,
    priorMessages = [],
  } = options;

  logger.info(`Spawning fresh context for ${agentName}...`);

  const agentOptions: RunAgentOptions = {
    name: agentName,
    systemPrompt,
    userMessage,
    toolNames,
    maxIterations,
    priorMessages: includePriorMessages ? priorMessages : [],
  };

  try {
    const result = await runAgent(agentOptions);
    logger.success(`Fresh context completed: ${agentName}`);
    return result;
  } catch (error) {
    logger.error(`Fresh context failed: ${agentName}`, error instanceof Error ? error.message : String(error));
    throw error;
  }
}

/**
 * Execute multiple tasks in parallel fresh contexts
 */
export async function executeParallelContexts(
  tasks: Array<{
    agentName: string;
    systemPrompt: string;
    userMessage: string;
    options?: ContextOptions;
  }>
): Promise<RunAgentResult[]> {
  logger.info(`Spawning ${tasks.length} parallel fresh contexts...`);

  const promises = tasks.map(task =>
    executeFreshContext(
      task.agentName,
      task.systemPrompt,
      task.userMessage,
      task.options || {}
    )
  );

  try {
    const results = await Promise.all(promises);
    logger.success(`All ${tasks.length} parallel contexts completed`);
    return results;
  } catch (error) {
    logger.error('Parallel context execution failed', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

/**
 * Load researcher agent prompt
 */
function getResearcherPrompt(): string {
  return `# NISHI Research Agent

You are a focused research agent for the NISHI system.

## Your Mission
Gather comprehensive information to support planning decisions.

## Research Areas
1. **Codebase Analysis**
   - Understand existing patterns
   - Identify dependencies
   - Map architecture

2. **Technical Research**
   - Find best practices
   - Identify potential libraries/tools
   - Research similar implementations

3. **Requirements Clarification**
   - Understand user needs
   - Identify edge cases
   - Clarify constraints

## Output Format
Provide structured research findings:
- **Summary**: Key findings in 2-3 sentences
- **Details**: Organized findings by category
- **Recommendations**: What approach to take
- **Risks**: Potential issues or concerns

Focus on quality over quantity.`;
}

/**
 * Load executor agent prompt
 */
function getExecutorPrompt(): string {
  return `# NISHI Execution Agent

You are a focused execution agent for the NISHI system.

## Execution Protocol

### 1. Read & Understand
- Load the task from PLAN.md
- Understand acceptance criteria
- Identify verification steps

### 2. Execute
- Follow the task steps precisely
- Maintain code quality
- Follow existing patterns
- Keep changes focused

### 3. Verify
- Run all verification steps
- Check acceptance criteria
- Test edge cases
- Ensure nothing broke

### 4. Commit (if verification passes)
git add <changed-files>
git commit -m "feat(phase-N): <task-name>

<brief-description>

Verification:
- <verification-step>: ✓ passed

Closes: task-N-M"

### 5. Update State
Update .planning/STATE.md with task completion.

## Critical Rules
- ✅ DO commit after successful verification
- ✅ DO follow existing code patterns
- ✅ DO test your changes
- ❌ DON'T commit failing code
- ❌ DON'T skip verification

You are running in a fresh context. Everything you need is in:
- .planning/PROJECT.md - Project vision
- .planning/REQUIREMENTS.md - Requirements
- .planning/phase-N/PLAN.md - Your task
- .planning/STATE.md - Current state`;
}

/**
 * Load verifier agent prompt
 */
function getVerifierPrompt(): string {
  return `# NISHI Verification Agent

You are a thorough verification agent for the NISHI system.

## Verification Protocol

### 1. Load Acceptance Criteria
- Read task acceptance criteria from PLAN.md
- Understand expected outcomes

### 2. Execute Verification
For each verification step:
- Run the verification
- Record actual results
- Compare to expected results

### 3. Test Edge Cases
- Invalid inputs
- Boundary conditions
- Error scenarios

### 4. Report Results
Provide clear PASS/FAIL verdict with evidence.

## Critical Rules
- Be thorough but practical
- Actually run the verification steps
- Don't assume it works - verify it
- Provide specific feedback`;
}

/**
 * Spawn research agent in fresh context
 */
export async function spawnResearcher(
  researchGoals: string,
  toolNames?: string[]
): Promise<RunAgentResult> {
  return executeFreshContext(
    'researcher',
    getResearcherPrompt(),
    researchGoals,
    { toolNames: toolNames || ['code_*', 'bitbucket_*'] }
  );
}

/**
 * Spawn executor agent in fresh context
 */
export async function spawnExecutor(
  taskDescription: string,
  phaseNumber: number,
  taskId: number
): Promise<RunAgentResult> {
  return executeFreshContext(
    `executor-phase${phaseNumber}-task${taskId}`,
    getExecutorPrompt(),
    taskDescription,
    {
      toolNames: [
        'code_*',
        'bitbucket_*',
        'jira_*',
        'confluence_*',
      ],
      maxIterations: 30,
    }
  );
}

/**
 * Spawn verifier agent in fresh context
 */
export async function spawnVerifier(
  taskDescription: string,
  phaseNumber: number,
  taskId: number
): Promise<RunAgentResult> {
  return executeFreshContext(
    `verifier-phase${phaseNumber}-task${taskId}`,
    getVerifierPrompt(),
    `Verify task completion: ${taskDescription}`,
    {
      toolNames: ['code_*'],
      maxIterations: 10,
    }
  );
}

/**
 * Spawn parallel executors for independent tasks
 */
export async function spawnParallelExecutors(
  tasks: Array<{
    description: string;
    phaseNumber: number;
    taskId: number;
  }>
): Promise<RunAgentResult[]> {
  logger.info(`Executing ${tasks.length} tasks in parallel with fresh contexts`);

  return executeParallelContexts(
    tasks.map(task => ({
      agentName: `executor-phase${task.phaseNumber}-task${task.taskId}`,
      systemPrompt: getExecutorPrompt(),
      userMessage: task.description,
      options: {
        toolNames: [
          'code_*',
          'bitbucket_*',
          'jira_*',
          'confluence_*',
        ],
        maxIterations: 30,
      },
    }))
  );
}
