# DevWeaver — Weaving Together Development Workflows

**A meta-prompting, context engineering and spec-driven SDLC agent for Claude Code, OpenCode, and Gemini CLI.**

DevWeaver prevents context rot through structured workflows, fresh executor contexts, and systematic planning. It integrates Jira, Confluence, and Bitbucket with phase-based development, atomic commits, and built-in verification.

---

## Installation

### Quick Install

```bash
npx devweaver@latest
```

### Installation Options

**Interactive Setup:**
```bash
npx devweaver@latest
```
Select your AI coding assistant (Claude Code, OpenCode, Gemini, or all) and installation scope (global or local).

**Non-Interactive:**
```bash
# Install globally for Claude Code
npx devweaver@latest --claude --global

# Install locally for all assistants
npx devweaver@latest --all --local
```

### What Gets Installed

DevWeaver installs to:
- **Global**: `~/.claude/`, `~/.opencode/`, `~/.gemini/`
- **Local**: `./.claude/`, `./.opencode/`, `./.gemini/`

Installed files:
- **Skills**: `/devweaver:*` commands (16 workflow commands)
- **Agents**: Researcher, Planner, Executor, Verifier, Debugger, Code Reviewer
- **Prompts**: System prompts for context engineering

---

## Features

### Context Engineering

DevWeaver maintains structured documentation to prevent context degradation:

- **PROJECT.md** — Vision and direction
- **REQUIREMENTS.md** — Scoped requirements with phase traceability
- **ROADMAP.md** — Progress tracking across phases and milestones
- **STATE.md** — Decisions, blockers, and session memory
- **PLAN.md** — XML-structured atomic tasks with verification steps

### Phase-Based Development

Follow a systematic workflow:
1. **Discuss** — Capture implementation decisions
2. **Plan** — Research-driven planning with verification
3. **Execute** — Parallel execution with fresh contexts
4. **Verify** — Automated acceptance testing

### Fresh Executor Contexts

Prevent context rot by spawning specialized agents in clean 200k-token contexts:
- Main session stays at 30-40% capacity
- Executors run in parallel when tasks are independent
- Each executor has full project context from documentation

### Atomic Git Commits

Every task gets its own commit immediately upon successful verification:
- Clear history for bisecting
- Rollback granularity
- Traceable changes

### Multi-Agent Orchestration

```
┌──────────────────────────────────────────────────────────────┐
│                      DevWeaver Orchestrator                       │
│              (Routes tasks to sub-agents)                     │
├──────────────────────────────────────────────────────────────┤
│                    Specialized Agents                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐    │
│  │Researcher│ │ Planner  │ │ Executor │ │  Verifier    │    │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘    │
├──────────────────────────────────────────────────────────────┤
│                      Tool Registry                            │
│  ┌────────┐ ┌────────────┐ ┌───────────┐ ┌──────┐ ┌──────┐ │
│  │  Jira  │ │ Confluence │ │ Bitbucket │ │ Code │ │Skills│ │
│  │  (8)   │ │    (8)     │ │   (10)    │ │ (9)  │ │ (4)  │ │
│  └────────┘ └────────────┘ └───────────┘ └──────┘ └──────┘ │
│  ┌──────────────────────────────────────────────────────┐    │
│  │              MCP Dynamic Tools                        │    │
│  │   (Auto-discovered from configured MCP servers)       │    │
│  └──────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

### SDLC Integration

- **Jira**: Create/update/search tickets, add comments, change status, create sub-tasks (8 tools)
- **Confluence**: Get, search, create, update, delete, merge pages, add comments (8 tools)
- **Bitbucket**: Repo info, branches, files, PRs, commits (10 tools)
- **MCP**: Auto-discover tools from MCP servers (stdio + SSE support)

### MCP Server Integration

DevWeaver provides an **MCP (Model Context Protocol) server** that exposes all DevWeaver functions as tools for Claude Code:

**Available MCP Tools (16 tools):**
- **Project**: `devweaver_init_project`
- **Phase Management**: `devweaver_add_phase`, `devweaver_insert_phase`, `devweaver_remove_phase`, `devweaver_complete_phase`
- **Milestone Management**: `devweaver_new_milestone`, `devweaver_complete_milestone`
- **Documentation**: `devweaver_read_roadmap`, `devweaver_read_state`, `devweaver_read_requirements`, `devweaver_read_project`, `devweaver_read_config`
- **State Management**: `devweaver_update_state`, `devweaver_update_config`
- **Utilities**: `devweaver_get_current_phase`, `devweaver_get_progress`

**Setup:**

1. Add to your Claude Code MCP configuration (`~/.claude/mcp-servers.json` or workspace `.claude/mcp-servers.json`):

```json
{
  "mcpServers": {
    "devweaver": {
      "command": "npx",
      "args": ["devweaver-mcp-server"],
      "transport": "stdio"
    }
  }
}
```

2. Restart Claude Code to load the MCP server

3. Use DevWeaver tools directly in Claude Code:

```typescript
// Claude can now use DevWeaver tools directly:
await useTool('devweaver_add_phase', {
  name: 'Setup',
  description: 'Initial project setup'
});

