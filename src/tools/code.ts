// ============================================================================
// NISHI – Code / Repository Tools (local filesystem)
// ============================================================================
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import config from '../config.js';
import { walkDir, readFile, writeFile, buildTree, exists, ext } from '../utils/fs.js';
import logger from '../utils/logger.js';
import type { Tool } from '../types/index.js';

// ── Handlers ────────────────────────────────────────────────────────────────

function repoRoot(): string {
  return config.repo.localPath;
}

async function analyzeRepo(): Promise<unknown> {
  const root = repoRoot();
  if (!exists(root)) throw new Error(`Repo path does not exist: ${root}`);

  const files = walkDir(root);
  const extCounts: Record<string, number> = {};
  let totalLines = 0;
  const sampleFiles: Record<string, Array<{ path: string; preview: string }>> = {};

  for (const f of files) {
    const e = ext(f) || '(no ext)';
    extCounts[e] = (extCounts[e] || 0) + 1;

    // Sample up to 3 files per extension for pattern detection
    if (!sampleFiles[e]) sampleFiles[e] = [];
    if (sampleFiles[e].length < 3) {
      const content = readFile(path.join(root, f));
      if (content) {
        totalLines += content.split('\n').length;
        sampleFiles[e].push({ path: f, preview: content.slice(0, 500) });
      }
    }
  }

  // Detect project type
  const indicators = {
    hasPackageJson: exists(path.join(root, 'package.json')),
    hasTsConfig: exists(path.join(root, 'tsconfig.json')),
    hasPomXml: exists(path.join(root, 'pom.xml')),
    hasPipfile: exists(path.join(root, 'Pipfile')) || exists(path.join(root, 'requirements.txt')),
    hasGoMod: exists(path.join(root, 'go.mod')),
    hasDockerfile: exists(path.join(root, 'Dockerfile')),
    hasCICD: exists(path.join(root, '.github')) || exists(path.join(root, 'bitbucket-pipelines.yml')),
  };

  // Read key config files
  const keyFiles: Record<string, string> = {};
  const configFiles = ['package.json', 'tsconfig.json', '.eslintrc.json', '.eslintrc.js', '.prettierrc', 'jest.config.js', 'jest.config.ts', 'vitest.config.ts'];
  for (const cf of configFiles) {
    const content = readFile(path.join(root, cf));
    if (content) keyFiles[cf] = content.slice(0, 2000);
  }

  const tree = buildTree(root, { maxDepth: 4 });

  return {
    totalFiles: files.length,
    totalLines,
    extensionCounts: extCounts,
    projectIndicators: indicators,
    keyConfigFiles: keyFiles,
    directoryTree: tree,
    sampleFiles,
  };
}

async function readLocalFile(input: { filePath: string }): Promise<unknown> {
  const { filePath } = input;
  const fullPath = path.isAbsolute(filePath) ? filePath : path.join(repoRoot(), filePath);
  const content = readFile(fullPath);
  if (content === null) throw new Error(`File not found: ${fullPath}`);
  return { path: filePath, content, lines: content.split('\n').length };
}

async function writeLocalFile(input: { filePath: string; content: string }): Promise<unknown> {
  const { filePath, content } = input;
  const fullPath = path.isAbsolute(filePath) ? filePath : path.join(repoRoot(), filePath);
  writeFile(fullPath, content);
  logger.success(`Wrote file: ${fullPath}`);
  return { path: filePath, bytesWritten: Buffer.byteLength(content) };
}

async function searchCode(input: {
  pattern: string;
  filePattern?: string;
  maxResults?: number;
}): Promise<unknown> {
  const { pattern, filePattern, maxResults } = input;
  const root = repoRoot();
  const results: Array<{
    file: string;
    line: number;
    content: string;
    context: string;
  }> = [];
  const files = walkDir(root);

  for (const f of files) {
    if (results.length >= (maxResults || 50)) break;
    if (filePattern && !f.match(new RegExp(filePattern, 'i'))) continue;

    const content = readFile(path.join(root, f));
    if (!content) continue;

    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line && line.includes(pattern)) {
        results.push({
          file: f,
          line: i + 1,
          content: line.trim(),
          context: lines.slice(Math.max(0, i - 2), i + 3).join('\n'),
        });
        if (results.length >= (maxResults || 50)) break;
      }
    }
  }

  return { pattern, matchCount: results.length, matches: results };
}

async function listDirectory(input: { dirPath?: string }): Promise<unknown> {
  const { dirPath } = input;
  const fullPath = dirPath ? path.join(repoRoot(), dirPath) : repoRoot();
  if (!exists(fullPath)) throw new Error(`Directory not found: ${fullPath}`);

  const entries = fs.readdirSync(fullPath, { withFileTypes: true });
  return entries
    .filter((e) => !e.name.startsWith('.') && e.name !== 'node_modules')
    .map((e) => ({
      name: e.name,
      type: e.isDirectory() ? 'directory' : 'file',
      path: path.join(dirPath || '', e.name),
    }));
}

