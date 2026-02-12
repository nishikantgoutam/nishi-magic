// ============================================================================
// NISHI – File System Utilities
// ============================================================================

import fs from 'node:fs';
import path from 'node:path';

interface WalkDirOptions {
  ignore?: string[];
  maxDepth?: number;
}

interface TreeNode {
  [key: string]: TreeNode | null;
}

/**
 * Recursively list files in a directory (returns relative paths).
 */
export function walkDir(dir: string, opts: WalkDirOptions = {}): string[] {
  const {
    ignore = ['node_modules', '.git', '.nishi', 'dist', 'build', '__pycache__'],
    maxDepth = 8
  } = opts;

  const results: string[] = [];

  function walk(current: string, depth: number): void {
    if (depth > maxDepth) return;

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (ignore.includes(entry.name) || entry.name.startsWith('.')) continue;

      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full, depth + 1);
      } else {
        results.push(path.relative(dir, full));
      }
    }
  }

  walk(dir, 0);
  return results;
}

/**
 * Read a file as string. Returns null on error.
 */
export function readFile(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * Write a file (creates parent dirs).
 */
export function writeFile(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf-8');
}

/**
 * Check if path exists.
 */
export function exists(p: string): boolean {
  return fs.existsSync(p);
}

/**
 * Get file extension.
 */
export function ext(filePath: string): string {
  return path.extname(filePath).toLowerCase();
}

/**
 * Build a tree string representation of the project structure.
 */
export function buildTree(dir: string, opts: WalkDirOptions = {}): string {
  const files = walkDir(dir, opts);
  const tree: TreeNode = {};

  for (const f of files) {
    const parts = f.split(path.sep);
    let node: TreeNode = tree;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]!;
      if (!node[part]) {
        node[part] = {};
      }
      node = node[part] as TreeNode;
    }

    const lastPart = parts[parts.length - 1]!;
    node[lastPart] = null;
  }

  function render(node: TreeNode, prefix = ''): string {
    const keys = Object.keys(node);
    let result = '';

    keys.forEach((key, i) => {
      const isLast = i === keys.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      result += `${prefix}${connector}${key}\n`;

      const value = node[key];
      if (value !== null && value !== undefined) {
        result += render(value, prefix + (isLast ? '    ' : '│   '));
      }
    });

    return result;
  }

  return render(tree);
}
