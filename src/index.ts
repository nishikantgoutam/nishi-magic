#!/usr/bin/env node
// ============================================================================
// DEVWEAVER – Next-level Intelligent System for Holistic Integration
//
// Main entry point: initializes tools, MCP servers, and starts the
// interactive CLI or processes a single command.
// ============================================================================
import readline from 'node:readline';
import path from 'node:path';
import config from './config.js';
import logger from './utils/logger.js';
import registry from './tools/registry.js';
import mcpManager from './tools/mcp.js';
import jiraTools from './tools/jira.js';
import confluenceTools from './tools/confluence.js';
import bitbucketTools from './tools/bitbucket.js';
import codeTools from './tools/code.js';
import skillsTools from './tools/skills.js';
import { orchestrate } from './agents/orchestrator.js';
import { SUB_AGENTS } from './agents/sub-agents.js';
import type { Message } from './types/index.js';

// ── Banner ──────────────────────────────────────────────────────────────────

function printBanner(): void {
  console.log(`
\x1b[36m╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   ███╗   ██╗██╗███████╗██╗  ██╗██╗                          ║
║   ████╗  ██║██║██╔════╝██║  ██║██║                          ║
║   ██╔██╗ ██║██║███████╗███████║██║                          ║
║   ██║╚██╗██║██║╚════██║██╔══██║██║                          ║
║   ██║ ╚████║██║███████║██║  ██║██║                          ║
║   ╚═╝  ╚═══╝╚═╝╚══════╝╚═╝  ╚═╝╚═╝                          ║
║                                                              ║
║   Next-level Intelligent System for Holistic Integration     ║
║   SDLC Agent v1.0.0                                         ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝\x1b[0m
`);
}

// ── Initialization ──────────────────────────────────────────────────────────

async function initialize(): Promise<boolean> {
  printBanner();

  // 1. Register built-in tools
  logger.info('Registering built-in tools...');
  registry.registerAll(jiraTools);
  registry.registerAll(confluenceTools);
  registry.registerAll(bitbucketTools);
  registry.registerAll(codeTools);
  registry.registerAll(skillsTools);
  logger.success(`Registered ${registry.names().length} built-in tools`);

  // 2. Load and connect MCP servers
  const mcpConfigPath = path.join(config.repo.localPath, 'mcp-servers.json');
  const mcpConfigs = mcpManager.loadConfig(mcpConfigPath);
  if (mcpConfigs.length > 0) {
    logger.info(`Found ${mcpConfigs.length} MCP server(s) — connecting...`);
    const mcpToolCount = await mcpManager.connectAll(mcpConfigs);
    logger.success(`MCP: ${mcpToolCount} additional tools registered`);
  } else {
    logger.info('No MCP servers configured (create mcp-servers.json to add)');
  }

  // 3. Show summary
  logger.info(`Total tools available: ${registry.names().length}`);
  logger.info(`Repo path: ${config.repo.localPath}`);

  // Validate LLM config
  if (!config.llm.apiKey) {
    logger.warn('No LLM API key configured! Set ANTHROPIC_API_KEY or DEVWEAVER_LLM_API_KEY');
  }

  return true;
}

// ── Command Processing ──────────────────────────────────────────────────────

type BuiltinCommandFn = () => Promise<void> | void;
type BuiltinCommands = Record<string, BuiltinCommandFn>;

const BUILTIN_COMMANDS: BuiltinCommands = {
  '/help': () => {
    console.log(`
\x1b[33mDEVWEAVER Commands:\x1b[0m
  /help                  Show this help
  /tools                 List all registered tools
  /agents                List available sub-agents
  /skills                List saved skills
  /status                Show system status
  /direct <agent> <msg>  Bypass orchestrator, call agent directly
  /quit                  Exit DEVWEAVER

\x1b[33mExamples:\x1b[0m
  Analyze the codebase and create coding standards
  Create a Jira epic for user authentication feature
  Review the code in src/controllers/auth.js
  Write unit tests for the payment module
  Search Confluence for API documentation
  Generate a flow diagram for the checkout process
`);
  },

  '/tools': () => {
    const names = registry.names();
    const grouped: Record<string, string[]> = {};
    for (const n of names) {
      const prefix = n.split('_')[0] || 'other';
      if (!grouped[prefix]) grouped[prefix] = [];
      grouped[prefix]!.push(n);
    }
    console.log(`\n\x1b[33mRegistered Tools (${names.length}):\x1b[0m`);
    for (const [group, tools] of Object.entries(grouped)) {
      console.log(`  \x1b[36m${group}\x1b[0m: ${tools.join(', ')}`);
    }
    console.log();
  },

  '/agents': () => {
    console.log(`\n\x1b[33mAvailable Sub-Agents:\x1b[0m`);
    for (const [key, agent] of Object.entries(SUB_AGENTS)) {
      console.log(`  \x1b[36m${key}\x1b[0m: ${agent.description}`);
      console.log(`    Triggers: ${agent.triggers.join(', ')}`);
    }
    console.log();
  },

  '/status': () => {
    console.log(`\n\x1b[33mDEVWEAVER Status:\x1b[0m`);
    console.log(`  LLM Provider: ${config.llm.provider} (${config.llm.model})`);
    console.log(`  LLM API Key:  ${config.llm.apiKey ? '✅ configured' : '❌ missing'}`);
    console.log(`  Jira:         ${config.jira.baseUrl ? '✅ ' + config.jira.baseUrl : '❌ not configured'}`);
    console.log(`  Confluence:   ${config.confluence.baseUrl ? '✅ ' + config.confluence.baseUrl : '❌ not configured'}`);
    console.log(`  Bitbucket:    ${config.bitbucket.workspace ? '✅ ' + config.bitbucket.workspace : '❌ not configured'}`);
    console.log(`  MCP Servers:  ${mcpManager.clients.size}`);
    console.log(`  Total Tools:  ${registry.names().length}`);
    console.log(`  Repo Path:    ${config.repo.localPath}`);
    console.log();
  },
};

