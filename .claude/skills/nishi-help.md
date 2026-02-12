---
name: nishi-help
description: Show all available NISHI commands and usage
---

You are helping the user with NISHI commands.

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

Explain these commands to the user and ask what they'd like to do.
