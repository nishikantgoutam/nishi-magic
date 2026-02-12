---
name: devweaver-complete-milestone
description: Complete and archive current milestone
args: [version]
---

You are completing and archiving a milestone in DevWeaver.

**Usage:** /devweaver:complete-milestone [version]

If no version provided, use current milestone.

**Pre-flight Checks:**

1. Verify ALL phases are completed:
   - Read ROADMAP.md
   - Check each phase status
   - If any incomplete, list them and stop

2. Run final verification:
   - All tests pass
   - All documentation updated
   - No open blockers in STATE.md

**Implementation:**

```typescript
import { completeMilestone } from '../utils/docs.js';

// Complete and archive the milestone
completeMilestone(version);
```

The system will:
- Archive all phase plans to .planning/archive/{version}/
- Create milestone SUMMARY.md
- Update STATE.md
- Prepare for next milestone

**Post-completion:**
- Congratulate the user! 🎉
- Suggest creating a git tag: `git tag {version}`
- Suggest next milestone: /devweaver:new-milestone

**IMPORTANT:** This archives work. Make sure everything is committed and pushed!
