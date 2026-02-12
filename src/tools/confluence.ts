// ============================================================================
// DEVWEAVER – Confluence Tools
// ============================================================================
import { request } from '../utils/http.js';
import config from '../config.js';
import logger from '../utils/logger.js';
import type { Tool } from '../types/index.js';

function authHeaders(): Record<string, string> {
  const token = Buffer.from(`${config.confluence.email}:${config.confluence.apiToken}`).toString('base64');
  return {
    Authorization: `Basic ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

function apiUrl(path: string): string {
  return `${config.confluence.baseUrl}/rest/api/${path}`;
}

// ── Handlers ────────────────────────────────────────────────────────────────

async function getPage(input: { pageId: string; expand?: string }): Promise<unknown> {
  const { pageId, expand } = input;
  const exp = expand || 'body.storage,version,space,ancestors';
  const res = await request(apiUrl(`content/${pageId}?expand=${exp}`), {
    method: 'GET', headers: authHeaders(),
  });
  if (res.status >= 300) throw new Error(`Confluence getPage error: ${JSON.stringify(res.data)}`);
  return res.data;
}

async function searchPages(input: { query: string; spaceKey?: string; maxResults?: number }): Promise<unknown> {
  const { query, spaceKey, maxResults } = input;
  let cql = `type=page AND text~"${query}"`;
  if (spaceKey || config.confluence.spaceKey) {
    cql += ` AND space="${spaceKey || config.confluence.spaceKey}"`;
  }
  const res = await request(apiUrl(`content/search?cql=${encodeURIComponent(cql)}&limit=${maxResults || 10}`), {
    method: 'GET', headers: authHeaders(),
  });
  if (res.status >= 300) throw new Error(`Confluence search error: ${JSON.stringify(res.data)}`);
  return res.data;
}

async function createPage(input: { title: string; body: string; spaceKey?: string; parentId?: string }): Promise<unknown> {
  const { title, body, spaceKey, parentId } = input;
  const payload: Record<string, unknown> = {
    type: 'page',
    title,
    space: { key: spaceKey || config.confluence.spaceKey },
    body: {
      storage: { value: body, representation: 'storage' },
    },
  };
  if (parentId) {
    payload.ancestors = [{ id: parentId }];
  }
  const res = await request(apiUrl('content'), { method: 'POST', headers: authHeaders(), body: payload });
  if (res.status >= 300) throw new Error(`Confluence createPage error: ${JSON.stringify(res.data)}`);
  logger.success(`Created Confluence page: ${(res.data as { title: string; id: string }).title} (${(res.data as { title: string; id: string }).id})`);
  return res.data;
}

async function updatePage(input: { pageId: string; title?: string; body: string; versionComment?: string }): Promise<unknown> {
  const { pageId, title, body, versionComment } = input;
  // Get current version
  const current = await getPage({ pageId, expand: 'version' });
  const newVersion = ((current as { version: { number: number } }).version.number || 0) + 1;

  const payload = {
    type: 'page',
    title: title || (current as { title: string }).title,
    version: { number: newVersion, message: versionComment || 'Updated by DEVWEAVER' },
    body: {
      storage: { value: body, representation: 'storage' },
    },
  };

  const res = await request(apiUrl(`content/${pageId}`), { method: 'PUT', headers: authHeaders(), body: payload });
  if (res.status >= 300) throw new Error(`Confluence updatePage error: ${JSON.stringify(res.data)}`);
  logger.success(`Updated Confluence page: ${pageId} → v${newVersion}`);
  return res.data;
}

async function deletePage(input: { pageId: string }): Promise<unknown> {
  const { pageId } = input;
  const res = await request(apiUrl(`content/${pageId}`), { method: 'DELETE', headers: authHeaders() });
  if (res.status >= 300) throw new Error(`Confluence deletePage error: ${JSON.stringify(res.data)}`);
  logger.success(`Deleted Confluence page: ${pageId}`);
  return { success: true, pageId };
}

async function addComment(input: { pageId: string; comment: string }): Promise<unknown> {
  const { pageId, comment } = input;
  const payload = {
    type: 'comment',
    container: { id: pageId, type: 'page' },
    body: {
      storage: { value: `<p>${comment}</p>`, representation: 'storage' },
    },
  };
  const res = await request(apiUrl('content'), { method: 'POST', headers: authHeaders(), body: payload });
  if (res.status >= 300) throw new Error(`Confluence addComment error: ${JSON.stringify(res.data)}`);
  logger.success(`Added comment to Confluence page ${pageId}`);
  return res.data;
}

async function mergePages(input: { sourcePageIds: string[]; targetPageId: string; mergeStrategy?: string }): Promise<unknown> {
  const { sourcePageIds, targetPageId, mergeStrategy } = input;
  const strategy = mergeStrategy || 'append';

  // Fetch all source pages
  const sources = [];
  for (const pid of sourcePageIds) {
    const page = await getPage({ pageId: pid, expand: 'body.storage,version' });
    sources.push(page);
  }

  // Fetch target
  const target = await getPage({ pageId: targetPageId, expand: 'body.storage,version' });
  let targetBody = (target as { body: { storage: { value: string } } }).body.storage.value;

  // Merge
  for (const src of sources) {
    const srcBody = (src as { body: { storage: { value: string } }; title: string }).body.storage.value;
    const divider = `<hr /><h2>Merged from: ${(src as { title: string }).title}</h2>`;
    if (strategy === 'prepend') {
      targetBody = divider + srcBody + targetBody;
    } else {
      targetBody = targetBody + divider + srcBody;
    }
  }

  const result = await updatePage({
    pageId: targetPageId,
    body: targetBody,
    versionComment: `Merged ${sourcePageIds.length} pages via DEVWEAVER`,
  });

  return result;
}

async function getPageChildren(input: { pageId: string; maxResults?: number }): Promise<unknown> {
  const { pageId, maxResults } = input;
  const res = await request(
    apiUrl(`content/${pageId}/child/page?limit=${maxResults || 25}&expand=version`),
    { method: 'GET', headers: authHeaders() }
  );
  if (res.status >= 300) throw new Error(`Confluence getChildren error: ${JSON.stringify(res.data)}`);
  return res.data;
}

// ── Tool Definitions ────────────────────────────────────────────────────────

const confluenceTools: Tool[] = [
  {
      name: 'confluence_get_page',
      description: 'Get a Confluence page by ID with its content.',
      input_schema: {
        type: 'object',
        properties: {
          pageId: { type: 'string' },
          expand: { type: 'string', description: 'Comma-separated expansions' },
        },
        required: ['pageId'],
      },
    execute: getPage as any,
  },
  {
      name: 'confluence_search',
      description: 'Search Confluence pages by text query.',
      input_schema: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          spaceKey: { type: 'string' },
          maxResults: { type: 'number' },
        },
        required: ['query'],
      },
    execute: searchPages as any,
  },
  {
      name: 'confluence_create_page',
      description: 'Create a new Confluence page with HTML content.',
      input_schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          body: { type: 'string', description: 'HTML/storage format body' },
          spaceKey: { type: 'string' },
          parentId: { type: 'string', description: 'Parent page ID' },
        },
        required: ['title', 'body'],
      },
    execute: createPage as any,
  },
  {
      name: 'confluence_update_page',
      description: 'Update an existing Confluence page content.',
      input_schema: {
        type: 'object',
        properties: {
          pageId: { type: 'string' },
          title: { type: 'string' },
          body: { type: 'string', description: 'New HTML/storage format body' },
          versionComment: { type: 'string' },
        },
        required: ['pageId', 'body'],
      },
    execute: updatePage as any,
  },
  {
      name: 'confluence_delete_page',
      description: 'Delete a Confluence page by ID.',
      input_schema: {
        type: 'object',
        properties: { pageId: { type: 'string' } },
        required: ['pageId'],
      },
    execute: deletePage as any,
  },
  {
      name: 'confluence_add_comment',
      description: 'Add a comment to a Confluence page.',
      input_schema: {
        type: 'object',
        properties: {
          pageId: { type: 'string' },
          comment: { type: 'string' },
        },
        required: ['pageId', 'comment'],
      },
    execute: addComment as any,
  },
  {
      name: 'confluence_merge_pages',
      description: 'Merge multiple Confluence pages into one target page.',
      input_schema: {
        type: 'object',
        properties: {
          sourcePageIds: { type: 'array', items: { type: 'string' } },
          targetPageId: { type: 'string' },
          mergeStrategy: { type: 'string', enum: ['append', 'prepend'] },
        },
        required: ['sourcePageIds', 'targetPageId'],
      },
    execute: mergePages as any,
  },
  {
      name: 'confluence_get_children',
      description: 'Get child pages of a Confluence page.',
      input_schema: {
        type: 'object',
        properties: {
          pageId: { type: 'string' },
          maxResults: { type: 'number' },
        },
        required: ['pageId'],
      },
    execute: getPageChildren as any,
  },
];

export default confluenceTools;
