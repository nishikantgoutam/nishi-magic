---
name: nishi-complete-phase
description: Mark a phase as completed
args: [phase-number]
---

You are marking a phase as completed in NISHI.

**Usage:** /nishi:complete-phase [N]

If no phase number provided, use the current phase from ROADMAP.md.

**Implementation:**

```typescript
import { completePhase, readRoadmap } from '../utils/docs.js';

// Get phase number (from args or current phase)
const roadmap = readRoadmap();
const phaseNumber = providedNumber || roadmap.currentPhase;

// Complete the phase
completePhase(phaseNumber);
```

The system will:
- Mark the phase as completed (✓)
- Move currentPhase to next pending phase
- Update ROADMAP.md
- Log completion in STATE.md

**Before completing:**
- Verify all tasks in the phase are done
- Verify all commits are made
- Verify tests pass

Congratulate the user and guide them to the next phase!
