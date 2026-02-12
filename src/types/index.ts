// ============================================================================
// NISHI Type Definitions
// ============================================================================

// ── Configuration Types ─────────────────────────────────────────────────────

export interface LLMConfig {
  provider: string;
  apiKey: string;
  model: string;
  maxTokens: number;
  baseUrl: string;
}

export interface JiraConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
  projectKey: string;
}

export interface ConfluenceConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
  spaceKey: string;
}

export interface BitbucketConfig {
  baseUrl: string;
  username: string;
  appPassword: string;
  workspace: string;
  repoSlug: string;
}

export interface MCPServer {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface MCPConfig {
  servers: MCPServer[];
}

export interface RepoConfig {
  localPath: string;
}

export interface SkillsConfig {
  directory: string;
}

export interface AgentConfig {
  maxIterations: number;
  verbose: boolean;
}

export interface Config {
  llm: LLMConfig;
  jira: JiraConfig;
  confluence: ConfluenceConfig;
  bitbucket: BitbucketConfig;
  mcp: MCPConfig;
  repo: RepoConfig;
  skills: SkillsConfig;
  agent: AgentConfig;
}

// ── LLM Types ───────────────────────────────────────────────────────────────

export interface Message {
  role: 'user' | 'assistant';
  content: string | ContentBlock[];
}

export interface ContentBlock {
  type: 'text' | 'tool_use' | 'tool_result';
  text?: string;
  id?: string;
  name?: string;
  input?: unknown;
  tool_use_id?: string;
  content?: string | unknown;
  is_error?: boolean;
}

export interface ToolUseBlock extends ContentBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: unknown;
}

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface LLMCallOptions {
  systemPrompt: string;
  messages: Message[];
  tools?: ToolDefinition[];
  maxTokens?: number;
}

export interface LLMResponse {
  id: string;
  type: string;
  role: string;
  content: ContentBlock[];
  model: string;
  stop_reason: string;
  stop_sequence?: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

// ── Tool Types ──────────────────────────────────────────────────────────────

export interface ToolInput {
  [key: string]: unknown;
}

export interface ToolOutput {
  success: boolean;
  data?: unknown;
  error?: string;
  message?: string;
}

export interface Tool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
  execute: (input: ToolInput) => Promise<ToolOutput>;
}

export interface ToolRegistry {
  tools: Map<string, Tool>;
  register: (tool: Tool) => void;
  registerAll: (tools: Tool[]) => void;
  get: (name: string) => Tool | undefined;
  getAll: () => Tool[];
  getDefinitions: () => ToolDefinition[];
}

// ── Vault Types ─────────────────────────────────────────────────────────────

export interface VaultSecrets {
  [key: string]: string;
}

export interface VaultLoadResult {
  source: 'vault' | 'env';
  secrets: string[];
}

export interface VaultOptions {
  vaultPassword?: string;
  fallbackToEnv?: boolean;
  warnOnFallback?: boolean;
}

// ── Jira Types ──────────────────────────────────────────────────────────────

export interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    description?: string;
    status: {
      name: string;
    };
    assignee?: {
      displayName: string;
      emailAddress: string;
    };
    reporter?: {
      displayName: string;
      emailAddress: string;
    };
    created: string;
    updated: string;
    priority?: {
      name: string;
    };
    issuetype: {
      name: string;
    };
    [key: string]: unknown;
  };
}

export interface JiraSearchResult {
  issues: JiraIssue[];
  total: number;
  maxResults: number;
  startAt: number;
}

export interface JiraCreateIssueInput {
  summary: string;
  description?: string;
  issueType?: string;
  priority?: string;
  assignee?: string;
  labels?: string[];
}

// ── Confluence Types ────────────────────────────────────────────────────────

export interface ConfluencePage {
  id: string;
  type: string;
  status: string;
  title: string;
  body?: {
    storage?: {
      value: string;
      representation: string;
    };
  };
  version?: {
    number: number;
  };
  _links?: {
    webui?: string;
  };
}

export interface ConfluenceSearchResult {
  results: ConfluencePage[];
  size: number;
  totalSize: number;
}

// ── Bitbucket Types ─────────────────────────────────────────────────────────

export interface BitbucketRepository {
  uuid: string;
  name: string;
  slug: string;
  description?: string;
  is_private: boolean;
  created_on: string;
  updated_on: string;
}

export interface BitbucketPullRequest {
  id: number;
  title: string;
  description?: string;
  state: string;
  author: {
    display_name: string;
  };
  source: {
    branch: {
      name: string;
    };
  };
  destination: {
    branch: {
      name: string;
    };
  };
  created_on: string;
  updated_on: string;
}

export interface BitbucketCommit {
  hash: string;
  message: string;
  author: {
    raw: string;
  };
  date: string;
}

// ── Agent Types ─────────────────────────────────────────────────────────────

export interface SubAgent {
  name: string;
  description: string;
  systemPrompt: string;
  tools: string[];
  maxIterations?: number;
}

export interface AgentContext {
  messages: Message[];
  tools: Tool[];
  iteration: number;
  maxIterations: number;
}

export interface AgentResult {
  success: boolean;
  output: string;
  iterations: number;
  error?: string;
}

// ── HTTP Types ──────────────────────────────────────────────────────────────

export interface HttpRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  auth?: {
    username: string;
    password: string;
  };
}

export interface HttpResponse<T = unknown> {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: T;
}

// ── Logger Types ────────────────────────────────────────────────────────────

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  agent: (name: string, ...args: unknown[]) => void;
  tool: (name: string, ...args: unknown[]) => void;
  success: (...args: unknown[]) => void;
}

// ── File System Types ───────────────────────────────────────────────────────

export interface FileSearchResult {
  path: string;
  matches: Array<{
    line: number;
    content: string;
  }>;
}

export interface FileStats {
  path: string;
  size: number;
  created: Date;
  modified: Date;
  isDirectory: boolean;
  isFile: boolean;
}

// ── Skill Types ─────────────────────────────────────────────────────────────

export interface Skill {
  name: string;
  description: string;
  category: string;
  execute: (args?: string[]) => Promise<ToolOutput>;
}

export interface SkillMetadata {
  name: string;
  description: string;
  category: string;
  version?: string;
  author?: string;
}
