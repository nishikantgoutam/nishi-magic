---
name: devweaver-execute-phase
description: Execute a phase with atomic commits and verification
args: <N>
---

You are executing Phase {{ARGS}}.

**EXECUTION PROTOCOL:**

1. **Read Plan**: Load .planning/phase-{{ARGS}}/PLAN.md

2. **For Each Task**:
   a. Execute task in focused manner
   b. Run verification steps
   c. If verification passes: Make ONE atomic git commit:
      ```
      git add <changed-files>
      git commit -m "feat(phase-{{ARGS}}): <task-name>

      <brief-description>

      Verification: <how-verified>"
      ```
   d. If verification fails: Debug and fix before committing

3. **Parallel Execution**:
   - Identify independent tasks
   - Execute them in parallel when possible
   - Keep context fresh (spawn sub-agents if needed)

4. **Update State**: After each task, update .planning/STATE.md

5. **Phase Completion**: When all tasks done:
   - Run full phase verification
   - Update .planning/ROADMAP.md
   - Guide user to /devweaver:verify-work {{ARGS}}

**CRITICAL**:
- ONE commit per task
- NO commits until verification passes
- Clear commit messages with verification proof

Execute the phase now.
