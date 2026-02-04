# .claude Directory Structure

This directory contains all documentation, planning, and process guides for the Idea Allies automation pipeline.

## Directory Organization

### `01-active/` - Current Work
Files that require **immediate or ongoing attention**. Look here first.

**Review Frequency:** Daily during active development

---

### `02-backlog/` - Planned Work
Implementation guides and strategies ready to execute when priorities allow.

**Review Frequency:** Weekly planning sessions

---

### `03-processes/` - Guides & Standards
Established processes and patterns that don't change frequently.

**Review Frequency:** Monthly or when processes need updates

---

### `04-archive/` - Completed or Outdated
Historical documents kept for reference. Resolved or superseded work.

**Review Frequency:** Never (unless researching history)

---

### `agents/` - Agent Configurations
Custom agent definitions for specialized tasks (scoring audits, proposal review, etc.)

---

### `decisions/` - Architecture & Technology Decisions
Strategic decisions documented using Architecture Decision Records (ADR) pattern.

**Purpose:** Document **why** decisions were made with full context, options considered, and trade-offs. Prevents re-litigating settled decisions without new information.

**Review Frequency:** When making strategic technology choices

---

### `features/` - Feature Documentation
Documentation for each major feature, providing context continuity across sessions.

**Review Frequency:** When working on or modifying a feature

---

### `research/` - Technology Research & Exploration
Exploratory research documents that inform strategic decisions.

**Lifecycle:** Research -> Decision -> Implementation -> Archive

**Review Frequency:** When evaluating new technologies

---

## Document Lifecycle

### When to Create New Documents

**Active Issues (`01-active/`):**
- Critical bugs discovered
- Performance issues affecting the pipeline
- Data integrity problems
- API integration issues

**Backlog Items (`02-backlog/`):**
- Feature implementation guides
- Architecture improvement plans
- Testing strategies
- Refactoring proposals

**Process Documents (`03-processes/`):**
- Workflow standards
- Code patterns
- Configuration guides
- Scoring/proposal guidelines

**Decision Records (`decisions/`):**
- Technology evaluations (libraries, services)
- Architecture choices (data flow, API design)
- Infrastructure decisions (CI, deployment)

**Research Documents (`research/`):**
- Technology exploration
- Proof of concept findings
- Vendor/service comparisons

### When to Move Documents

**To Archive (`04-archive/`):**
- Bugs are fully fixed and verified
- Features are implemented and stable
- Documents are superseded by newer versions

**Naming Convention for Archived Files:**
- `original-name-COMPLETE.md` - Fully resolved
- `original-name-PARTIAL.md` - Partially resolved
- `original-name-old.md` - Superseded by newer document

### When to Delete Documents

**Only delete files that are:**
- Empty or duplicate
- Temporary scratch notes

**Never delete:**
- Historical bug analyses (archive instead)
- Implementation plans (archive instead)
- Decision records (archive instead)

---

## Autonomous Documentation Process

### After Completing ANY Task

Claude Code should **automatically**:

1. **Review Affected Documents**
   - Check `01-active/` for related issues
   - Update status/completion in relevant files
   - Move completed items to `04-archive/`

2. **Propose CLAUDE.md Updates**
   - New patterns discovered during implementation
   - Best practices learned
   - Common pitfalls to avoid

3. **Update Documentation**
   - Mark bugs as fixed with commit hash
   - Update progress in plans
   - Add lessons learned to process docs

---

## Quick Reference

```bash
# List all active work
ls -1 .claude/01-active/

# List backlog items
ls -1 .claude/02-backlog/

# List all processes
ls -1 .claude/03-processes/

# List all decisions
ls -1 .claude/decisions/

# Search across all docs
grep -r "keyword" .claude/
```

---

**Last Updated:** 2026-02-04
**Structure Version:** 1.0
**Maintainer:** Autonomous (Claude Code + Engineering Team)
