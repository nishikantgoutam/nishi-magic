---
name: nishi-remove-phase
description: Remove a phase from the roadmap
args: <phase-number>
---

You are removing a phase from the NISHI roadmap.

**Usage:** /nishi:remove-phase 3

**Implementation:**

Extract the phase number to remove.

**IMPORTANT:** Warn the user if the phase is in-progress or completed!

Then use the documentation management utilities:

```typescript
import { removePhase } from '../utils/docs.js';

// Remove the phase
removePhase(phaseNumber);
```

The system will:
- Remove the specified phase
- Renumber remaining phases
- Update ROADMAP.md
- Log the change in STATE.md

Confirm the removal to the user.
