# Architecture & Technology Decisions

This directory contains records of significant technical and strategic decisions made for Idea Allies.

## Purpose

Architecture Decision Records (ADRs) help us:
- **Document context:** Capture why decisions were made when they're fresh
- **Prevent re-litigation:** Avoid revisiting settled decisions without new information
- **Learn from outcomes:** Track consequences of decisions over time

## Decision Log

| ID | Date | Decision | Status | Impact Level |
|----|------|----------|--------|--------------|
| — | — | No decisions recorded yet | — | — |

## Decision Statuses

- **Evaluating:** Under consideration, research in progress
- **Accepted:** Decision made and approved, ready for implementation
- **Implemented:** Decision executed and in production
- **Rejected:** Option considered but not pursued
- **Superseded:** Replaced by a later decision

## Decision Template

When creating a new decision record, use this structure:

```markdown
# Decision: [Short Title]

**Status:** [Evaluating / Accepted / Implemented / Rejected / Superseded]
**Date:** YYYY-MM-DD
**Tags:** #tag1 #tag2

## Context

What is the problem or opportunity? What forces are at play?

## Options Considered

### Option 1: [Name]
- Pros
- Cons
- Cost
- Complexity

### Option 2: [Name]
- Pros
- Cons
- Cost
- Complexity

## Decision

What option did we choose and why?

## Consequences

### Positive
- What benefits do we gain?

### Negative
- What trade-offs are we accepting?

### Risks
- What could go wrong?

## Implementation

High-level plan if decision is accepted.

## References

- Links to research, documentation, benchmarks
```

## Naming Convention

- Use sequential numbering: `001-`, `002-`, `003-`
- Use kebab-case: `001-some-decision.md`
- Keep titles short but descriptive

## When to Create a Decision Record

Create an ADR when making decisions about:
- **Technology choices:** Libraries, APIs, services
- **Architecture patterns:** Data flow, scoring logic, template design
- **Infrastructure:** CI/CD, deployment, hosting
- **Build vs Buy:** Internal development vs external services

**Don't create ADRs for:**
- Bug fixes (use `.claude/01-active/`)
- Minor dependency updates
- Code style preferences (use CLAUDE.md)
- Process changes (use `.claude/03-processes/`)
