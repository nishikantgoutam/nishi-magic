# /nishi:code-review

Perform comprehensive code review and analysis following industry standards.

## What This Does

Analyzes code for:
- **Code Quality**: Readability, maintainability, complexity, code smells
- **Architecture**: Design patterns, SOLID principles, modularity
- **Security**: OWASP Top 10, vulnerabilities, best practices
- **Performance**: Bottlenecks, optimization opportunities
- **Best Practices**: Error handling, testing, documentation

## Workflow

### Step 1: Understand the Repository

First, map the codebase structure:

```xml
<task>
  <action>Repository Analysis</action>
  <steps>
    1. Read README.md and CONTRIBUTING.md (if exists)
    2. Examine package.json / pyproject.toml / etc for dependencies
    3. Review directory structure (src/, tests/, docs/)
    4. Check configuration files (.eslintrc, tsconfig.json, etc)
    5. Identify framework/library usage
    6. Note existing code patterns and conventions
  </steps>
</task>
```

**Files to check:**
- `README.md` - Project overview
- `package.json` / `requirements.txt` / `go.mod` - Dependencies
- `.gitignore` - What's excluded
- `.eslintrc` / `prettier.config.js` - Code style rules
- `tsconfig.json` / `jsconfig.json` - TS/JS config
- CI/CD configs (`.github/workflows/`, `.gitlab-ci.yml`)

### Step 2: Determine Review Scope

Ask the user:

```markdown
What would you like me to review?

1. **Full Repository** - Complete codebase analysis (may take time)
2. **Specific Files/Directories** - Focused review
3. **Recent Changes** - Review uncommitted or recent commits
4. **Security Audit** - Focus on security vulnerabilities
5. **Performance Audit** - Focus on performance issues
6. **Architecture Review** - High-level design and patterns
```

### Step 3: Conduct the Review

Use the **Code Reviewer Agent** context. For each file/directory:

```xml
<review-process>
  <file path="[file-path]">
    <analyze>
      1. Read the file completely
      2. Assess code quality (readability, complexity, smells)
      3. Check architecture (patterns, SOLID, coupling)
      4. Scan for security issues (OWASP, input validation, secrets)
      5. Identify performance concerns (algorithms, queries, resources)
      6. Verify best practices (error handling, logging, tests)
    </analyze>

    <document-issues>
      For each issue found:
      - Severity: CRITICAL / ERROR / WARNING / INFO
      - Category: Quality / Architecture / Security / Performance
      - Location: file:line
      - Description: What's wrong
      - Rationale: Why it's a problem
      - Fix: How to resolve it
      - Example: Code snippet showing the fix
    </document-issues>

    <note-strengths>
      - Good practices observed
      - Well-implemented patterns
      - Quality code sections
    </note-strengths>
  </file>
</review-process>
```

### Step 4: Generate Review Report

Create a comprehensive markdown report:

```markdown
# Code Review Report
Generated: [date]
Reviewer: AI Code Reviewer Agent

## Executive Summary
[2-3 sentence overview of findings and overall assessment]

## Repository Overview
- **Tech Stack**: [languages, frameworks, libraries]
- **Architecture**: [patterns identified]
- **Lines of Code**: ~[estimate]
- **Test Coverage**: [if determinable]

## Findings Summary
- 🔴 Critical Issues: [count]
- 🟠 Important Issues: [count]
- 🟡 Suggestions: [count]
- 🟢 Strengths: [count]

## Critical Issues (Must Fix)

### [Issue Title]
- **File**: `path/to/file.ts:42`
- **Severity**: CRITICAL
- **Category**: Security / Performance / etc

**Problem**: [What's wrong]
**Impact**: [Why it matters]
**Fix**: [How to resolve]

```typescript
// ❌ Current (problematic)
[bad code]

// ✅ Recommended
[good code]
```

## Important Issues (Should Fix)
[Similar format for each issue]

## Suggestions (Nice to Have)
[Similar format for each suggestion]

## Strengths
- ✅ [Good practice 1]
- ✅ [Good practice 2]
- ✅ [Good practice 3]

## Industry Standards Compliance

### Code Quality
- [x] DRY principle followed
- [ ] Single Responsibility Principle
- [x] Descriptive naming
[etc...]

### Security
- [ ] No hardcoded secrets
- [x] Input validation
- [ ] SQL injection prevention
[etc...]

### Performance
- [x] Efficient algorithms
- [ ] No N+1 queries
- [x] Proper caching
[etc...]

## Actionable Recommendations

Priority order for fixes:

1. **[File:Line]** - [Specific action needed]
2. **[File:Line]** - [Specific action needed]
3. **[File:Line]** - [Specific action needed]

## Next Steps
1. Address all CRITICAL issues immediately
2. Create tickets/tasks for IMPORTANT issues
3. Consider SUGGESTIONS for future iterations
4. Re-run review after fixes
```

### Step 5: Save the Report

```xml
<task>
  <action>Save Report</action>
  <steps>
    1. Create `.nishi/reviews/` directory if not exists
    2. Save as `code-review-[YYYY-MM-DD].md`
    3. If NISHI project exists, log in STATE.md
  </steps>
</task>
```

### Step 6: Offer Next Actions

Ask the user:

```markdown
Code review complete! What would you like to do next?

1. **Fix Critical Issues** - I can help implement the fixes
2. **Create GitHub Issues** - Generate issues for each finding
3. **Deep Dive** - Detailed analysis of specific issues
4. **Architecture Refactor** - Plan improvements
5. **Security Hardening** - Focus on security fixes
6. **Performance Optimization** - Focus on performance
```

## Review Checklist

Make sure to check:

### Code Quality
- [ ] No code duplication
- [ ] Functions < 50 lines
- [ ] Cyclomatic complexity < 10
- [ ] Clear naming
- [ ] No magic numbers
- [ ] Appropriate comments

### Architecture
- [ ] SOLID principles
- [ ] Proper abstractions
- [ ] No circular dependencies
- [ ] Clear module boundaries
- [ ] Appropriate patterns

### Security
- [ ] No secrets in code
- [ ] Input validation
- [ ] Output encoding
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] CSRF protection
- [ ] Authentication checks
- [ ] Authorization checks

### Performance
- [ ] Efficient algorithms
- [ ] No N+1 queries
- [ ] Proper indexing
- [ ] Caching where needed
- [ ] Async/await correctly used
- [ ] Resource cleanup

### Testing
- [ ] Unit tests exist
- [ ] Edge cases covered
- [ ] Error scenarios tested
- [ ] Mocks used appropriately

### Maintainability
- [ ] README complete
- [ ] API documented
- [ ] Complex logic explained
- [ ] Error messages helpful
- [ ] Logging adequate

## Example Usage

```markdown
User: /nishi:code-review