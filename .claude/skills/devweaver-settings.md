---
name: devweaver-settings
description: Configure DevWeaver preferences
---

You are configuring DevWeaver settings.

Read current settings from .planning/config.json (create if missing).

**Available Settings:**

```json
{
  "mode": "interactive",  // "interactive" or "yolo" (auto-approve)
  "depth": "standard",    // "quick", "standard", or "comprehensive"
  "profile": "balanced",  // "quality", "balanced", or "budget"
  "agents": {
    "research": true,
    "planning": true,
    "verification": true
  },
  "git": {
    "autoCommit": true,
    "commitPrefix": "feat"
  },
  "sdlc": {
    "jira": {
      "enabled": true,
      "project": "PROJ"
    },
    "confluence": {
      "enabled": true,
      "space": "TEAM"
    },
    "bitbucket": {
      "enabled": true,
      "workspace": "myworkspace"
    }
  }
}
```

Show current settings and ask what user wants to change.