async function runCommand(input: { command: string; cwd?: string }): Promise<unknown> {
  const { command, cwd } = input;
  // Security: restrict to safe commands
  const allowed = ['ls', 'cat', 'head', 'tail', 'wc', 'find', 'grep', 'tree', 'git', 'npm', 'npx', 'node', 'tsc'];
  const cmd = command.split(' ')[0] || '';
  if (!allowed.some((a) => cmd === a || cmd.endsWith(`/${a}`))) {
    throw new Error(`Command not allowed: ${cmd}. Allowed: ${allowed.join(', ')}`);
  }

  try {
    const output = execSync(command, {
      cwd: cwd || repoRoot(),
      timeout: 30_000,
      maxBuffer: 1024 * 1024,
      encoding: 'utf-8',
    });
    return { command, output: output.slice(0, 5000) };
  } catch (err) {
    return { command, error: (err instanceof Error ? err.message : String(err)).slice(0, 2000) };
  }
}

async function getProjectTree(input: { maxDepth?: number }): Promise<unknown> {
  const { maxDepth } = input;
  return { tree: buildTree(repoRoot(), { maxDepth: maxDepth || 5 }) };
}

async function getGitStatus(): Promise<unknown> {
  try {
    const status = execSync('git status --porcelain', { cwd: repoRoot(), encoding: 'utf-8' });
    const branch = execSync('git branch --show-current', { cwd: repoRoot(), encoding: 'utf-8' }).trim();
    const log = execSync('git log --oneline -10', { cwd: repoRoot(), encoding: 'utf-8' });
    return { branch, status, recentCommits: log };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

async function getGitDiff(input: { branch?: string; staged?: boolean }): Promise<unknown> {
  const { branch, staged } = input;
  try {
    let cmd = 'git diff';
    if (staged) cmd += ' --staged';
    if (branch) cmd += ` ${branch}`;
    const diff = execSync(cmd, { cwd: repoRoot(), encoding: 'utf-8', maxBuffer: 5 * 1024 * 1024 });
    return { diff: diff.slice(0, 10000) };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

// ── Tool Definitions ────────────────────────────────────────────────────────

const codeTools: Tool[] = [
    {
      name: 'code_analyze_repo',
      description: 'Analyze the local repository: file types, structure, frameworks, config files, coding patterns. Use this to understand the project before writing code or tests.',
      input_schema: { type: 'object', properties: {} },
    execute: analyzeRepo as any,
  },
    {
      name: 'code_read_file',
      description: 'Read the content of a file from the local repository.',
      input_schema: {
        type: 'object',
        properties: { filePath: { type: 'string' } },
        required: ['filePath'],
      },
    execute: readLocalFile as any,
  },
    {
      name: 'code_write_file',
      description: 'Write content to a file in the local repository (creates directories as needed).',
      input_schema: {
        type: 'object',
        properties: {
          filePath: { type: 'string' },
          content: { type: 'string' },
        },
        required: ['filePath', 'content'],
      },
    execute: writeLocalFile as any,
  },
    {
      name: 'code_search',
      description: 'Search for a text pattern across all files in the repository.',
      input_schema: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'Text to search for' },
          filePattern: { type: 'string', description: 'Regex to filter file names' },
          maxResults: { type: 'number' },
        },
        required: ['pattern'],
      },
    execute: searchCode as any,
  },
    {
      name: 'code_list_directory',
      description: 'List files and folders in a directory.',
      input_schema: {
        type: 'object',
        properties: { dirPath: { type: 'string' } },
      },
    execute: listDirectory as any,
  },
    {
      name: 'code_run_command',
      description: 'Run a safe shell command in the repo directory (git, npm, node, tsc, etc.).',
      input_schema: {
        type: 'object',
        properties: {
          command: { type: 'string' },
          cwd: { type: 'string', description: 'Working directory (optional)' },
        },
        required: ['command'],
      },
    execute: runCommand as any,
  },
    {
      name: 'code_project_tree',
      description: 'Get the directory tree of the project.',
      input_schema: {
        type: 'object',
        properties: { maxDepth: { type: 'number' } },
      },
    execute: getProjectTree as any,
  },
    {
      name: 'code_git_status',
      description: 'Get git status, current branch, and recent commits.',
      input_schema: { type: 'object', properties: {} },
    execute: getGitStatus as any,
  },
    {
      name: 'code_git_diff',
      description: 'Get git diff for review.',
      input_schema: {
        type: 'object',
        properties: {
          branch: { type: 'string', description: 'Branch to diff against' },
          staged: { type: 'boolean', description: 'Show staged changes only' },
        },
      },
    execute: getGitDiff as any,
  },
];

export default codeTools;