await useTool('devweaver_get_progress', {});
```

**Benefits:**
- ✅ **Skills provide workflow guidance** - High-level prompts and user interaction patterns
- ✅ **MCP tools provide implementation** - Direct access to all DevWeaver functions
- ✅ **Best of both worlds** - Seamless integration with consistent experience

### Skills System

Learn and reuse codebase patterns:
- **Coding Standards** — Detected patterns become enforceable rules
- **Test Patterns** — Testing approaches saved across sessions
- **Review Checklists** — Consistent code review criteria
- **Architecture** — System design patterns

### Code Review & Analysis

Comprehensive code review following industry standards:
- **Code Quality** — Readability, maintainability, complexity analysis, code smells
- **Architecture** — SOLID principles, design patterns, modularity
- **Security** — OWASP Top 10, vulnerability scanning, secret detection
- **Performance** — Bottleneck identification, optimization opportunities
- **Best Practices** — Error handling, testing, documentation, API design
- **Repository Analysis** — Understands your codebase structure and conventions
- **Actionable Reports** — Prioritized fixes with file:line references and code examples

---

## Workflow Commands

### Core Workflow

```bash
/devweaver:new-project       # Initialize with questioning, research, and roadmap
/devweaver:discuss-phase [N] # Capture implementation preferences before planning
/devweaver:plan-phase [N]    # Research, plan, and verify phase
/devweaver:execute-phase <N> # Execute with parallel tasks and atomic commits
/devweaver:verify-work [N]   # User acceptance testing with auto-debugging
/devweaver:progress          # Current status and next steps
```

### Quick Commands

```bash
/devweaver:quick <task>      # Ad-hoc task without formal planning
/devweaver:debug             # Systematic debugging with persistence
/devweaver:map-codebase      # Analyze existing architecture before new work
/devweaver:code-review       # Comprehensive code review and analysis
```

### Phase Management

```bash
/devweaver:add-phase         # Add new phase to roadmap
/devweaver:insert-phase      # Insert phase at position
/devweaver:remove-phase      # Remove phase from roadmap
/devweaver:complete-phase    # Mark phase as complete
```

### Milestone Management

```bash
/devweaver:new-milestone     # Start new development milestone
/devweaver:complete-milestone # Complete and archive current milestone
```

### Code Quality

```bash
/devweaver:code-review       # Full code review with security, performance, architecture analysis
```

### SDLC Integration

```bash
/devweaver:jira              # Work with Jira issues
/devweaver:confluence        # Manage Confluence pages
/devweaver:bitbucket         # Interact with Bitbucket repos
/devweaver:sync-jira         # Sync JIRA tickets to project roadmap
```

### Utilities

```bash
/devweaver:settings          # Configure DevWeaver preferences
/devweaver:help              # Show all commands
/devweaver:update            # Check for updates
```

---

## Configuration

### Environment Variables

Create a `.env` file (see `.env.example`):

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-...

# LLM
DEVWEAVER_LLM_MODEL=claude-sonnet-4-20250514

# Jira
JIRA_BASE_URL=https://yourcompany.atlassian.net
JIRA_EMAIL=you@company.com
JIRA_API_TOKEN=your-jira-token
JIRA_PROJECT_KEY=PROJ

# Confluence
CONFLUENCE_BASE_URL=https://yourcompany.atlassian.net/wiki
CONFLUENCE_EMAIL=you@company.com
CONFLUENCE_API_TOKEN=your-confluence-token
CONFLUENCE_SPACE_KEY=TEAM

# Bitbucket
BITBUCKET_WORKSPACE=yourworkspace
BITBUCKET_USERNAME=youruser
BITBUCKET_APP_PASSWORD=your-bitbucket-app-password
BITBUCKET_REPO_SLUG=your-repo

# Optional
DEVWEAVER_REPO_PATH=/path/to/repo
DEVWEAVER_LOG_LEVEL=info
```

