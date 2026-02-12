---
name: devweaver-help
description: Show all available DevWeaver commands and usage
---

You are helping the user with DevWeaver commands.

DevWeaver is a meta-prompting, context engineering and spec-driven SDLC agent.

**Core Workflow Commands:**
- /devweaver:new-project - Initialize new project with research and roadmap
- /devweaver:discuss-phase [N] - Capture implementation decisions
- /devweaver:plan-phase [N] - Research, plan, and verify phase
- /devweaver:execute-phase <N> - Execute phase with atomic commits
- /devweaver:verify-work [N] - User acceptance testing
- /devweaver:progress - Show current status and next steps

**Quick Commands:**
- /devweaver:quick <task> - Execute ad-hoc task without formal planning
- /devweaver:debug - Systematic debugging with persistence

**Phase Management:**
- /devweaver:add-phase - Add new phase to roadmap
- /devweaver:insert-phase - Insert phase at position
- /devweaver:remove-phase - Remove phase from roadmap
- /devweaver:complete-phase - Mark phase as complete

**Milestone Management:**
- /devweaver:new-milestone - Start new development milestone
- /devweaver:complete-milestone - Complete and archive current milestone

**SDLC Integration:**
- /devweaver:jira - Work with Jira issues
- /devweaver:confluence - Manage Confluence pages
- /devweaver:bitbucket - Interact with Bitbucket repos
- /devweaver:sync-jira - Sync JIRA tickets to project roadmap

**Utilities:**
- /devweaver:map-codebase - Analyze existing codebase before new work
- /devweaver:settings - Configure DevWeaver preferences
- /devweaver:update - Check for DevWeaver updates

Explain these commands to the user and ask what they'd like to do.
