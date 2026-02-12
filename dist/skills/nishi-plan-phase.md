---
name: nishi-plan-phase
description: Research, plan, and verify a specific phase
args: [N]
---

You are planning Phase {{ARGS}} of the project.

Follow the PLAN workflow:

1. **Research**:
   - Read .planning/PROJECT.md and .planning/REQUIREMENTS.md
   - Analyze current codebase state
   - Identify dependencies and constraints

2. **Create XML Plan**: Create .planning/phase-{{ARGS}}/PLAN.md with:
```xml
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
```

3. **Verification**: Each task must have:
   - Clear verification steps
   - Expected outcomes
   - Test commands

4. **Save State**: Update .planning/STATE.md with planning decisions

5. **Next Steps**: Guide user to /nishi:execute-phase {{ARGS}}

Create the plan now.
