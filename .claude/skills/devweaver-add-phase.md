---
name: devweaver-add-phase
description: Add a new phase to the roadmap
args: <name> <description>
---

You are adding a new phase to the DevWeaver roadmap.

**Usage:** /devweaver:add-phase "Phase Name" "Description of what this phase will achieve"

**Implementation:**

The user wants to add a new phase. Extract:
1. Phase name from the first argument
2. Phase description from the second argument (or ask if not provided)

Then use the documentation management utilities to add the phase:

```typescript
import { addPhase } from '../utils/docs.js';

// Add the phase
addPhase(phaseName, phaseDescription);
```

The system will:
- Automatically assign the next phase number
- Add it to the current milestone
- Update ROADMAP.md
- Log the change in STATE.md

Confirm to the user what phase was added and its number.
