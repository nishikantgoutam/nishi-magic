// ============================================================================
// NISHI – Jira Tools
// ============================================================================
import { request } from '../utils/http.js';
import config from '../config.js';
import logger from '../utils/logger.js';
import type { Tool } from '../types/index.js';

interface CreateIssueInput {
  summary: string;
  description?: string;
  issueType?: string;
  projectKey?: string;
  parentKey?: string;
  labels?: string[];
  priority?: string;
  assignee?: string;
  storyPoints?: number;
}

interface UpdateIssueInput {
  issueKey: string;
  summary?: string;
  description?: string;
  labels?: string[];
  priority?: string;
  assignee?: string;
  storyPoints?: number;
}

function authHeaders(): Record<string, string> {
  const token = Buffer.from(`${config.jira.email}:${config.jira.apiToken}`).toString('base64');
  return {
    Authorization: `Basic ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

function apiUrl(path: string): string {
  return `${config.jira.baseUrl}/rest/api/3/${path}`;
}

// ── Handlers ────────────────────────────────────────────────────────────────

async function createIssue(input: CreateIssueInput): Promise<unknown> {
  const { summary, description, issueType, projectKey, parentKey, labels, priority, assignee, storyPoints } = input;
  const fields: Record<string, unknown> = {
    project: { key: projectKey || config.jira.projectKey },
    summary,
    issuetype: { name: issueType || 'Task' },
  };
  if (description) {
    fields.description = {
      type: 'doc', version: 1,
      content: [{ type: 'paragraph', content: [{ type: 'text', text: description }] }],
    };
  }
  if (parentKey) fields.parent = { key: parentKey };
  if (labels) fields.labels = labels;
  if (priority) fields.priority = { name: priority };
  if (assignee) fields.assignee = { accountId: assignee };
  if (storyPoints) fields.story_points = storyPoints;

  const res = await request(apiUrl('issue'), { method: 'POST', headers: authHeaders(), body: { fields } });
  if (res.status >= 300) throw new Error(`Jira createIssue error: ${JSON.stringify(res.data)}`);
  logger.success(`Created Jira issue ${(res.data as { key: string }).key}`);
  return res.data;
}

async function getIssue(input: { issueKey: string }): Promise<unknown> {
  const { issueKey } = input;
  const res = await request(apiUrl(`issue/${issueKey}`), { method: 'GET', headers: authHeaders() });
  if (res.status >= 300) throw new Error(`Jira getIssue error: ${JSON.stringify(res.data)}`);
  return res.data;
}

async function updateIssue(input: UpdateIssueInput): Promise<unknown> {
  const { issueKey, summary, description, labels, priority, assignee, storyPoints } = input;
  const fields: Record<string, unknown> = {};
  if (summary) fields.summary = summary;
  if (description) {
    fields.description = {
      type: 'doc', version: 1,
      content: [{ type: 'paragraph', content: [{ type: 'text', text: description }] }],
    };
  }
  if (labels) fields.labels = labels;
  if (priority) fields.priority = { name: priority };
  if (assignee) fields.assignee = { accountId: assignee };
  if (storyPoints) fields.story_points = storyPoints;

  const res = await request(apiUrl(`issue/${issueKey}`), { method: 'PUT', headers: authHeaders(), body: { fields } });
  if (res.status >= 300) throw new Error(`Jira updateIssue error: ${JSON.stringify(res.data)}`);
  logger.success(`Updated Jira issue ${issueKey}`);
  return { success: true, issueKey };
}

async function addComment(input: { issueKey: string; comment: string }): Promise<unknown> {
  const { issueKey, comment } = input;
  const body = {
    body: {
      type: 'doc', version: 1,
      content: [{ type: 'paragraph', content: [{ type: 'text', text: comment }] }],
    },
  };
  const res = await request(apiUrl(`issue/${issueKey}/comment`), { method: 'POST', headers: authHeaders(), body });
  if (res.status >= 300) throw new Error(`Jira addComment error: ${JSON.stringify(res.data)}`);
  logger.success(`Added comment to ${issueKey}`);
  return res.data;
}

async function transitionIssue(input: { issueKey: string; transitionName: string }): Promise<unknown> {
  const { issueKey, transitionName } = input;
  // First, fetch available transitions
  const trRes = await request(apiUrl(`issue/${issueKey}/transitions`), { method: 'GET', headers: authHeaders() });
  if (trRes.status >= 300) throw new Error(`Jira transitions error: ${JSON.stringify(trRes.data)}`);

  const transition = (trRes.data as { transitions: Array<{ name: string; id: string }> }).transitions.find(
    (t) => t.name.toLowerCase() === transitionName.toLowerCase()
  );
  if (!transition) {
    const available = (trRes.data as { transitions: Array<{ name: string }> }).transitions.map((t) => t.name).join(', ');
    throw new Error(`Transition "${transitionName}" not found. Available: ${available}`);
  }

  const res = await request(apiUrl(`issue/${issueKey}/transitions`), {
    method: 'POST', headers: authHeaders(), body: { transition: { id: transition.id } },
  });
  if (res.status >= 300) throw new Error(`Jira transitionIssue error: ${JSON.stringify(res.data)}`);
  logger.success(`Transitioned ${issueKey} → ${transitionName}`);
  return { success: true, issueKey, newStatus: transitionName };
}

async function searchIssues(input: { jql: string; maxResults?: number }): Promise<unknown> {
  const { jql, maxResults } = input;
  const res = await request(apiUrl(`search?jql=${encodeURIComponent(jql)}&maxResults=${maxResults || 20}`), {
    method: 'GET', headers: authHeaders(),
  });
  if (res.status >= 300) throw new Error(`Jira search error: ${JSON.stringify(res.data)}`);
  return res.data;
}

async function addSubtask(input: { parentKey: string; summary: string; description?: string }): Promise<unknown> {
  return createIssue({
    summary: input.summary,
    description: input.description,
    issueType: 'Sub-task',
    parentKey: input.parentKey,
  });
}

async function getProjectStatuses(input: { projectKey?: string }): Promise<unknown> {
  const { projectKey } = input;
  const res = await request(apiUrl(`project/${projectKey || config.jira.projectKey}/statuses`), {
    method: 'GET', headers: authHeaders(),
  });
  if (res.status >= 300) throw new Error(`Jira statuses error: ${JSON.stringify(res.data)}`);
  return res.data;
}

// ── Tool Definitions ────────────────────────────────────────────────────────

const jiraTools: Tool[] = [
  {
    name: 'jira_create_issue',
    description: 'Create a new Jira issue (Epic, Story, Task, Bug, Sub-task). Supports setting summary, description, type, parent, labels, priority, assignee.',
    input_schema: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: 'Issue title' },
        description: { type: 'string', description: 'Detailed description' },
        issueType: { type: 'string', enum: ['Epic', 'Story', 'Task', 'Bug', 'Sub-task'], description: 'Issue type' },
        projectKey: { type: 'string', description: 'Jira project key (optional, uses default)' },
        parentKey: { type: 'string', description: 'Parent issue key for Stories/Sub-tasks' },
        labels: { type: 'array', items: { type: 'string' }, description: 'Labels' },
        priority: { type: 'string', enum: ['Highest', 'High', 'Medium', 'Low', 'Lowest'] },
        assignee: { type: 'string', description: 'Assignee account ID' },
        storyPoints: { type: 'number', description: 'Story points estimate' },
      },
      required: ['summary'],
    },
    execute: createIssue as any,
  },
  {
    name: 'jira_get_issue',
    description: 'Get details of a Jira issue by key.',
    input_schema: {
      type: 'object',
      properties: { issueKey: { type: 'string', description: 'e.g. PROJ-123' } },
      required: ['issueKey'],
    },
    execute: getIssue as any,
  },
  {
    name: 'jira_update_issue',
    description: 'Update fields of an existing Jira issue.',
    input_schema: {
      type: 'object',
      properties: {
        issueKey: { type: 'string' },
        summary: { type: 'string' },
        description: { type: 'string' },
        labels: { type: 'array', items: { type: 'string' } },
        priority: { type: 'string' },
        assignee: { type: 'string' },
        storyPoints: { type: 'number' },
      },
      required: ['issueKey'],
    },
    execute: updateIssue as any,
  },
  {
    name: 'jira_add_comment',
    description: 'Add a comment to a Jira issue.',
    input_schema: {
      type: 'object',
      properties: {
        issueKey: { type: 'string' },
        comment: { type: 'string' },
      },
      required: ['issueKey', 'comment'],
    },
    execute: addComment as any,
  },
  {
    name: 'jira_transition_issue',
    description: 'Change the status of a Jira issue (e.g. To Do → In Progress → Done).',
    input_schema: {
      type: 'object',
      properties: {
        issueKey: { type: 'string' },
        transitionName: { type: 'string', description: 'Target status name' },
      },
      required: ['issueKey', 'transitionName'],
    },
    execute: transitionIssue as any,
  },
  {
    name: 'jira_search',
    description: 'Search Jira issues using JQL.',
    input_schema: {
      type: 'object',
      properties: {
        jql: { type: 'string', description: 'JQL query' },
        maxResults: { type: 'number' },
      },
      required: ['jql'],
    },
    execute: searchIssues as any,
  },
  {
    name: 'jira_add_subtask',
    description: 'Create a sub-task under a parent issue.',
    input_schema: {
      type: 'object',
      properties: {
        parentKey: { type: 'string' },
        summary: { type: 'string' },
        description: { type: 'string' },
      },
      required: ['parentKey', 'summary'],
    },
    execute: addSubtask as any,
  },
  {
    name: 'jira_get_project_statuses',
    description: 'Get available statuses/workflows for a Jira project.',
    input_schema: {
      type: 'object',
      properties: { projectKey: { type: 'string' } },
    },
    execute: getProjectStatuses as any,
  },
];

export default jiraTools;
