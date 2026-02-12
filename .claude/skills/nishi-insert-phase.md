---
name: nishi-insert-phase
description: Insert a phase at a specific position
args: <position> <name> <description>
---

You are inserting a phase at a specific position in the NISHI roadmap.

**Usage:** /nishi:insert-phase 3 "Phase Name" "Description"

**Implementation:**

Extract:
1. Position (number) - where to insert
2. Phase name
3. Phase description

Then use the documentation management utilities:

```typescript
import { insertPhase } from '../utils/docs.js';

// Insert the phase
insertPhase(position, phaseName, phaseDescription);
```

The system will:
- Insert the phase at the specified position
- Renumber all subsequent phases
- Update ROADMAP.md
- Log the change in STATE.md

Confirm the insertion to the user.
