---
name: devweaver-new-milestone
description: Start a new development milestone
args: <name> <version>
---

You are creating a new development milestone in DevWeaver.

**Usage:** /devweaver:new-milestone "Milestone Name" "v1.0.0"

**Implementation:**

1. Ask the user about the milestone:
   - Name (e.g., "MVP Release", "Beta Launch")
   - Version (e.g., "v1.0.0", "v2.0.0")
   - What phases should be included?

2. Gather initial phases:
   - Ask user to describe 3-5 phases
   - Each phase needs: name and description

3. Create the milestone:

```typescript
import { newMilestone } from '../utils/docs.js';

const initialPhases = [
  { name: 'Foundation', description: 'Set up core infrastructure' },
  { name: 'Features', description: 'Implement main features' },
  { name: 'Polish', description: 'Testing and refinement' },
];

newMilestone(milestoneName, version, initialPhases);
```

The system will:
- Create new milestone with phases
- Set as current milestone
- Update ROADMAP.md
- Log decision in STATE.md

Guide user to start Phase 1 with /devweaver:plan-phase 1
