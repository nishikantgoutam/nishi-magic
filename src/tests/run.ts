#!/usr/bin/env node
// ============================================================================
// NISHI – Test Runner (zero-dependency)
// ============================================================================

const PASS = '\x1b[32m✓\x1b[0m';
const FAIL = '\x1b[31m✗\x1b[0m';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  ${PASS} ${message}`);
    passed++;
  } else {
    console.log(`  ${FAIL} ${message}`);
    failed++;
  }
}

async function runTests(): Promise<void> {
  console.log('\n\x1b[36m🧪 NISHI Test Suite\x1b[0m\n');

  // ── Test: HTTP utility ──────────────────────────────────────────────
  console.log('\x1b[33mHTTP Utility:\x1b[0m');
  const { request, get, post } = await import('../utils/http.js');
  assert(typeof request === 'function', 'request is a function');
  assert(typeof get === 'function', 'get is a function');
  assert(typeof post === 'function', 'post is a function');

  // ── Test: Logger ────────────────────────────────────────────────────
  console.log('\x1b[33mLogger:\x1b[0m');
  const logger = (await import('../utils/logger.js')).default;
  assert(typeof logger.info === 'function', 'logger.info exists');
  assert(typeof logger.agent === 'function', 'logger.agent exists');
  assert(typeof logger.tool === 'function', 'logger.tool exists');

  // ── Test: File System ───────────────────────────────────────────────
  console.log('\x1b[33mFile System Utilities:\x1b[0m');
  const { walkDir, readFile, buildTree } = await import('../utils/fs.js');
  assert(typeof walkDir === 'function', 'walkDir is a function');
  assert(typeof readFile === 'function', 'readFile is a function');
  assert(typeof buildTree === 'function', 'buildTree is a function');

  // ── Test: Tool Registry ─────────────────────────────────────────────
  console.log('\x1b[33mTool Registry:\x1b[0m');
  const registry = (await import('../tools/registry.js')).default;

  registry.register(
    { name: 'test_tool', description: 'A test tool', input_schema: { type: 'object', properties: {} } },
    async (input: unknown) => ({ success: true, data: { echo: input } })
  );
  assert(registry.has('test_tool'), 'Can register a tool');
  assert(registry.names().includes('test_tool'), 'Tool appears in names list');

  const defs = registry.definitions();
  assert(defs.some((d) => d.name === 'test_tool'), 'Tool appears in definitions');

  const result = await registry.execute('test_tool', { hello: 'world' }) as any;
  assert(result.data?.echo?.hello === 'world', 'Tool execution works');

  // ── Test: Config ────────────────────────────────────────────────────
  console.log('\x1b[33mConfiguration:\x1b[0m');
  const config = (await import('../config.js')).default;
  assert(config.llm !== undefined, 'Config has llm section');
  assert(config.jira !== undefined, 'Config has jira section');
  assert(config.confluence !== undefined, 'Config has confluence section');
  assert(config.bitbucket !== undefined, 'Config has bitbucket section');
  assert(config.mcp !== undefined, 'Config has mcp section');
  assert(config.agent !== undefined, 'Config has agent section');

  // ── Test: Jira Tools Schema ─────────────────────────────────────────
  console.log('\x1b[33mJira Tools:\x1b[0m');
  const jiraTools = (await import('../tools/jira.js')).default;
  assert(Array.isArray(jiraTools), 'Jira tools is an array');
  assert(jiraTools.length >= 7, `Has ${jiraTools.length} Jira tools`);
  assert(
    (jiraTools as Array<{ definition?: { name: string }; handler?: unknown }>).every(
      (t) => t.definition && t.handler
    ),
    'All Jira tools have definition and handler'
  );
  assert(
    (jiraTools as Array<{ definition?: { name: string } }>).some(
      (t) => t.definition?.name === 'jira_create_issue'
    ),
    'Has jira_create_issue'
  );
  assert(
    (jiraTools as Array<{ definition?: { name: string } }>).some(
      (t) => t.definition?.name === 'jira_transition_issue'
    ),
    'Has jira_transition_issue'
  );

  // ── Test: Confluence Tools Schema ───────────────────────────────────
  console.log('\x1b[33mConfluence Tools:\x1b[0m');
  const confluenceTools = (await import('../tools/confluence.js')).default;
  assert(Array.isArray(confluenceTools), 'Confluence tools is an array');
  assert(confluenceTools.length >= 7, `Has ${confluenceTools.length} Confluence tools`);
  assert(
    (confluenceTools as Array<{ definition?: { name: string } }>).some(
      (t) => t.definition?.name === 'confluence_merge_pages'
    ),
    'Has merge_pages'
  );

  // ── Test: Bitbucket Tools Schema ────────────────────────────────────
  console.log('\x1b[33mBitbucket Tools:\x1b[0m');
  const bitbucketTools = (await import('../tools/bitbucket.js')).default;
  assert(Array.isArray(bitbucketTools), 'Bitbucket tools is an array');
  assert(bitbucketTools.length >= 9, `Has ${bitbucketTools.length} Bitbucket tools`);
  assert(
    (bitbucketTools as Array<{ definition?: { name: string } }>).some(
      (t) => t.definition?.name === 'bitbucket_get_pr_diff'
    ),
    'Has get_pr_diff'
  );

  // ── Test: Code Tools Schema ─────────────────────────────────────────
  console.log('\x1b[33mCode Tools:\x1b[0m');
  const codeTools = (await import('../tools/code.js')).default;
  assert(Array.isArray(codeTools), 'Code tools is an array');
  assert(codeTools.length >= 8, `Has ${codeTools.length} Code tools`);
  assert(
    (codeTools as Array<{ definition?: { name: string } }>).some(
      (t) => t.definition?.name === 'code_analyze_repo'
    ),
    'Has code_analyze_repo'
  );

  // ── Test: Skills Tools Schema ───────────────────────────────────────
  console.log('\x1b[33mSkills Tools:\x1b[0m');
  const skillsTools = (await import('../tools/skills.js')).default;
  assert(Array.isArray(skillsTools), 'Skills tools is an array');
  assert(skillsTools.length >= 3, `Has ${skillsTools.length} Skills tools`);

  // ── Test: Sub-Agents ────────────────────────────────────────────────
  console.log('\x1b[33mSub-Agents:\x1b[0m');
  const { SUB_AGENTS } = await import('../agents/sub-agents.js');
  assert(Object.keys(SUB_AGENTS).length >= 8, `Has ${Object.keys(SUB_AGENTS).length} sub-agents`);
  for (const [key, agent] of Object.entries(SUB_AGENTS)) {
    assert(typeof (agent as unknown as { fn: unknown }).fn === 'function', `${key} has a function`);
    assert(typeof (agent as unknown as { description: unknown }).description === 'string', `${key} has a description`);
    assert(Array.isArray((agent as unknown as { triggers: unknown }).triggers), `${key} has triggers`);
  }

  // ── Test: Orchestrator ──────────────────────────────────────────────
  console.log('\x1b[33mOrchestrator:\x1b[0m');
  const { quickRoute } = await import('../agents/orchestrator.js');
  assert((quickRoute as (msg: string) => string)('create a jira ticket') === 'jira_management', 'Routes Jira requests');
  assert((quickRoute as (msg: string) => string)('write unit tests for auth') === 'code_test', 'Routes test requests');
  assert((quickRoute as (msg: string) => string)('review the pull request') === 'code_review', 'Routes review requests');
  assert(
    (quickRoute as (msg: string) => string)('update confluence documentation') === 'document_management',
    'Routes doc requests'
  );
  assert((quickRoute as (msg: string) => string)('analyze the codebase') === 'code_analysis', 'Routes analysis requests');
  assert(
    (quickRoute as (msg: string) => string)('generate a flow diagram') === 'diagram_generation',
    'Routes diagram requests'
  );

  // ── Summary ─────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`${'─'.repeat(50)}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err: unknown) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
