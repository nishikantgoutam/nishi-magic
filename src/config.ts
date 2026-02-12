// ============================================================================
// DEVWEAVER Configuration
// ============================================================================

import { loadEnvironment } from './vault.js';
import type { Config } from './types/index.js';

// Load environment variables from vault or .env
try {
  const result = await loadEnvironment({
    vaultPassword: process.env.DEVWEAVER_VAULT_PASSWORD,
    fallbackToEnv: true,
    warnOnFallback: true
  });

  if (result.source === 'vault') {
    console.log(`✓ Loaded ${result.secrets.length} secrets from vault`);
  }
} catch (error) {
  console.warn(`⚠️  Environment loading warning: ${error instanceof Error ? error.message : String(error)}`);
}

const config: Config = {
  // ── LLM Provider ──────────────────────────────────────────────────────
  llm: {
    provider: process.env.DEVWEAVER_LLM_PROVIDER || 'anthropic',
    apiKey: process.env.DEVWEAVER_LLM_API_KEY || process.env.ANTHROPIC_API_KEY || '',
    model: process.env.DEVWEAVER_LLM_MODEL || 'claude-sonnet-4-20250514',
    maxTokens: parseInt(process.env.DEVWEAVER_LLM_MAX_TOKENS || '4096', 10),
    baseUrl: process.env.DEVWEAVER_LLM_BASE_URL || 'https://api.anthropic.com',
  },

  // ── Jira ──────────────────────────────────────────────────────────────
  jira: {
    baseUrl: process.env.JIRA_BASE_URL || '',           // e.g. https://yourorg.atlassian.net
    email: process.env.JIRA_EMAIL || '',
    apiToken: process.env.JIRA_API_TOKEN || '',
    projectKey: process.env.JIRA_PROJECT_KEY || '',
  },

  // ── Confluence ────────────────────────────────────────────────────────
  confluence: {
    baseUrl: process.env.CONFLUENCE_BASE_URL || '',      // e.g. https://yourorg.atlassian.net/wiki
    email: process.env.CONFLUENCE_EMAIL || '',
    apiToken: process.env.CONFLUENCE_API_TOKEN || '',
    spaceKey: process.env.CONFLUENCE_SPACE_KEY || '',
  },

  // ── Bitbucket ─────────────────────────────────────────────────────────
  bitbucket: {
    baseUrl: process.env.BITBUCKET_BASE_URL || 'https://api.bitbucket.org/2.0',
    username: process.env.BITBUCKET_USERNAME || '',
    appPassword: process.env.BITBUCKET_APP_PASSWORD || '',
    workspace: process.env.BITBUCKET_WORKSPACE || '',
    repoSlug: process.env.BITBUCKET_REPO_SLUG || '',
  },

  // ── MCP Servers ───────────────────────────────────────────────────────
  mcp: {
    servers: [],  // populated at runtime from mcp-servers.json
  },

  // ── Local Repo ────────────────────────────────────────────────────────
  repo: {
    localPath: process.env.DEVWEAVER_REPO_PATH || process.cwd(),
  },

  // ── Skills ────────────────────────────────────────────────────────────
  skills: {
    directory: process.env.DEVWEAVER_SKILLS_DIR || '.nishi/skills',
  },

  // ── Agent ─────────────────────────────────────────────────────────────
  agent: {
    maxIterations: parseInt(process.env.DEVWEAVER_MAX_ITERATIONS || '25', 10),
    verbose: process.env.DEVWEAVER_VERBOSE === 'true',
  },
};

export default config;
