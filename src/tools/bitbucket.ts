// ============================================================================
// DEVWEAVER – Bitbucket Tools
// ============================================================================
import { request } from '../utils/http.js';
import config from '../config.js';
import logger from '../utils/logger.js';
import type { Tool } from '../types/index.js';

function authHeaders(): Record<string, string> {
  const token = Buffer.from(`${config.bitbucket.username}:${config.bitbucket.appPassword}`).toString('base64');
  return {
    Authorization: `Basic ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

function repoUrl(path: string): string {
  const { workspace, repoSlug } = config.bitbucket;
  return `${config.bitbucket.baseUrl}/repositories/${workspace}/${repoSlug}/${path}`;
}

// ── Handlers ────────────────────────────────────────────────────────────────

async function getRepoInfo(input: { workspace?: string; repoSlug?: string }): Promise<unknown> {
  const ws = input.workspace || config.bitbucket.workspace;
  const slug = input.repoSlug || config.bitbucket.repoSlug;
  const res = await request(`${config.bitbucket.baseUrl}/repositories/${ws}/${slug}`, {
    method: 'GET', headers: authHeaders(),
  });
  if (res.status >= 300) throw new Error(`Bitbucket getRepo error: ${JSON.stringify(res.data)}`);
  return res.data;
}

async function listBranches(input: { maxResults?: number }): Promise<unknown> {
  const res = await request(repoUrl(`refs/branches?pagelen=${input.maxResults || 25}`), {
    method: 'GET', headers: authHeaders(),
  });
  if (res.status >= 300) throw new Error(`Bitbucket branches error: ${JSON.stringify(res.data)}`);
  return res.data;
}

async function getFileContent(input: { filePath: string; branch?: string }): Promise<unknown> {
  const { filePath, branch } = input;
  const ref = branch || 'main';
  const res = await request(repoUrl(`src/${ref}/${filePath}`), {
    method: 'GET', headers: authHeaders(),
  });
  if (res.status >= 300) throw new Error(`Bitbucket getFile error: ${JSON.stringify(res.data)}`);
  return { path: filePath, content: res.data };
}

async function getDirectoryListing(input: { dirPath?: string; branch?: string }): Promise<unknown> {
  const { dirPath, branch } = input;
  const ref = branch || 'main';
  const path = dirPath ? `src/${ref}/${dirPath}` : `src/${ref}/`;
  const res = await request(repoUrl(path), { method: 'GET', headers: authHeaders() });
  if (res.status >= 300) throw new Error(`Bitbucket dirListing error: ${JSON.stringify(res.data)}`);
  return res.data;
}

async function createPullRequest(input: {
  title: string;
  description?: string;
  sourceBranch: string;
  destinationBranch?: string;
  reviewers?: string[];
}): Promise<unknown> {
  const { title, description, sourceBranch, destinationBranch, reviewers } = input;
  const body: Record<string, unknown> = {
    title,
    description: description || '',
    source: { branch: { name: sourceBranch } },
    destination: { branch: { name: destinationBranch || 'main' } },
    close_source_branch: true,
  };
  if (reviewers) {
    body.reviewers = reviewers.map((r) => ({ username: r }));
  }
  const res = await request(repoUrl('pullrequests'), { method: 'POST', headers: authHeaders(), body });
  if (res.status >= 300) throw new Error(`Bitbucket createPR error: ${JSON.stringify(res.data)}`);
  logger.success(`Created PR #${(res.data as { id: string }).id}: ${title}`);
  return res.data;
}

async function getPullRequest(input: { prId: string }): Promise<unknown> {
  const { prId } = input;
  const res = await request(repoUrl(`pullrequests/${prId}`), { method: 'GET', headers: authHeaders() });
  if (res.status >= 300) throw new Error(`Bitbucket getPR error: ${JSON.stringify(res.data)}`);
  return res.data;
}

async function getPullRequestDiff(input: { prId: string }): Promise<unknown> {
  const { prId } = input;
  const headers = { ...authHeaders(), Accept: 'text/plain' };
  const res = await request(repoUrl(`pullrequests/${prId}/diff`), { method: 'GET', headers });
  if (res.status >= 300) throw new Error(`Bitbucket PRDiff error: ${JSON.stringify(res.data)}`);
  return { prId, diff: res.data };
}

async function addPRComment(input: {
  prId: string;
  comment: string;
  filePath?: string;
  lineNumber?: number;
}): Promise<unknown> {
  const { prId, comment, filePath, lineNumber } = input;
  const body: Record<string, unknown> = { content: { raw: comment } };
  if (filePath) {
    body.inline = { path: filePath } as Record<string, unknown>;
    if (lineNumber) (body.inline as Record<string, unknown>).to = lineNumber;
  }
  const res = await request(repoUrl(`pullrequests/${prId}/comments`), {
    method: 'POST', headers: authHeaders(), body,
  });
  if (res.status >= 300) throw new Error(`Bitbucket PRComment error: ${JSON.stringify(res.data)}`);
  logger.success(`Added comment to PR #${prId}`);
  return res.data;
}

async function approvePR(input: { prId: string }): Promise<unknown> {
  const { prId } = input;
  const res = await request(repoUrl(`pullrequests/${prId}/approve`), {
    method: 'POST', headers: authHeaders(),
  });
  if (res.status >= 300) throw new Error(`Bitbucket approvePR error: ${JSON.stringify(res.data)}`);
  logger.success(`Approved PR #${prId}`);
  return res.data;
}

async function getCommits(input: { branch?: string; maxResults?: number }): Promise<unknown> {
  const { branch, maxResults } = input;
  let url = repoUrl(`commits?pagelen=${maxResults || 20}`);
  if (branch) url += `&include=${branch}`;
  const res = await request(url, { method: 'GET', headers: authHeaders() });
  if (res.status >= 300) throw new Error(`Bitbucket commits error: ${JSON.stringify(res.data)}`);
  return res.data;
}

// ── Tool Definitions ────────────────────────────────────────────────────────

const bitbucketTools: Tool[] = [
    {
      name: 'bitbucket_get_repo',
      description: 'Get repository information from Bitbucket.',
      input_schema: {
        type: 'object',
        properties: {
          workspace: { type: 'string' },
          repoSlug: { type: 'string' },
        },
      },
    execute: getRepoInfo as any,
  },
    {
      name: 'bitbucket_list_branches',
      description: 'List branches of the repository.',
      input_schema: {
        type: 'object',
        properties: { maxResults: { type: 'number' } },
      },
    execute: listBranches as any,
  },
    {
      name: 'bitbucket_get_file',
      description: 'Get the content of a file from the Bitbucket repository.',
      input_schema: {
        type: 'object',
        properties: {
          filePath: { type: 'string' },
          branch: { type: 'string' },
        },
        required: ['filePath'],
      },
    execute: getFileContent as any,
  },
    {
      name: 'bitbucket_list_directory',
      description: 'List files and folders in a repository directory.',
      input_schema: {
        type: 'object',
        properties: {
          dirPath: { type: 'string' },
          branch: { type: 'string' },
        },
      },
    execute: getDirectoryListing as any,
  },
    {
      name: 'bitbucket_create_pr',
      description: 'Create a pull request in Bitbucket.',
      input_schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          sourceBranch: { type: 'string' },
          destinationBranch: { type: 'string' },
          reviewers: { type: 'array', items: { type: 'string' } },
        },
        required: ['title', 'sourceBranch'],
      },
    execute: createPullRequest as any,
  },
    {
      name: 'bitbucket_get_pr',
      description: 'Get details of a pull request.',
      input_schema: {
        type: 'object',
        properties: { prId: { type: 'string' } },
        required: ['prId'],
      },
    execute: getPullRequest as any,
  },
    {
      name: 'bitbucket_get_pr_diff',
      description: 'Get the diff/changeset of a pull request for code review.',
      input_schema: {
        type: 'object',
        properties: { prId: { type: 'string' } },
        required: ['prId'],
      },
    execute: getPullRequestDiff as any,
  },
    {
      name: 'bitbucket_add_pr_comment',
      description: 'Add a comment to a pull request, optionally on a specific file and line.',
      input_schema: {
        type: 'object',
        properties: {
          prId: { type: 'string' },
          comment: { type: 'string' },
          filePath: { type: 'string', description: 'File path for inline comment' },
          lineNumber: { type: 'number', description: 'Line number for inline comment' },
        },
        required: ['prId', 'comment'],
      },
    execute: addPRComment as any,
  },
    {
      name: 'bitbucket_approve_pr',
      description: 'Approve a pull request.',
      input_schema: {
        type: 'object',
        properties: { prId: { type: 'string' } },
        required: ['prId'],
      },
    execute: approvePR as any,
  },
    {
      name: 'bitbucket_get_commits',
      description: 'Get recent commits, optionally for a specific branch.',
      input_schema: {
        type: 'object',
        properties: {
          branch: { type: 'string' },
          maxResults: { type: 'number' },
        },
      },
    execute: getCommits as any,
  },
];

export default bitbucketTools;
