#!/usr/bin/env node

// ============================================================================
// DevWeaver - Installation Script
//
// Interactive installer for DevWeaver CLI across Claude Code, OpenCode, and Gemini
// ============================================================================

import { createInterface } from 'readline';
import { homedir } from 'os';
import { join, resolve } from 'path';
import { existsSync, mkdirSync, copyFileSync, readdirSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
};

const log = {
  info: (msg) => console.log(`${colors.cyan}[nishi]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓ [nishi]${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠ [nishi]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗ [nishi]${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bright}${colors.blue}${msg}${colors.reset}\n`),
};

// Parse CLI arguments
const args = process.argv.slice(2);
const flags = {
  claude: args.includes('--claude'),
  opencode: args.includes('--opencode'),
  gemini: args.includes('--gemini'),
  all: args.includes('--all'),
  global: args.includes('--global'),
  local: args.includes('--local'),
};

const nonInteractive = flags.claude || flags.opencode || flags.gemini || flags.all;
const hasScope = flags.global || flags.local;

// Installation configuration
const runtimes = {
  claude: { name: 'Claude Code', dir: '.claude' },
  opencode: { name: 'OpenCode', dir: '.opencode' },
  gemini: { name: 'Gemini CLI', dir: '.gemini' },
};

/**
 * Prompt user for input
 */
function prompt(question) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${colors.cyan}[nishi]${colors.reset} ${question} `, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Copy files recursively
 */
function copyRecursive(src, dest) {
  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true });
  }

  const items = readdirSync(src);
  for (const item of items) {
    const srcPath = join(src, item);
    const destPath = join(dest, item);

    if (statSync(srcPath).isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Install DevWeaver to a specific runtime
 */
function installToRuntime(runtime, scope) {
  const runtimeInfo = runtimes[runtime];
  const baseDir = scope === 'global'
    ? join(homedir(), runtimeInfo.dir)
    : join(process.cwd(), runtimeInfo.dir);

  log.info(`Installing to ${runtimeInfo.name} (${scope})...`);

  // Create directories
  const skillsDir = join(baseDir, 'skills');
  const agentsDir = join(baseDir, 'agents');
  const promptsDir = join(baseDir, 'prompts');

  mkdirSync(skillsDir, { recursive: true });
  mkdirSync(agentsDir, { recursive: true });
  mkdirSync(promptsDir, { recursive: true });

  // Copy skills (commands)
  const srcSkillsDir = resolve(__dirname, '../dist/skills');
  if (existsSync(srcSkillsDir)) {
    copyRecursive(srcSkillsDir, skillsDir);
    log.success(`Skills installed to ${skillsDir}`);
  }

  // Copy agents
  const srcAgentsDir = resolve(__dirname, '../dist/agents');
  if (existsSync(srcAgentsDir)) {
    copyRecursive(srcAgentsDir, agentsDir);
    log.success(`Agents installed to ${agentsDir}`);
  }

  // Copy prompts
  const srcPromptsDir = resolve(__dirname, '../dist/prompts');
  if (existsSync(srcPromptsDir)) {
    copyRecursive(srcPromptsDir, promptsDir);
    log.success(`Prompts installed to ${promptsDir}`);
  }

  log.success(`${runtimeInfo.name} installation complete!`);

  // Show usage instructions
  if (runtime === 'claude') {
    log.info('\nTo use DevWeaver with Claude Code:');
    log.info('  /nishi:help              - Show all available commands');
    log.info('  /nishi:new-project       - Initialize a new project with research');
    log.info('  /nishi:quick <task>      - Execute a quick task');
    log.info('  /nishi:progress          - Check current progress');
  }
}

/**
 * Interactive installation
 */
async function interactiveInstall() {
  log.header('DevWeaver Installation');
  log.info('Welcome to DevWeaver — Next-level Intelligent System for Holistic Integration');

  // Select runtimes
  console.log('\nSelect which AI coding assistant(s) you use:');
  console.log('  1. Claude Code');
  console.log('  2. OpenCode');
  console.log('  3. Gemini CLI');
  console.log('  4. All of the above');

  const runtimeChoice = await prompt('Enter your choice (1-4):');

  let selectedRuntimes = [];
  switch (runtimeChoice) {
    case '1':
      selectedRuntimes = ['claude'];
      break;
    case '2':
      selectedRuntimes = ['opencode'];
      break;
    case '3':
      selectedRuntimes = ['gemini'];
      break;
    case '4':
      selectedRuntimes = ['claude', 'opencode', 'gemini'];
      break;
    default:
      log.error('Invalid choice. Defaulting to Claude Code.');
      selectedRuntimes = ['claude'];
  }

  // Select scope
  console.log('\nSelect installation scope:');
  console.log('  1. Global (~/.claude/, ~/.opencode/, etc.) - Recommended');
  console.log('  2. Local (./.claude/, ./.opencode/, etc.) - Project-specific');

  const scopeChoice = await prompt('Enter your choice (1-2):');
  const scope = scopeChoice === '2' ? 'local' : 'global';

  // Perform installation
  console.log('');
  for (const runtime of selectedRuntimes) {
    installToRuntime(runtime, scope);
  }

  // Final message
  log.header('Installation Complete!');
  log.success('DevWeaver is ready to help you get shit done.');

  if (scope === 'global') {
    log.info('\nRecommended: Run your AI assistant with --dangerously-skip-permissions');
    log.info('or configure permissions in settings.json for smoother workflows.');
  }

  log.info('\nGet started:');
  log.info('  /nishi:help              - View all commands');
  log.info('  /nishi:new-project       - Start a new project');
  log.info('  /nishi:quick <task>      - Quick task execution');

  console.log('');
}

/**
 * Non-interactive installation
 */
function nonInteractiveInstall() {
  if (!hasScope) {
    log.error('Non-interactive mode requires --global or --local flag');
    process.exit(1);
  }

  const scope = flags.global ? 'global' : 'local';
  let selectedRuntimes = [];

  if (flags.all) {
    selectedRuntimes = ['claude', 'opencode', 'gemini'];
  } else {
    if (flags.claude) selectedRuntimes.push('claude');
    if (flags.opencode) selectedRuntimes.push('opencode');
    if (flags.gemini) selectedRuntimes.push('gemini');
  }

  if (selectedRuntimes.length === 0) {
    log.error('No runtime selected. Use --claude, --opencode, --gemini, or --all');
    process.exit(1);
  }

  log.header('DevWeaver Non-Interactive Installation');

  for (const runtime of selectedRuntimes) {
    installToRuntime(runtime, scope);
  }

  log.success('\nInstallation complete!');
}

/**
 * Main entry point
 */
async function main() {
  try {
    if (nonInteractive) {
      nonInteractiveInstall();
    } else {
      await interactiveInstall();
    }
  } catch (error) {
    log.error(`Installation failed: ${error.message}`);
    process.exit(1);
  }
}

main();
