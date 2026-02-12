#!/usr/bin/env node

// ============================================================================
// NISHI - Build Skills (Commands) for Distribution
// ============================================================================

import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const DIST_SKILLS_DIR = 'dist/skills';

// Ensure dist/skills directory exists
if (!existsSync(DIST_SKILLS_DIR)) {
  mkdirSync(DIST_SKILLS_DIR, { recursive: true });
}

// Define NISHI skills (commands) that will be installed to ~/.claude/skills
const skills = [
  {
    name: 'nishi-help',
    description: 'Show all available NISHI commands and usage',
    prompt: `You are helping the user with NISHI commands.

NISHI is a meta-prompting, context engineering and spec-driven SDLC agent.

**Core Workflow Commands:**
- /nishi:new-project - Initialize new project with research and roadmap
- /nishi:discuss-phase [N] - Capture implementation decisions
- /nishi:plan-phase [N] - Research, plan, and verify phase
- /nishi:execute-phase <N> - Execute phase with atomic commits
- /nishi:verify-work [N] - User acceptance testing
- /nishi:progress - Show current status and next steps

**Quick Commands:**
- /nishi:quick <task> - Execute ad-hoc task without formal planning
- /nishi:debug - Systematic debugging with persistence

**Phase Management:**
- /nishi:add-phase - Add new phase to roadmap
- /nishi:insert-phase - Insert phase at position
- /nishi:remove-phase - Remove phase from roadmap
- /nishi:complete-phase - Mark phase as complete

**Milestone Management:**
- /nishi:new-milestone - Start new development milestone
- /nishi:complete-milestone - Complete and archive current milestone

**SDLC Integration:**
- /nishi:jira - Work with Jira issues
- /nishi:confluence - Manage Confluence pages
- /nishi:bitbucket - Interact with Bitbucket repos
- /nishi:sync-jira - Sync JIRA tickets to project roadmap

**Utilities:**
- /nishi:map-codebase - Analyze existing codebase before new work
- /nishi:settings - Configure NISHI preferences
- /nishi:update - Check for NISHI updates

Explain these commands to the user and ask what they'd like to do.`
  },
  {
    name: 'nishi-new-project',
    description: 'Initialize a new project with questioning, research, and roadmap generation',
    prompt: `You are initializing a new NISHI project.

Follow these steps:

1. **Question Phase**: Ask the user about:
   - Project goals and vision
   - Technical requirements
   - Integration needs (Jira, Confluence, Bitbucket)
   - Timeline and milestones

2. **Research Phase**:
   - Analyze any existing codebase using /nishi:map-codebase if applicable
   - Research similar projects or patterns
   - Identify technical dependencies

3. **Documentation Phase**: Create structured documentation:
   - Create .planning/PROJECT.md with vision and direction
   - Create .planning/REQUIREMENTS.md with scoped requirements
   - Create .planning/ROADMAP.md with phases and milestones
   - Create .planning/STATE.md for decisions and memory

4. **Roadmap Generation**: Break work into phases:
   - Each phase should have clear deliverables
   - Include verification criteria
   - Estimate complexity (not time)

5. **Next Steps**: Guide user to:
   - Review the roadmap
   - Run /nishi:discuss-phase 1 to start first phase

Create the project structure and documentation now.`
  },
  {
    name: 'nishi-quick',
    description: 'Execute quick ad-hoc task without formal planning',
    args: '<task>',
    prompt: `You are executing a quick task for the user.

The user wants to: {{ARGS}}

This is a QUICK task - no formal planning needed. Just:
1. Understand what needs to be done
2. Execute it efficiently
3. Verify it works
4. Make ONE atomic git commit if code changed

For quick tasks:
- Don't create elaborate plans
- Don't overthink - just do it
- Keep it focused and fast
- Use existing patterns in the codebase

Execute the task now.`
  },
  {
    name: 'nishi-progress',
    description: 'Show current project progress and next steps',
    prompt: `You are showing the user their current NISHI progress.

1. Read .planning/ROADMAP.md to see all phases
2. Read .planning/STATE.md to see current state
3. Identify:
   - Current phase
   - Completed phases (✓)
   - Pending phases
   - Any blockers

4. Show progress summary:
   - What's complete
   - What's in progress
   - What's next
   - Recommended next command

5. Be encouraging and clear about next steps.

Show the progress now.`
  },
  {
    name: 'nishi-plan-phase',
    description: 'Research, plan, and verify a specific phase',
    args: '[N]',
    prompt: `You are planning Phase {{ARGS}} of the project.

Follow the PLAN workflow:

1. **Research**:
   - Read .planning/PROJECT.md and .planning/REQUIREMENTS.md
   - Analyze current codebase state
   - Identify dependencies and constraints

2. **Create XML Plan**: Create .planning/phase-{{ARGS}}/PLAN.md with:
\`\`\`xml
<phase number="{{ARGS}}" name="Phase Name">
  <overview>Brief description</overview>
  <tasks>
    <task id="1" name="Task Name">
      <description>What needs to be done</description>
      <files>
        <file>path/to/file.ts</file>
      </files>
      <verification>
        <step>How to verify this task works</step>
      </verification>
    </task>
  </tasks>
</phase>
\`\`\`

3. **Verification**: Each task must have:
   - Clear verification steps
   - Expected outcomes
   - Test commands

4. **Save State**: Update .planning/STATE.md with planning decisions

5. **Next Steps**: Guide user to /nishi:execute-phase {{ARGS}}

Create the plan now.`
  },
  {
    name: 'nishi-execute-phase',
    description: 'Execute a phase with atomic commits and verification',
    args: '<N>',
    prompt: `You are executing Phase {{ARGS}}.

**EXECUTION PROTOCOL:**

1. **Read Plan**: Load .planning/phase-{{ARGS}}/PLAN.md

2. **For Each Task**:
   a. Execute task in focused manner
   b. Run verification steps
   c. If verification passes: Make ONE atomic git commit:
      \`\`\`
      git add <changed-files>
      git commit -m "feat(phase-{{ARGS}}): <task-name>

      <brief-description>

      Verification: <how-verified>"
      \`\`\`
   d. If verification fails: Debug and fix before committing

3. **Parallel Execution**:
   - Identify independent tasks
   - Execute them in parallel when possible
   - Keep context fresh (spawn sub-agents if needed)

4. **Update State**: After each task, update .planning/STATE.md

5. **Phase Completion**: When all tasks done:
   - Run full phase verification
   - Update .planning/ROADMAP.md
   - Guide user to /nishi:verify-work {{ARGS}}

**CRITICAL**:
- ONE commit per task
- NO commits until verification passes
- Clear commit messages with verification proof

Execute the phase now.`
  },
  {
    name: 'nishi-jira',
    description: 'Work with Jira issues',
    args: '[command]',
    prompt: `You are helping with Jira integration.

Available Jira operations:
- List issues in current sprint
- Create new issue
- Update issue status
- Add comments
- Get issue details
- Sync to roadmap

Use the jira_* tools to interact with Jira.

What would you like to do?`
  },
  {
    name: 'nishi-map-codebase',
    description: 'Analyze existing codebase structure and patterns',
    prompt: `You are mapping the codebase for NISHI.

**Mapping Protocol:**

1. **Architecture Analysis**:
   - Identify main directories and their purposes
   - Find entry points
   - Map dependencies

2. **Pattern Recognition**:
   - Coding conventions
   - Common patterns
   - Testing approach
   - Build system

3. **Technology Stack**:
   - Languages and frameworks
   - Key dependencies
   - Infrastructure

4. **Documentation**: Create .planning/CODEBASE.md with:
   - Architecture diagram (text-based)
   - File organization
   - Key patterns to follow
   - Areas of technical debt

5. **Integration Points**:
   - Where SDLC tools are used
   - Configuration locations
   - Extension points

Map the codebase now and save to .planning/CODEBASE.md.`
  },
  {
    name: 'nishi-add-phase',
    description: 'Add a new phase to the roadmap',
    args: '<name> <description>',
    prompt: `You are adding a new phase to the NISHI roadmap.

**Usage:** /nishi:add-phase "Phase Name" "Description of what this phase will achieve"

**Implementation:**

The user wants to add a new phase. Extract:
1. Phase name from the first argument
2. Phase description from the second argument (or ask if not provided)

Then use the documentation management utilities to add the phase:

\`\`\`typescript
import { addPhase } from '../utils/docs.js';

// Add the phase
addPhase(phaseName, phaseDescription);
\`\`\`

The system will:
- Automatically assign the next phase number
- Add it to the current milestone
- Update ROADMAP.md
- Log the change in STATE.md

Confirm to the user what phase was added and its number.`
  },
  {
    name: 'nishi-insert-phase',
    description: 'Insert a phase at a specific position',
    args: '<position> <name> <description>',
    prompt: `You are inserting a phase at a specific position in the NISHI roadmap.

**Usage:** /nishi:insert-phase 3 "Phase Name" "Description"

**Implementation:**

Extract:
1. Position (number) - where to insert
2. Phase name
3. Phase description

Then use the documentation management utilities:

\`\`\`typescript
import { insertPhase } from '../utils/docs.js';

// Insert the phase
insertPhase(position, phaseName, phaseDescription);
\`\`\`

The system will:
- Insert the phase at the specified position
- Renumber all subsequent phases
- Update ROADMAP.md
- Log the change in STATE.md

Confirm the insertion to the user.`
  },
  {
    name: 'nishi-remove-phase',
    description: 'Remove a phase from the roadmap',
    args: '<phase-number>',
    prompt: `You are removing a phase from the NISHI roadmap.

**Usage:** /nishi:remove-phase 3

**Implementation:**

Extract the phase number to remove.

**IMPORTANT:** Warn the user if the phase is in-progress or completed!

Then use the documentation management utilities:

\`\`\`typescript
import { removePhase } from '../utils/docs.js';

// Remove the phase
removePhase(phaseNumber);
\`\`\`

The system will:
- Remove the specified phase
- Renumber remaining phases
- Update ROADMAP.md
- Log the change in STATE.md

Confirm the removal to the user.`
  },
  {
    name: 'nishi-complete-phase',
    description: 'Mark a phase as completed',
    args: '[phase-number]',
    prompt: `You are marking a phase as completed in NISHI.

**Usage:** /nishi:complete-phase [N]

If no phase number provided, use the current phase from ROADMAP.md.

**Implementation:**

\`\`\`typescript
import { completePhase, readRoadmap } from '../utils/docs.js';

// Get phase number (from args or current phase)
const roadmap = readRoadmap();
const phaseNumber = providedNumber || roadmap.currentPhase;

// Complete the phase
completePhase(phaseNumber);
\`\`\`

The system will:
- Mark the phase as completed (✓)
- Move currentPhase to next pending phase
- Update ROADMAP.md
- Log completion in STATE.md

**Before completing:**
- Verify all tasks in the phase are done
- Verify all commits are made
- Verify tests pass

Congratulate the user and guide them to the next phase!`
  },
  {
    name: 'nishi-new-milestone',
    description: 'Start a new development milestone',
    args: '<name> <version>',
    prompt: `You are creating a new development milestone in NISHI.

**Usage:** /nishi:new-milestone "Milestone Name" "v1.0.0"

**Implementation:**

1. Ask the user about the milestone:
   - Name (e.g., "MVP Release", "Beta Launch")
   - Version (e.g., "v1.0.0", "v2.0.0")
   - What phases should be included?

2. Gather initial phases:
   - Ask user to describe 3-5 phases
   - Each phase needs: name and description

3. Create the milestone:

\`\`\`typescript
import { newMilestone } from '../utils/docs.js';

const initialPhases = [
  { name: 'Foundation', description: 'Set up core infrastructure' },
  { name: 'Features', description: 'Implement main features' },
  { name: 'Polish', description: 'Testing and refinement' },
];

newMilestone(milestoneName, version, initialPhases);
\`\`\`

The system will:
- Create new milestone with phases
- Set as current milestone
- Update ROADMAP.md
- Log decision in STATE.md

Guide user to start Phase 1 with /nishi:plan-phase 1`
  },
  {
    name: 'nishi-complete-milestone',
    description: 'Complete and archive current milestone',
    args: '[version]',
    prompt: `You are completing and archiving a milestone in NISHI.

**Usage:** /nishi:complete-milestone [version]

If no version provided, use current milestone.

**Pre-flight Checks:**

1. Verify ALL phases are completed:
   - Read ROADMAP.md
   - Check each phase status
   - If any incomplete, list them and stop

2. Run final verification:
   - All tests pass
   - All documentation updated
   - No open blockers in STATE.md

**Implementation:**

\`\`\`typescript
import { completeMilestone } from '../utils/docs.js';

// Complete and archive the milestone
completeMilestone(version);
\`\`\`

The system will:
- Archive all phase plans to .planning/archive/{version}/
- Create milestone SUMMARY.md
- Update STATE.md
- Prepare for next milestone

**Post-completion:**
- Congratulate the user! 🎉
- Suggest creating a git tag: \`git tag {version}\`
- Suggest next milestone: /nishi:new-milestone

**IMPORTANT:** This archives work. Make sure everything is committed and pushed!`
  },
  {
    name: 'nishi-settings',
    description: 'Configure NISHI preferences',
    prompt: `You are configuring NISHI settings.

Read current settings from .planning/config.json (create if missing).

**Available Settings:**

\`\`\`json
{
  "mode": "interactive",  // "interactive" or "yolo" (auto-approve)
  "depth": "standard",    // "quick", "standard", or "comprehensive"
  "profile": "balanced",  // "quality", "balanced", or "budget"
  "agents": {
    "research": true,
    "planning": true,
    "verification": true
  },
  "git": {
    "autoCommit": true,
    "commitPrefix": "feat"
  },
  "sdlc": {
    "jira": {
      "enabled": true,
      "project": "PROJ"
    },
    "confluence": {
      "enabled": true,
      "space": "TEAM"
    },
    "bitbucket": {
      "enabled": true,
      "workspace": "myworkspace"
    }
  }
}
\`\`\`

Show current settings and ask what user wants to change.`
  }
];

// Write each skill file
for (const skill of skills) {
  const filename = `${skill.name}.md`;
  const content = `---
name: ${skill.name}
description: ${skill.description}${skill.args ? `\nargs: ${skill.args}` : ''}
---

${skill.prompt}
`;

  writeFileSync(join(DIST_SKILLS_DIR, filename), content);
  console.log(`✓ Built skill: ${filename}`);
}

console.log(`\n✓ Successfully built ${skills.length} skills to ${DIST_SKILLS_DIR}/`);
