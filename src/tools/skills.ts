// ============================================================================
// DEVWEAVER – Skills Manager
// Learns patterns from the repo and stores reusable skills (coding standards,
// test patterns, review checklists, etc.)
// ============================================================================
import path from 'node:path';
import config from '../config.js';
import { readFile, writeFile, exists, walkDir } from '../utils/fs.js';
import logger from '../utils/logger.js';
import type { Tool } from '../types/index.js';

function skillsDir(): string {
  return path.join(config.repo.localPath, config.skills.directory);
}

// ── Handlers ────────────────────────────────────────────────────────────────

async function listSkills(): Promise<unknown> {
  const dir = skillsDir();
  if (!exists(dir)) return { skills: [], message: 'No skills directory found. Use save_skill to create one.' };
  const files = walkDir(dir, { maxDepth: 2, ignore: [] });
  const skills = files.map((f) => {
    const content = readFile(path.join(dir, f));
    const firstLine = content?.split('\n')[0] || '';
    return { file: f, title: firstLine.replace(/^#\s*/, '') };
  });
  return { skills };
}

async function getSkill(input: { skillName: string }): Promise<unknown> {
  const { skillName } = input;
  const filePath = path.join(skillsDir(), skillName.endsWith('.md') ? skillName : `${skillName}.md`);
  const content = readFile(filePath);
  if (!content) throw new Error(`Skill not found: ${skillName}`);
  return { skillName, content };
}

async function saveSkill(input: { skillName: string; content: string; category?: string }): Promise<unknown> {
  const { skillName, content, category } = input;
  const cat = category || 'general';
  const fileName = skillName.endsWith('.md') ? skillName : `${skillName}.md`;
  const filePath = path.join(skillsDir(), cat, fileName);
  writeFile(filePath, content);
  logger.success(`Saved skill: ${cat}/${fileName}`);
  return { saved: true, path: `${cat}/${fileName}` };
}

async function deleteSkill(input: { skillName: string; category?: string }): Promise<unknown> {
  const { skillName, category } = input;
  const cat = category || 'general';
  const fileName = skillName.endsWith('.md') ? skillName : `${skillName}.md`;
  const filePath = path.join(skillsDir(), cat, fileName);
  if (!exists(filePath)) throw new Error(`Skill not found: ${cat}/${fileName}`);
  const fsModule = await import('node:fs');
  fsModule.unlinkSync(filePath);
  logger.success(`Deleted skill: ${cat}/${fileName}`);
  return { deleted: true, path: `${cat}/${fileName}` };
}

// ── Tool Definitions ────────────────────────────────────────────────────────

const skillsTools: Tool[] = [
    {
      name: 'skills_list',
      description: 'List all saved DEVWEAVER skills (coding standards, review checklists, test patterns, etc.).',
      input_schema: { type: 'object', properties: {} },
    execute: listSkills as any,
  },
    {
      name: 'skills_get',
      description: 'Read a specific skill file.',
      input_schema: {
        type: 'object',
        properties: { skillName: { type: 'string' } },
        required: ['skillName'],
      },
    execute: getSkill as any,
  },
    {
      name: 'skills_save',
      description: 'Save a new or updated skill. Skills are stored as markdown files in the .nishi/skills directory. Categories: coding-standards, test-patterns, review-checklists, architecture, general.',
      input_schema: {
        type: 'object',
        properties: {
          skillName: { type: 'string', description: 'Name of the skill (will be used as filename)' },
          content: { type: 'string', description: 'Markdown content of the skill' },
          category: { type: 'string', enum: ['coding-standards', 'test-patterns', 'review-checklists', 'architecture', 'general'] },
        },
        required: ['skillName', 'content'],
      },
    execute: saveSkill as any,
  },
    {
      name: 'skills_delete',
      description: 'Delete a skill file.',
      input_schema: {
        type: 'object',
        properties: {
          skillName: { type: 'string' },
          category: { type: 'string' },
        },
        required: ['skillName'],
      },
    execute: deleteSkill as any,
  },
];

export default skillsTools;