async function processInput(
  input: string,
  conversationHistory: Message[]
): Promise<Message[] | null> {
  const trimmed = input.trim();
  if (!trimmed) return conversationHistory;

  // Check built-in commands
  if (trimmed.startsWith('/')) {
    const parts = trimmed.split(' ');
    const cmd = parts[0]!.toLowerCase();

    if (cmd === '/quit' || cmd === '/exit') {
      return null; // Signal to exit
    }

    if (cmd === '/skills') {
      const skillsList = await registry.execute('skills_list', {}) as any;
      if (skillsList?.skills?.length) {
        console.log(`\n\x1b[33mSaved Skills:\x1b[0m`);
        for (const s of skillsList.skills) {
          console.log(`  - ${s.file}: ${s.title}`);
        }
      } else {
        console.log('\n  No skills saved yet. DEVWEAVER will create them as it learns your codebase.\n');
      }
      return conversationHistory;
    }

    if (cmd === '/direct' && parts.length >= 3) {
      const agentKey = parts[1];
      const message = parts.slice(2).join(' ');
      const subAgent = SUB_AGENTS[agentKey as keyof typeof SUB_AGENTS];
      if (!subAgent) {
        console.log(`Unknown agent: ${agentKey}. Use /agents to see available agents.`);
        return conversationHistory;
      }
      try {
        const result = await subAgent.fn({ message });
        console.log(`\n\x1b[32m${result.result}\x1b[0m\n`);
      } catch (err) {
        logger.error((err as Error).message);
      }
      return conversationHistory;
    }

    if (BUILTIN_COMMANDS[cmd]) {
      await BUILTIN_COMMANDS[cmd]();
      return conversationHistory;
    }

    console.log(`Unknown command: ${cmd}. Type /help for available commands.`);
    return conversationHistory;
  }

  // Process through orchestrator
  try {
    const result = await orchestrate(trimmed, conversationHistory);
    console.log(`\n\x1b[32m${result.result}\x1b[0m\n`);

    if (result.delegations.length > 0) {
      console.log(`\x1b[2m(Delegated to: ${result.delegations.map((d: { agent: string }) => d.agent).join(' → ')})\x1b[0m\n`);
    }

    return result.conversationHistory;
  } catch (err) {
    logger.error('Error:', err instanceof Error ? err.message : String(err));
    return conversationHistory;
  }
}

// ── Interactive CLI ─────────────────────────────────────────────────────────

async function startCLI(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '\x1b[36mnishi>\x1b[0m ',
  });

  let conversationHistory: Message[] = [];

  console.log('Type /help for commands, or describe what you need.\n');
  rl.prompt();

  rl.on('line', async (line: string) => {
    try {
      const result = await processInput(line, conversationHistory);
      if (result === null) {
        console.log('\nGoodbye! 👋\n');
        mcpManager.disconnectAll();
        rl.close();
        process.exit(0);
      }
      conversationHistory = result;
    } catch (err) {
      logger.error('Unexpected error:', err instanceof Error ? err.message : String(err));
    }
    rl.prompt();
  });

  rl.on('close', () => {
    mcpManager.disconnectAll();
    process.exit(0);
  });
}

// ── Single Command Mode ─────────────────────────────────────────────────────

async function runSingleCommand(command: string): Promise<void> {
  try {
    const result = await orchestrate(command);
    console.log(result.result);
    mcpManager.disconnectAll();
    process.exit(0);
  } catch (err) {
    logger.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  try {
    await initialize();

    const args = process.argv.slice(2);
    if (args.length > 0 && !args[0]!.startsWith('-')) {
      // Single command mode
      await runSingleCommand(args.join(' '));
    } else {
      // Interactive mode
      await startCLI();
    }
  } catch (err) {
    logger.error('Fatal error:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

main();
