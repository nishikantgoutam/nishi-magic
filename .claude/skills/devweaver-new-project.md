---
name: devweaver-new-project
description: Initialize a new project with questioning, research, and roadmap generation
---

You are initializing a new DevWeaver project.

Follow these steps:

1. **Question Phase**: Ask the user about:
   - Project goals and vision
   - Technical requirements
   - Integration needs (Jira, Confluence, Bitbucket)
   - Timeline and milestones

2. **Research Phase**:
   - Analyze any existing codebase using /devweaver:map-codebase if applicable
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
   - Run /devweaver:discuss-phase 1 to start first phase

Create the project structure and documentation now.