### DevWeaver Settings (`.planning/config.json`)

Created automatically by `/devweaver:new-project` or `/devweaver:settings`:

```json
{
  "mode": "interactive",
  "depth": "standard",
  "profile": "balanced",
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

**Settings:**
- `mode`: `"interactive"` (ask before major actions) or `"yolo"` (auto-approve)
- `depth`: `"quick"` | `"standard"` | `"comprehensive"` — planning thoroughness
- `profile`: `"quality"` (Opus-heavy) | `"balanced"` | `"budget"` (Sonnet/Haiku)

### MCP Servers (`mcp-servers.json`)

```json
{
  "mcpServers": [
    {
      "name": "jira",
      "transport": "stdio",
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-jira"],
      "env": { "JIRA_BASE_URL": "..." }
    },
    {
      "name": "custom",
      "transport": "sse",
      "url": "http://localhost:3001"
    }
  ]
}
```

---

## Usage Examples

### Starting a New Project

```bash
# Initialize project with research and roadmap
/devweaver:new-project
```

DevWeaver will:
1. Ask about your project goals, tech stack, and requirements
2. Research similar projects and best practices
3. Create `.planning/` directory with structured docs
4. Generate phased roadmap
5. Guide you to start Phase 1

### Executing a Phase

```bash
# Discuss implementation approach
/devweaver:discuss-phase 1

# Create detailed plan with verification
/devweaver:plan-phase 1

# Execute tasks in parallel with fresh contexts
/devweaver:execute-phase 1

# Verify work meets acceptance criteria
/devweaver:verify-work 1
```

### Quick Tasks

```bash
# No formal planning needed
/devweaver:quick "Add input validation to the login form"

# DevWeaver will:
# 1. Understand the requirement
# 2. Find the login form
# 3. Add validation
# 4. Test it
# 5. Make one atomic commit
```

### Checking Progress

```bash
/devweaver:progress

# Shows:
# - Current milestone and phase
# - Completed phases (✓)
# - Pending phases
# - Any blockers
# - Recommended next command
```

### Code Review

```bash
# Full repository code review
/devweaver:code-review

# DevWeaver will:
# 1. Understand your repository structure and conventions
# 2. Analyze code quality, architecture, security, and performance
# 3. Generate a comprehensive report with:
#    - Critical issues (must fix)
#    - Important issues (should fix)
#    - Suggestions (nice to have)
#    - Strengths (what's done well)
# 4. Provide actionable recommendations with file:line references
# 5. Save report to .devweaver/reviews/code-review-YYYY-MM-DD.md
```

### SDLC Integration

```bash
# Create Jira epic with stories
/devweaver:jira "Create epic for User Auth with stories for login, signup, password reset"

# Update Confluence docs
/devweaver:confluence "Update API docs with new auth endpoints"

