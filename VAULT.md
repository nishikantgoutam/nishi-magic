# NISHI Vault - Secure Environment Variable Management

The NISHI vault system provides secure, encrypted storage for environment variables using AES-256-GCM encryption. It replaces storing sensitive credentials in plain-text `.env` files.

## Features

- **AES-256-GCM Encryption**: Military-grade encryption with authentication
- **Password-Based Key Derivation**: PBKDF2 with 100,000 iterations
- **Fallback Support**: Automatically falls back to `.env` files with warnings
- **CLI Management**: Easy-to-use command-line interface for managing secrets
- **Import/Export**: Backup and restore functionality

## Quick Start

### 1. Initialize Vault

Create an encrypted vault from your existing `.env` file:

```bash
node vault-cli.js init
```

You'll be prompted to enter and confirm a password. This password will be used to encrypt/decrypt your secrets.

**Important**: Store your vault password securely! If you lose it, you cannot recover your secrets.

### 2. Set Vault Password

For automatic loading, set the vault password as an environment variable:

```bash
# Linux/Mac
export NISHI_VAULT_PASSWORD="your-secure-password"

# Windows (Command Prompt)
set NISHI_VAULT_PASSWORD=your-secure-password

# Windows (PowerShell)
$env:NISHI_VAULT_PASSWORD="your-secure-password"
```

Add this to your shell profile (`.bashrc`, `.zshrc`, etc.) for persistence.

### 3. Run Your Application

The vault is automatically loaded when you import `config.js`:

```bash
node index.js
```

If the vault password is set correctly, you'll see:
```
✓ Loaded 15 secrets from vault
```

## Vault CLI Commands

### Initialize Vault

Create a new vault from `.env` file:

```bash
node vault-cli.js init
```

### List Secrets

View all secret keys (not values):

```bash
node vault-cli.js list
```

Output:
```
Vault contains 15 secrets:

  • ANTHROPIC_API_KEY
  • BITBUCKET_APP_PASSWORD
  • CONFLUENCE_API_TOKEN
  • JIRA_API_TOKEN
  ...
```

### Get a Secret

Retrieve a specific secret value:

```bash
node vault-cli.js get ANTHROPIC_API_KEY
```

### Set a Secret

Add or update a secret:

```bash
# With value
node vault-cli.js set NEW_API_KEY "sk-ant-..."

# Prompts for value
node vault-cli.js set NEW_API_KEY
```

### Delete a Secret

Remove a secret from the vault:

```bash
node vault-cli.js delete OLD_API_KEY
```

### Export Vault

Export all secrets as JSON (for backup):

```bash
node vault-cli.js export > backup.json
```

**Warning**: The exported file contains secrets in plain text. Store it securely!

### Import Secrets

Import secrets from a JSON file:

```bash
node vault-cli.js import backup.json
```

## Using Vault in Your Code

### Automatic Loading (Recommended)

The vault is automatically loaded when you import `config.js`:

```javascript
import config from './config.js';

// All environment variables are now available
console.log(config.llm.apiKey);
```

### Manual Loading

Load the vault programmatically:

```javascript
import { loadEnvironment, getSecret } from './vault.js';

// Load all secrets into environment
const result = await loadEnvironment({
  vaultPassword: 'your-password',
  fallbackToEnv: true,
  warnOnFallback: true
});

console.log(result.source); // 'vault' or 'env'
console.log(result.secrets); // Array of loaded keys

// Get a specific secret
const apiKey = await getSecret('ANTHROPIC_API_KEY', 'your-password');
```

### Advanced Usage

```javascript
import {
  loadFromVault,
  saveToVault,
  setSecret,
  deleteSecret,
  listSecrets
} from './vault.js';

// Load all secrets
const secrets = await loadFromVault('your-password');

// Update secrets
secrets.NEW_KEY = 'new-value';
await saveToVault(secrets, 'your-password');

// Set individual secret
await setSecret('API_KEY', 'sk-ant-...', 'your-password');

// Delete a secret
await deleteSecret('OLD_KEY', 'your-password');

// List all keys
const keys = await listSecrets('your-password');
```

## Security Best Practices

### 1. Protect Your Vault Password

- **Never commit** vault passwords to version control
- **Use strong passwords**: 16+ characters, mixed case, numbers, symbols
- **Store securely**: Use a password manager or secure environment variables
- **Rotate regularly**: Change vault passwords periodically

### 2. File Permissions

The vault file (`.vault.enc`) is automatically set to read/write for owner only (`0600`). Verify:

```bash
# Linux/Mac
ls -l .vault.enc
# Should show: -rw------- (600)
```

### 3. Backup Safely

When exporting for backup:

```bash
# Export
node vault-cli.js export > backup.json

# Encrypt the backup
gpg -c backup.json

# Remove plain text
rm backup.json

# Store backup.json.gpg securely
```

### 4. Environment Separation

Use different vaults for different environments:

