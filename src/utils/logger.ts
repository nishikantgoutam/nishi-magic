// ============================================================================
// DEVWEAVER – Logger
// ============================================================================

import type { Logger, LogLevel } from '../types/index.js';

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

const currentLevel = LEVELS[(process.env.DEVWEAVER_LOG_LEVEL as LogLevel) || 'info'] ?? 1;

const COLORS = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
} as const;

function ts(): string {
  return new Date().toISOString().slice(11, 23);
}

const logger: Logger = {
  debug(...args: unknown[]): void {
    if (currentLevel <= LEVELS.debug) {
      console.log(`${COLORS.dim}[nishi] [${ts()}]${COLORS.reset}`, ...args);
    }
  },

  info(...args: unknown[]): void {
    if (currentLevel <= LEVELS.info) {
      console.log(`${COLORS.cyan}[nishi]${COLORS.reset}`, ...args);
    }
  },

  warn(...args: unknown[]): void {
    if (currentLevel <= LEVELS.warn) {
      console.warn(`${COLORS.yellow}⚠ [nishi]${COLORS.reset}`, ...args);
    }
  },

  error(...args: unknown[]): void {
    if (currentLevel <= LEVELS.error) {
      console.error(`${COLORS.red}✗ [nishi]${COLORS.reset}`, ...args);
    }
  },

  agent(name: string, ...args: unknown[]): void {
    if (currentLevel <= LEVELS.info) {
      console.log(`${COLORS.magenta}[nishi:${name}]${COLORS.reset}`, ...args);
    }
  },

  tool(name: string, ...args: unknown[]): void {
    if (currentLevel <= LEVELS.info) {
      console.log(`${COLORS.blue}[nishi]${COLORS.reset} 🔧 ${name}`, ...args);
    }
  },

  success(...args: unknown[]): void {
    if (currentLevel <= LEVELS.info) {
      console.log(`${COLORS.green}✓ [nishi]${COLORS.reset}`, ...args);
    }
  },
};

export default logger;