# Review Bitbucket PR
/devweaver:bitbucket "Review PR #42 and add inline comments"
```

---

## Project Structure

```
your-project/
├── .planning/                    # Context engineering docs
│   ├── PROJECT.md                # Vision and direction
│   ├── REQUIREMENTS.md           # Scoped requirements
│   ├── ROADMAP.md                # Progress tracking
│   ├── STATE.md                  # Decisions and blockers
│   ├── CODEBASE.md               # Architecture map
│   ├── config.json               # DevWeaver settings
│   ├── phase-1/
│   │   └── PLAN.md               # XML-structured tasks
│   ├── phase-2/
│   │   └── PLAN.md
│   └── ...
├── .claude/skills/               # Installed commands
│   ├── nishi-new-project.md
│   ├── nishi-quick.md
│   └── ...
├── src/                          # Your source code
├── .env                          # Environment config
└── mcp-servers.json              # MCP configuration
```

---

## How It Works

### Context Engineering Flow

1. **User runs `/devweaver:new-project`**
   - Researcher agent gathers requirements
   - Planner creates phased roadmap
   - Documentation system saves to `.planning/`

2. **User runs `/devweaver:execute-phase 1`**
   - Reads `.planning/phase-1/PLAN.md`
   - Spawns parallel executor agents in fresh 200k contexts
   - Each executor has full project context from docs
   - Main session stays at 30-40% capacity

3. **Executor completes task**
   - Runs verification steps
   - Makes atomic git commit if verification passes
   - Updates `.planning/STATE.md`

4. **User runs `/devweaver:verify-work 1`**
   - Verifier agent checks all acceptance criteria
   - Reports PASS/FAIL with evidence
   - Auto-spawns debugger if failures found

### Preventing Context Rot

DevWeaver keeps contexts fresh:

- **Structured Documentation**: All context in `.planning/` docs, not conversation history
- **Fresh Executors**: Each task runs in a new 200k-token context
- **Parallel Execution**: Independent tasks run simultaneously
- **Atomic Commits**: Small, verified changes prevent massive debugging sessions
- **State Persistence**: `.planning/STATE.md` preserves decisions across sessions

---

## Design Principles

- **Zero Runtime Dependencies**: Only Node.js built-in modules
- **Context Engineering First**: Structured docs prevent context degradation
- **Meta-Prompting**: XML-structured plans with embedded verification
- **Fresh Contexts**: Spawn specialized agents to prevent context rot
- **Atomic Tasks**: Each task independently verifiable and committable
- **MCP-First**: Prefer MCP tools when available
- **Skills-Based Learning**: Patterns learned and reused across sessions

---

## Development

```bash
# Clone repository
git clone <your-repo-url>
cd nishi

# Install dependencies (dev only)
npm install

# Build
npm run build

# Test local installation
npm run install:test

# Run tests
npm test

# Type check
npm run typecheck

# Format code
npm run format
```

---

## Requirements

- **Node.js 18+** (uses ES modules)
- **Anthropic API Key**
- **Git** (for atomic commits)
- **Claude Code, OpenCode, or Gemini CLI** (for skill installation)

---

## Recommended Setup

For best results:

1. **Run with permissions**: `claude --dangerously-skip-permissions`
2. **Or configure permissions** in `.claude/settings.json`:
   ```json
   {
     "permissions": {
       "execute": ["git", "npm", "node"],
       "read": ["**/*"],
       "write": [".planning/**", "src/**"]
     }
   }
   ```

3. **Protect sensitive files** in `.claude/settings.json`:
   ```json
   {
     "denyList": [
       ".env",
       "**/*.key",
       "**/*credentials*",
       "**/*secrets*"
     ]
   }
   ```

---

## Philosophy

**Get Shit Done.**

DevWeaver is built for developers who want AI assistance without complexity:

- Simple commands (`/devweaver:new-project`, `/devweaver:quick`)
- Clear workflows (Discuss → Plan → Execute → Verify)
- Structured outputs (`.planning/` docs, not scattered notes)
- Quality results (verification required, atomic commits)

No enterprise bloat. No complex configuration. Just efficient, systematic development.

---

## License

MIT

---

## Credits

Inspired by [get-shit-done](https://github.com/gsd-build/get-shit-done/) by TÂCHES — excellent meta-prompting and context engineering patterns.

---

**Built with DevWeaver. Get shit done. 🚀**
