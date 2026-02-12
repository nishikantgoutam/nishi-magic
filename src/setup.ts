#!/usr/bin/env node
// ============================================================================
// NISHI – Interactive Setup Script
// ============================================================================
import { createInterface } from 'node:readline';
import fs from 'node:fs';

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q: string): Promise<string> => new Promise((res) => rl.question(q, res));

async function main(): Promise<void> {
  console.log('\n\x1b[36m🔧 NISHI Setup\x1b[0m\n');
  console.log('This will create a .env file and mcp-servers.json for your project.\n');

  const env: Record<string, string> = {};

  // LLM
  console.log('\x1b[33m── LLM Configuration ──\x1b[0m');
  env.ANTHROPIC_API_KEY = await ask('Anthropic API Key: ');
  env.NISHI_LLM_MODEL = (await ask('Model [claude-sonnet-4-20250514]: ')) || 'claude-sonnet-4-20250514';

  // Jira
  console.log('\n\x1b[33m── Jira Configuration (leave blank to skip) ──\x1b[0m');
  env.JIRA_BASE_URL = await ask('Jira Base URL (e.g. https://yourorg.atlassian.net): ');
  if (env.JIRA_BASE_URL) {
    env.JIRA_EMAIL = await ask('Jira Email: ');
    env.JIRA_API_TOKEN = await ask('Jira API Token: ');
    env.JIRA_PROJECT_KEY = await ask('Default Jira Project Key: ');
  }

  // Confluence
  console.log('\n\x1b[33m── Confluence Configuration (leave blank to skip) ──\x1b[0m');
  env.CONFLUENCE_BASE_URL = await ask('Confluence Base URL (e.g. https://yourorg.atlassian.net/wiki): ');
  if (env.CONFLUENCE_BASE_URL) {
    env.CONFLUENCE_EMAIL = env.JIRA_EMAIL || await ask('Confluence Email: ');
    env.CONFLUENCE_API_TOKEN = env.JIRA_API_TOKEN || await ask('Confluence API Token: ');
    env.CONFLUENCE_SPACE_KEY = await ask('Default Confluence Space Key: ');
  }

  // Bitbucket
  console.log('\n\x1b[33m── Bitbucket Configuration (leave blank to skip) ──\x1b[0m');
  env.BITBUCKET_WORKSPACE = await ask('Bitbucket Workspace: ');
  if (env.BITBUCKET_WORKSPACE) {
    env.BITBUCKET_USERNAME = await ask('Bitbucket Username: ');
    env.BITBUCKET_APP_PASSWORD = await ask('Bitbucket App Password: ');
    env.BITBUCKET_REPO_SLUG = await ask('Default Repo Slug: ');
  }

  // Repo
  console.log('\n\x1b[33m── Repository ──\x1b[0m');
  env.NISHI_REPO_PATH = (await ask(`Local Repo Path [${process.cwd()}]: `)) || process.cwd();

  // Write .env
  const envContent = Object.entries(env)
    .filter(([_k, v]) => v)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  fs.writeFileSync('.env', envContent + '\n');
  console.log('\n✅ Created .env file');

  // MCP servers
  console.log('\n\x1b[33m── MCP Servers ──\x1b[0m');
  const addMCP = await ask('Do you want to configure MCP servers? (y/n) [n]: ');

  interface MCPServer {
    name: string;
    transport: string;
    command?: string;
    args?: string[];
    url?: string;
  }

  const mcpConfig: { mcpServers: MCPServer[] } = { mcpServers: [] };
  if (addMCP.toLowerCase() === 'y') {
    let more = true;
    while (more) {
      const name = await ask('  Server name: ');
      const transport = (await ask('  Transport (stdio/sse) [stdio]: ')) || 'stdio';

      if (transport === 'stdio') {
        const command = await ask('  Command (e.g. npx): ');
        const args = (await ask('  Args (comma-separated): ')).split(',').map((a) => a.trim()).filter(Boolean);
        mcpConfig.mcpServers.push({ name, transport, command, args });
      } else {
        const url = await ask('  Server URL: ');
        mcpConfig.mcpServers.push({ name, transport, url });
      }

      more = (await ask('  Add another server? (y/n) [n]: ')).toLowerCase() === 'y';
    }
  }

  fs.writeFileSync('mcp-servers.json', JSON.stringify(mcpConfig, null, 2) + '\n');
  console.log('✅ Created mcp-servers.json');

  // Create .nishi directory
  fs.mkdirSync('.nishi/skills/general', { recursive: true });
  fs.mkdirSync('.nishi/skills/coding-standards', { recursive: true });
  fs.mkdirSync('.nishi/skills/test-patterns', { recursive: true });
  fs.mkdirSync('.nishi/skills/review-checklists', { recursive: true });
  fs.mkdirSync('.nishi/skills/architecture', { recursive: true });
  console.log('✅ Created .nishi/skills directories');

  console.log('\n\x1b[32m🚀 Setup complete! Run "node src/index.js" to start NISHI.\x1b[0m\n');
  console.log('Tips:');
  console.log('  - Load env vars with: export $(cat .env | xargs)');
  console.log('  - Or use: node -r dotenv/config src/index.js');
  console.log('  - Or set env vars in your shell profile\n');

  rl.close();
}

main().catch(console.error);
