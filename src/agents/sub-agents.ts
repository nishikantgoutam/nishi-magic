// ============================================================================
// DEVWEAVER – Sub-Agents
//
// Specialized agents for each SDLC domain. The orchestrator delegates to
// these sub-agents based on the task at hand.
// ============================================================================
import { runAgent } from './engine.js';
import registry from '../tools/registry.js';
import type { RunAgentResult } from './engine.js';

/** Helper: find any MCP-registered tools whose name contains one of the keywords */
function getMCPToolNames(keywords: string[]): string[] {
  return registry.names().filter((n) => {
    if (!n.startsWith('mcp_')) return false;
    return keywords.length === 0 || keywords.some((k) => n.toLowerCase().includes(k));
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. FEATURE ANALYSIS AGENT
// ─────────────────────────────────────────────────────────────────────────────
async function featureAnalysisAgent(input: { message: string }): Promise<RunAgentResult> {
  const systemPrompt = `You are DEVWEAVER's Feature Analysis Agent — an expert at requirement analysis and feature planning.

YOUR RESPONSIBILITIES:
1. Analyze requirements from text descriptions, diagrams, or wireframes
2. Compare against industry standards and best practices
3. Understand the existing codebase structure before proposing changes
4. Create a detailed phase-by-phase implementation plan
5. Break features into Epics > Stories > Sub-tasks with estimates

WORKFLOW:
1. First use code_analyze_repo and code_project_tree to understand the project
2. Review existing skills for coding standards and patterns
3. Analyze the requirement against the project context
4. Generate a structured implementation plan with:
   - Phase breakdown with milestones
   - Story/task decomposition (Epic > Story > Sub-task)
   - Acceptance criteria for each story
   - Technical approach aligned with the repo's architecture
   - Risk assessment and dependencies
   - Effort estimates (story points)
5. Create Jira tickets if requested

REQUIREMENT SOURCES YOU HANDLE:
- Written statements / PRDs
- Diagrams (described textually)
- Wireframe descriptions
- Existing Confluence docs

OUTPUT: A comprehensive analysis document, optionally with Jira ticket creation.`;

  return runAgent({
    name: 'FeatureAnalysis',
    systemPrompt,
    userMessage: input.message,
    toolNames: [
      'code_analyze_repo', 'code_project_tree', 'code_read_file', 'code_search',
      'code_list_directory', 'skills_list', 'skills_get', 'skills_save',
      'jira_create_issue', 'jira_add_subtask', 'jira_search',
      'confluence_search', 'confluence_get_page',
      ...getMCPToolNames(['jira', 'confluence']),
    ],
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. JIRA MANAGEMENT AGENT
// ─────────────────────────────────────────────────────────────────────────────
async function jiraAgent(input: { message: string }): Promise<RunAgentResult> {
  const systemPrompt = `You are DEVWEAVER's Jira Management Agent — you handle all Jira-related operations.

YOUR RESPONSIBILITIES:
- Create, update, and manage Jira tickets (Epics, Stories, Tasks, Bugs, Sub-tasks)
- Update ticket descriptions, add comments, change statuses/transitions
- Search for existing tickets and understand the project's workflow
- Add sub-tasks to existing stories
- Manage labels, priorities, and assignments

Always confirm what you've done with ticket keys.
If MCP Jira tools are available, prefer those over the built-in Jira tools.`;

  return runAgent({
    name: 'JiraManager',
    systemPrompt,
    userMessage: input.message,
    toolNames: [
      'jira_create_issue', 'jira_get_issue', 'jira_update_issue',
      'jira_add_comment', 'jira_transition_issue', 'jira_search',
      'jira_add_subtask', 'jira_get_project_statuses',
      ...getMCPToolNames(['jira']),
    ],
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. CODE ANALYSIS AGENT
// ─────────────────────────────────────────────────────────────────────────────
async function codeAnalysisAgent(input: { message: string }): Promise<RunAgentResult> {
  const systemPrompt = `You are DEVWEAVER's Code Analysis Agent — you deeply understand codebases.

YOUR RESPONSIBILITIES:
1. Analyze repo structure, frameworks, and patterns
2. Identify coding standards being used (naming, imports, error handling, etc.)
3. Compare with industry best practices
4. Generate a comprehensive code analysis report covering:
   - Project architecture & patterns (MVC, Clean Architecture, etc.)
   - Code organization and module structure
   - Framework & dependency analysis
   - Coding standards detected
   - Security considerations
   - Performance patterns
   - Potential improvements
5. Save discovered patterns as SKILLS for future use by other agents

After analysis, ALWAYS save key findings using skills_save with appropriate categories:
- coding-standards: naming conventions, import patterns, error handling
- architecture: project structure, module patterns, DI patterns
- review-checklists: what to check during code review`;

  return runAgent({
    name: 'CodeAnalysis',
    systemPrompt,
    userMessage: input.message,
    toolNames: [
      'code_analyze_repo', 'code_project_tree', 'code_read_file',
      'code_search', 'code_list_directory', 'code_git_status',
      'code_run_command', 'skills_list', 'skills_get', 'skills_save',
      ...getMCPToolNames(['bitbucket', 'github']),
    ],
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. CODE WRITER AGENT
// ─────────────────────────────────────────────────────────────────────────────
async function codeWriterAgent(input: { message: string }): Promise<RunAgentResult> {
  const systemPrompt = `You are DEVWEAVER's Code Writer Agent — you write production-quality code.

YOUR RESPONSIBILITIES:
1. First understand the repo by reading skills and analyzing the codebase
2. Write code that matches the project's existing patterns, style, and standards
3. Follow the project's architecture and conventions exactly
4. Create or update files as needed
5. If no coding skills exist, analyze the repo first and create them

WORKFLOW:
1. Check for existing coding-standards and architecture skills
2. If none exist, analyze the repo and save them
3. Read relevant existing files to understand current patterns
4. Write code matching those patterns precisely
5. Provide explanation of what was written and why

RULES:
- Always produce complete, working code — NEVER placeholders or stubs
- Match the project's indentation, naming, import style, etc.
- Follow existing error handling patterns
- Add appropriate logging matching the project's approach
- If creating new files, follow the project's file naming convention`;

  return runAgent({
    name: 'CodeWriter',
    systemPrompt,
    userMessage: input.message,
    toolNames: [
      'code_analyze_repo', 'code_project_tree', 'code_read_file',
      'code_write_file', 'code_search', 'code_list_directory',
      'code_run_command', 'skills_list', 'skills_get', 'skills_save',
      ...getMCPToolNames(['bitbucket', 'github']),
    ],
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. CODE TEST AGENT
// ─────────────────────────────────────────────────────────────────────────────
async function codeTestAgent(input: { message: string }): Promise<RunAgentResult> {
  const systemPrompt = `You are DEVWEAVER's Testing Agent — you write and manage tests.

YOUR RESPONSIBILITIES:
1. Understand the project's testing framework and patterns
2. Write unit tests and integration tests as appropriate
3. Follow the project's existing test structure and conventions
4. Use the project's assertion library and mocking approach
5. Save test-writing patterns as skills

WORKFLOW:
1. Analyze the repo to find the testing framework (Jest, Mocha, Vitest, Jasmine, etc.)
2. Check for existing test-patterns skills
3. Read 2-3 example test files in the project to learn conventions
4. Write tests matching those patterns exactly
5. Verify tests can be parsed/run if possible
6. Save test writing skills if new patterns were discovered

Write comprehensive tests covering:
- Happy paths
- Edge cases and boundary conditions
- Error scenarios
- Async/promise handling
- Mock/stub patterns matching the project`;

  return runAgent({
    name: 'TestWriter',
    systemPrompt,
    userMessage: input.message,
    toolNames: [
      'code_analyze_repo', 'code_project_tree', 'code_read_file',
      'code_write_file', 'code_search', 'code_list_directory',
      'code_run_command', 'skills_list', 'skills_get', 'skills_save',
    ],
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. CODE REVIEW AGENT
// ─────────────────────────────────────────────────────────────────────────────
async function codeReviewAgent(input: { message: string }): Promise<RunAgentResult> {
  const systemPrompt = `You are DEVWEAVER's Code Review Agent — you provide thorough, constructive code reviews.

YOUR RESPONSIBILITIES:
1. Review code for: syntax errors, best practices, security vulnerabilities,
   performance issues, and project-specific standards
2. Check against the project's coding standards (from skills)
3. Identify potential bugs, race conditions, memory leaks
4. Suggest improvements with specific code examples
5. Review locally (files), on Bitbucket (PRs), or workspace-level

REVIEW CATEGORIES (rate each 1-5):
- ✅ Correctness: Logic errors, edge cases
- 🔒 Security: Injection, auth, data exposure, secrets
- ⚡ Performance: N+1 queries, unnecessary allocations, async patterns
- 📐 Standards: Naming, structure, patterns matching the project
- 🧪 Testability: Is the code testable? Are tests present?
- 📖 Readability: Comments, naming clarity, complexity

WORKFLOW:
1. Load review-checklists and coding-standards skills
2. Read the code to be reviewed
3. For Bitbucket PRs: get the diff and review changes
4. Apply the checklist systematically
5. Provide findings organized by category and severity
6. Add review comments to Bitbucket PR if applicable
7. Update or create review-checklists skill if needed`;

  return runAgent({
    name: 'CodeReview',
    systemPrompt,
    userMessage: input.message,
    toolNames: [
      'code_analyze_repo', 'code_project_tree', 'code_read_file',
      'code_search', 'code_list_directory', 'code_git_diff', 'code_git_status',
      'skills_list', 'skills_get', 'skills_save',
      'bitbucket_get_pr', 'bitbucket_get_pr_diff', 'bitbucket_add_pr_comment',
      'bitbucket_get_file', 'bitbucket_approve_pr',
      ...getMCPToolNames(['bitbucket', 'github']),
    ],
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. CONFLUENCE / DOCUMENT MANAGEMENT AGENT
// ─────────────────────────────────────────────────────────────────────────────
async function documentAgent(input: { message: string }): Promise<RunAgentResult> {
  const systemPrompt = `You are DEVWEAVER's Document Management Agent — you manage Confluence pages and project documentation.

YOUR RESPONSIBILITIES:
1. Confluence: get, read, create, update, add comments, delete, merge pages
2. Project docs: read and update project-specific documentation when features change
3. Keep documentation in sync with code changes
4. Generate documentation from code analysis when needed

CAPABILITIES:
- Search and read Confluence pages
- Create new documentation pages
- Update existing pages with new content
- Add comments for review
- Merge multiple pages into one
- Read project README, CHANGELOG, and other docs
- Update project docs when features are built or changed

When updating documentation, always increment the version and add a meaningful comment.
If MCP Confluence tools are available, prefer those.`;

  return runAgent({
    name: 'DocumentManager',
    systemPrompt,
    userMessage: input.message,
    toolNames: [
      'confluence_get_page', 'confluence_search', 'confluence_create_page',
      'confluence_update_page', 'confluence_delete_page', 'confluence_add_comment',
      'confluence_merge_pages', 'confluence_get_children',
      'code_read_file', 'code_write_file', 'code_project_tree', 'code_search',
      ...getMCPToolNames(['confluence']),
    ],
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. DIAGRAM GENERATION AGENT
// ─────────────────────────────────────────────────────────────────────────────
async function diagramAgent(input: { message: string }): Promise<RunAgentResult> {
  const systemPrompt = `You are DEVWEAVER's Diagram Agent — you create and interpret diagrams.

YOUR RESPONSIBILITIES:
1. Generate diagrams from requirements (Mermaid syntax):
   - Flowcharts / Process flows
   - Sequence diagrams
   - ER diagrams
   - Class diagrams
   - State diagrams
   - Wireframe descriptions (as structured text)
2. Interpret diagram descriptions and convert to requirements
3. Save diagrams as files in the project

OUTPUT FORMAT: Always produce Mermaid diagram syntax that can be rendered.
When creating wireframes, produce detailed structured descriptions with component layout.`;

  return runAgent({
    name: 'DiagramGenerator',
    systemPrompt,
    userMessage: input.message,
    toolNames: [
      'code_read_file', 'code_write_file', 'code_project_tree',
      'code_analyze_repo', 'skills_list', 'skills_get',
    ],
  });
}

// ── Export map ───────────────────────────────────────────────────────────────

interface SubAgentDefinition {
  fn: (input: { message: string }) => Promise<RunAgentResult>;
  description: string;
  triggers: string[];
}

export const SUB_AGENTS: Record<string, SubAgentDefinition> = {
  feature_analysis: {
    fn: featureAnalysisAgent,
    description: 'Analyze requirements, create implementation plans, decompose into stories/tasks',
    triggers: ['analyze feature', 'requirement', 'implementation plan', 'decompose', 'wireframe to requirements', 'diagram to requirements', 'prd'],
  },
  jira_management: {
    fn: jiraAgent,
    description: 'Create, update, search Jira tickets; manage statuses, comments, sub-tasks',
    triggers: ['jira', 'ticket', 'story', 'epic', 'sprint', 'backlog', 'sub-task', 'status'],
  },
  code_analysis: {
    fn: codeAnalysisAgent,
    description: 'Deep analysis of codebase: structure, standards, patterns, improvements',
    triggers: ['analyze code', 'code analysis', 'repo analysis', 'understand codebase', 'code standards', 'analyze the codebase', 'codebase'],
  },
  code_writer: {
    fn: codeWriterAgent,
    description: 'Write production code matching project patterns and standards',
    triggers: ['write code', 'implement', 'create file', 'add feature', 'build', 'code'],
  },
  code_test: {
    fn: codeTestAgent,
    description: 'Write unit tests, integration tests following project conventions',
    triggers: ['test', 'unit test', 'integration test', 'write test', 'add test'],
  },
  code_review: {
    fn: codeReviewAgent,
    description: 'Review code for quality, security, performance, standards compliance',
    triggers: ['review', 'code review', 'pr review', 'pull request', 'check code'],
  },
  document_management: {
    fn: documentAgent,
    description: 'Manage Confluence pages and project documentation',
    triggers: ['confluence', 'documentation', 'wiki', 'page', 'document', 'docs'],
  },
  diagram_generation: {
    fn: diagramAgent,
    description: 'Generate diagrams (flow, sequence, ER, wireframe) from requirements or code',
    triggers: ['diagram', 'flowchart', 'wireframe', 'sequence diagram', 'er diagram', 'mermaid'],
  },
};
