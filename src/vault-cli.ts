#!/usr/bin/env node
// ============================================================================
// NISHI Vault CLI - Manage Encrypted Secrets
// ============================================================================

import { createInterface } from 'node:readline';
import {
  initializeVault,
  loadFromVault,
  saveToVault,
  getSecret,
  setSecret,
  deleteSecret,
  listSecrets,
  vaultExists
} from './vault.js';

/**
 * Read password from stdin (hidden)
 */
function readPassword(prompt = 'Enter vault password: '): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });

    // Hide password input
    const stdin = process.stdin;
    stdin.on('data', (char: Buffer) => {
      const charStr = char.toString();
      if (charStr === '\n' || charStr === '\r' || charStr === '\r\n') {
        stdin.pause();
      } else {
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
        process.stdout.write(prompt + '*'.repeat((rl as unknown as { line: string }).line.length));
      }
    });

    rl.question(prompt, (password: string) => {
      rl.close();
      console.log(); // New line after password
      resolve(password);
    });
  });
}

/**
 * Initialize vault from .env file
 */
async function cmdInit(): Promise<void> {
  console.log('Initializing vault from .env file...\n');

  if (vaultExists()) {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise<string>((resolve) => {
      rl.question('Vault already exists. Overwrite? (y/N): ', resolve);
    });
    rl.close();

    if (answer.toLowerCase() !== 'y') {
      console.log('Aborted.');
      return;
    }
  }

  const password = await readPassword();
  if (!password) {
    console.error('❌ Password is required');
    process.exit(1);
  }

  const confirmPassword = await readPassword('Confirm password: ');
  if (password !== confirmPassword) {
    console.error('❌ Passwords do not match');
    process.exit(1);
  }

  try {
    const secrets = await initializeVault(password);
    console.log(`✓ Vault initialized with ${Object.keys(secrets).length} secrets`);
    console.log('\n⚠️  Important: Store your vault password securely!');
    console.log('   Set it in environment: export NISHI_VAULT_PASSWORD="your-password"');
  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

/**
 * List all secret keys
 */
async function cmdList(): Promise<void> {
  const password = await readPassword();
  if (!password) {
    console.error('❌ Password is required');
    process.exit(1);
  }

  try {
    const keys = await listSecrets(password);
    console.log(`\nVault contains ${keys.length} secrets:\n`);
    keys.sort().forEach(key => console.log(`  • ${key}`));
  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

/**
 * Get a specific secret
 */
async function cmdGet(key: string | undefined): Promise<void> {
  if (!key) {
    console.error('❌ Secret key is required');
    console.log('Usage: node vault-cli.js get <key>');
    process.exit(1);
  }

  const password = await readPassword();
  if (!password) {
    console.error('❌ Password is required');
    process.exit(1);
  }

  try {
    const value = await getSecret(key, password);
    if (value === undefined) {
      console.log(`Secret "${key}" not found`);
    } else {
      console.log(`\n${key}=${value}`);
    }
  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

/**
 * Set a specific secret
 */
async function cmdSet(key: string | undefined, value?: string): Promise<void> {
  if (!key) {
    console.error('❌ Secret key is required');
    console.log('Usage: node vault-cli.js set <key> <value>');
    process.exit(1);
  }

  const password = await readPassword();
  if (!password) {
    console.error('❌ Password is required');
    process.exit(1);
  }

  // If value not provided, read from stdin
  let finalValue = value;
  if (finalValue === undefined) {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });

    finalValue = await new Promise<string>((resolve) => {
      rl.question(`Enter value for ${key}: `, resolve);
    });
    rl.close();
  }

  try {
    await setSecret(key, finalValue, password);
    console.log(`✓ Secret "${key}" saved`);
  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

/**
 * Delete a specific secret
 */
async function cmdDelete(key: string | undefined): Promise<void> {
  if (!key) {
    console.error('❌ Secret key is required');
    console.log('Usage: node vault-cli.js delete <key>');
    process.exit(1);
  }

  const password = await readPassword();
  if (!password) {
    console.error('❌ Password is required');
    process.exit(1);
  }

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const answer = await new Promise<string>((resolve) => {
    rl.question(`Delete secret "${key}"? (y/N): `, resolve);
  });
  rl.close();

  if (answer.toLowerCase() !== 'y') {
    console.log('Aborted.');
    return;
  }

  try {
    await deleteSecret(key, password);
    console.log(`✓ Secret "${key}" deleted`);
  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

/**
 * Export vault to JSON (for backup)
 */
async function cmdExport(): Promise<void> {
  const password = await readPassword();
  if (!password) {
    console.error('❌ Password is required');
    process.exit(1);
  }

  try {
    const secrets = await loadFromVault(password);
    console.log(JSON.stringify(secrets, null, 2));
  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

/**
 * Import secrets from JSON
 */
async function cmdImport(jsonFile: string | undefined): Promise<void> {
  if (!jsonFile) {
    console.error('❌ JSON file path is required');
    console.log('Usage: node vault-cli.js import <json-file>');
    process.exit(1);
  }

  const password = await readPassword();
  if (!password) {
    console.error('❌ Password is required');
    process.exit(1);
  }

  try {
    const fs = await import('node:fs');
    const content = fs.readFileSync(jsonFile, 'utf8');
    const secrets = JSON.parse(content) as Record<string, string>;

    await saveToVault(secrets, password);
    console.log(`✓ Imported ${Object.keys(secrets).length} secrets`);
  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

/**
 * Show usage
 */
function showUsage(): void {
  console.log(`
NISHI Vault CLI - Secure Environment Variable Management

Usage:
  node vault-cli.js <command> [options]

Commands:
  init              Initialize vault from .env file
  list              List all secret keys
  get <key>         Get a specific secret value
  set <key> [value] Set a secret (prompts for value if not provided)
  delete <key>      Delete a secret
  export            Export all secrets as JSON (for backup)
  import <file>     Import secrets from JSON file
  help              Show this help message

Examples:
  # Initialize vault from .env
  node vault-cli.js init

  # List all secrets
  node vault-cli.js list

  # Get a specific secret
  node vault-cli.js get ANTHROPIC_API_KEY

  # Set a secret
  node vault-cli.js set ANTHROPIC_API_KEY sk-ant-...

  # Delete a secret
  node vault-cli.js delete OLD_API_KEY

  # Export for backup
  node vault-cli.js export > backup.json

  # Import from backup
  node vault-cli.js import backup.json

Environment Variables:
  NISHI_VAULT_PASSWORD  Set vault password to avoid prompts
                        Example: export NISHI_VAULT_PASSWORD="your-password"
`);
}

/**
 * Main CLI handler
 */
async function main(): Promise<void> {
  const [,, command, ...args] = process.argv;

  if (!command || command === 'help') {
    showUsage();
    process.exit(0);
  }

  switch (command) {
    case 'init':
      await cmdInit();
      break;
    case 'list':
      await cmdList();
      break;
    case 'get':
      await cmdGet(args[0]);
      break;
    case 'set':
      await cmdSet(args[0], args[1]);
      break;
    case 'delete':
    case 'del':
    case 'rm':
      await cmdDelete(args[0]);
      break;
    case 'export':
      await cmdExport();
      break;
    case 'import':
      await cmdImport(args[0]);
      break;
    default:
      console.error(`❌ Unknown command: ${command}`);
      showUsage();
      process.exit(1);
  }
}

// Run CLI
main().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
