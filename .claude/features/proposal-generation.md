# Feature: Proposal Generation

**Status:** Active
**Module:** `src/ai/proposalGen.ts`
**Config:** `config/templates.json`, `config/profile.json`

## Overview

Selects one of 7 proposal templates based on job keyword triggers, then populates it with job-specific details and agency profile information.

## Templates

| Template | Trigger Keywords |
|----------|-----------------|
| fullStack | Full-stack, MERN, end-to-end |
| frontend | React, UI, frontend, design |
| api | API, backend, integration, REST |
| bugFix | Bug, fix, debug, issue |
| mvp | MVP, prototype, startup, launch |
| maintenance | Maintain, support, ongoing |
| generic | Fallback when no keywords match |

## Template Sections

Each template has structured sections:
1. **Hook** - Opening line tailored to the job type
2. **Understanding** - Paraphrase of the client's needs
3. **Approach** - Technical approach and methodology
4. **Proof** - Relevant experience and portfolio items
5. **CTA** - Call to action

## Constraints

- Max 2000 characters per proposal (Upwork limit)
- Profile data (rates, tech stack, differentiators) sourced from `config/profile.json`

## Data Flow

1. Job data passed in (title, description, budget, skills)
2. Keywords scanned to select template
3. Template sections populated with job-specific details
4. Profile info injected for proof/credibility
5. Final proposal stored in DB and returned