```bash
# Development
export NISHI_VAULT_PASSWORD="dev-password"
node vault-cli.js init

# Production (use different password!)
export NISHI_VAULT_PASSWORD="prod-password"
node vault-cli.js init
```

### 5. CI/CD Integration

In CI/CD pipelines, set the vault password as a secret environment variable:

```yaml
# GitHub Actions example
env:
  NISHI_VAULT_PASSWORD: ${{ secrets.VAULT_PASSWORD }}
```

## Fallback Behavior

The vault system provides graceful fallback to `.env` files:

1. **Vault Available**: Loads from encrypted vault
   ```
   ✓ Loaded 15 secrets from vault
   ```

2. **Vault Password Not Set**: Falls back to `.env` with warning
   ```
   ⚠️  Loading from .env file (vault not available). Consider using vault for production.
   ```

3. **Invalid Password**: Falls back to `.env` with error message
   ```
   ⚠️  Failed to load from vault: Invalid vault password
   ⚠️  Loading from .env file (vault not available). Consider using vault for production.
   ```

### Disable Fallback

For production environments, disable fallback to enforce vault usage:

```javascript
const result = await loadEnvironment({
  vaultPassword: process.env.NISHI_VAULT_PASSWORD,
  fallbackToEnv: false,  // Throw error if vault fails
  warnOnFallback: true
});
```

## Migration Guide

### From .env to Vault

1. **Backup your .env file**:
   ```bash
   cp .env .env.backup
   ```

2. **Initialize vault**:
   ```bash
   node vault-cli.js init
   ```

3. **Verify secrets**:
   ```bash
   node vault-cli.js list
   ```

4. **Test your application**:
   ```bash
   export NISHI_VAULT_PASSWORD="your-password"
   node index.js
   ```

5. **Remove .env file** (optional):
   ```bash
   rm .env
   ```

### From Vault Back to .env

If you need to go back to `.env`:

1. **Export secrets**:
   ```bash
   node vault-cli.js export > secrets.json
   ```

2. **Convert to .env format**:
   ```bash
   node -e "
     const fs = require('fs');
     const secrets = JSON.parse(fs.readFileSync('secrets.json', 'utf8'));
     const envContent = Object.entries(secrets)
       .map(([key, value]) => \`\${key}=\${value}\`)
       .join('\n');
     fs.writeFileSync('.env', envContent);
   "
   ```

3. **Remove vault password**:
   ```bash
   unset NISHI_VAULT_PASSWORD
   ```

## Troubleshooting

### "Invalid vault password"

The password you entered doesn't match the one used to encrypt the vault.

**Solution**: Double-check your password or use the backup to restore.

### "Vault file not found"

The `.vault.enc` file doesn't exist.

**Solution**: Initialize the vault with `node vault-cli.js init`

### "No vault or .env file available"

Both vault and `.env` files are missing.

**Solution**: Create a `.env` file or initialize the vault.

### Vault not loading automatically

Make sure `NISHI_VAULT_PASSWORD` is set:

```bash
echo $NISHI_VAULT_PASSWORD
```

If empty, set it:
```bash
export NISHI_VAULT_PASSWORD="your-password"
```

## Technical Details

### Encryption Algorithm

- **Algorithm**: AES-256-GCM (Galois/Counter Mode)
- **Key Derivation**: PBKDF2-HMAC-SHA256
- **Iterations**: 100,000
- **Salt Length**: 64 bytes (random)
- **IV Length**: 16 bytes (random)
- **Authentication Tag**: 16 bytes

### File Format

The `.vault.enc` file structure:

```
[Salt: 64 bytes][IV: 16 bytes][Auth Tag: 16 bytes][Encrypted Data: variable]
```

### Dependencies

The vault system uses only Node.js built-in modules:
- `crypto`: Encryption/decryption
- `fs`: File operations
- `path`: Path handling
- `readline`: CLI input

No external dependencies required!

## FAQ

### Can I use multiple vaults?

Yes! Create different vault files for different environments by modifying the `VAULT_FILE` constant in `vault.js`.

### Is the vault file portable?

Yes! The `.vault.enc` file can be copied between machines. Just make sure you have the correct password.

### Can I share the vault file with my team?

Yes, but **share the password securely** (e.g., via password manager, not email/Slack).

### What happens if I forget the password?

Unfortunately, encrypted data cannot be recovered without the password. Always keep backups!

### Should I commit .vault.enc to git?

It depends on your security requirements:
- **Yes**: If all team members need access and you share the password securely
- **No**: For maximum security, use a secrets management service instead

The `.vault.enc` file is **not** in `.gitignore` by default, allowing you to choose.

### Can I use environment variables instead of the vault?

Yes! The system falls back to `.env` files. You can also set variables directly:

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
node index.js
```

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the error messages carefully
3. Ensure file permissions are correct
4. Verify your password is correct

---

**Remember**: The vault is only as secure as your password. Use strong passwords and keep them safe!
