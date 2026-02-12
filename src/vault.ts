// ============================================================================
// NISHI Vault - Secure Environment Variable Management
// ============================================================================

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { VaultSecrets, VaultLoadResult, VaultOptions } from './types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VAULT_FILE = path.join(__dirname, '..', '.vault.enc');
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;

/**
 * Derive encryption key from password using PBKDF2
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, 100000, KEY_LENGTH, 'sha256');
}

/**
 * Encrypt data using AES-256-GCM
 */
function encrypt(plaintext: string, password: string): Buffer {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(password, salt);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final()
  ]);

  const tag = cipher.getAuthTag();

  // Format: salt(64) + iv(16) + tag(16) + encrypted data
  return Buffer.concat([salt, iv, tag, encrypted]);
}

/**
 * Decrypt data using AES-256-GCM
 */
function decrypt(encryptedBuffer: Buffer, password: string): string {
  const salt = encryptedBuffer.slice(0, SALT_LENGTH);
  const iv = encryptedBuffer.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const tag = encryptedBuffer.slice(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const encrypted = encryptedBuffer.slice(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

  const key = deriveKey(password, salt);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]);

  return decrypted.toString('utf8');
}

/**
 * Load secrets from vault
 */
export async function loadFromVault(password: string): Promise<VaultSecrets> {
  if (!password) {
    throw new Error('Vault password is required');
  }

  if (!fs.existsSync(VAULT_FILE)) {
    throw new Error(`Vault file not found at ${VAULT_FILE}`);
  }

  try {
    const encryptedData = fs.readFileSync(VAULT_FILE);
    const decrypted = decrypt(encryptedData, password);
    const secrets = JSON.parse(decrypted) as VaultSecrets;
    return secrets;
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unsupported state or unable to authenticate data')) {
      throw new Error('Invalid vault password');
    }
    throw error;
  }
}

/**
 * Save secrets to vault
 */
export async function saveToVault(secrets: VaultSecrets, password: string): Promise<void> {
  if (!password) {
    throw new Error('Vault password is required');
  }

  const json = JSON.stringify(secrets, null, 2);
  const encrypted = encrypt(json, password);
  fs.writeFileSync(VAULT_FILE, encrypted);
  fs.chmodSync(VAULT_FILE, 0o600); // Read/write for owner only
}

/**
 * Initialize vault from .env file
 */
export async function initializeVault(password: string, envFilePath = '.env'): Promise<VaultSecrets> {
  if (!password) {
    throw new Error('Vault password is required');
  }

  const envPath = path.join(__dirname, '..', envFilePath);
  if (!fs.existsSync(envPath)) {
    throw new Error(`.env file not found at ${envPath}`);
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const secrets: VaultSecrets = {};

  // Parse .env file
  const lines = envContent.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1]!.trim();
      let value = match[2]!.trim();

      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      secrets[key] = value;
    }
  }

  await saveToVault(secrets, password);
  return secrets;
}

/**
 * Check if vault file exists
 */
export function vaultExists(): boolean {
  return fs.existsSync(VAULT_FILE);
}

/**
 * Get a specific secret from vault
 */
export async function getSecret(key: string, password: string): Promise<string | undefined> {
  const secrets = await loadFromVault(password);
  return secrets[key];
}

/**
 * Set a specific secret in vault
 */
export async function setSecret(key: string, value: string, password: string): Promise<void> {
  let secrets: VaultSecrets = {};

  if (vaultExists()) {
    secrets = await loadFromVault(password);
  }

  secrets[key] = value;
  await saveToVault(secrets, password);
}

/**
 * Delete a specific secret from vault
 */
export async function deleteSecret(key: string, password: string): Promise<void> {
  const secrets = await loadFromVault(password);
  delete secrets[key];
  await saveToVault(secrets, password);
}

/**
 * List all secret keys (not values)
 */
export async function listSecrets(password: string): Promise<string[]> {
  const secrets = await loadFromVault(password);
  return Object.keys(secrets);
}

/**
 * Load environment variables with vault fallback
 */
export async function loadEnvironment(options: VaultOptions = {}): Promise<VaultLoadResult> {
  const {
    vaultPassword = process.env.NISHI_VAULT_PASSWORD,
    fallbackToEnv = true,
    warnOnFallback = true
  } = options;

  // Try to load from vault first
  if (vaultPassword && vaultExists()) {
    try {
      const secrets = await loadFromVault(vaultPassword);
      // Set environment variables from vault
      Object.entries(secrets).forEach(([key, value]) => {
        if (!process.env[key]) {
          process.env[key] = value;
        }
      });
      return { source: 'vault', secrets: Object.keys(secrets) };
    } catch (error) {
      if (warnOnFallback) {
        console.warn(`⚠️  Failed to load from vault: ${error instanceof Error ? error.message : String(error)}`);
      }
      if (!fallbackToEnv) {
        throw error;
      }
    }
  }

  // Fallback to .env file
  if (fallbackToEnv) {
    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
      if (warnOnFallback) {
        console.warn('⚠️  Loading from .env file (vault not available). Consider using vault for production.');
      }

      // Simple .env parser
      const envContent = fs.readFileSync(envPath, 'utf8');
      const lines = envContent.split('\n');
      const loaded: string[] = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const match = trimmed.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1]!.trim();
          let value = match[2]!.trim();

          // Remove quotes if present
          if ((value.startsWith('"') && value.endsWith('"')) ||
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }

          if (!process.env[key]) {
            process.env[key] = value;
            loaded.push(key);
          }
        }
      }

      return { source: 'env', secrets: loaded };
    }
  }

  throw new Error('No vault or .env file available');
}

export default {
  loadFromVault,
  saveToVault,
  initializeVault,
  vaultExists,
  getSecret,
  setSecret,
  deleteSecret,
  listSecrets,
  loadEnvironment
};
