# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Idea Allies is a TypeScript CLI automation pipeline for freelance job discovery and proposal generation. It fetches jobs from Vollna (which aggregates Upwork, Freelancer, Guru, PeoplePerHour), scores them, generates proposals from templates, and sends Discord alerts. Proposal submission to Upwork is manual (for ToS compliance).

## Rules of Engagement

1. **One task at a time** - No jumping to next task without permission
2. **Walk through each task** - Explain why we need it, why the solution is best practice, why it won't break anything
3. **Stop on deviation** - If anything causes deviation from plan, stop and explain
4. **Process improvement** - Suggest improvements to Claude Code processes/documentation if anything comes up
5. **After each task** - Provide an updated task list showing completed tasks and remaining tasks

## Core Principles
- **KISS**: Keep It Simple, Stupid - break complex logic into smaller, focused functions and modules
- **SRP**: Single Responsibility Principle - each module/function should have one clear purpose
- **DRY**: Don't Repeat Yourself - centralize common patterns, validation, and business logic

## CRITICAL: Plan Deviation Protocol

If you discover something requiring a change from the original plan:
1. **STOP** - Do not proceed with the deviation
2. **Explain** - What changed, why the new approach is better, why it won't break anything
3. **Wait for approval** - Never assume changes are acceptable, even if they seem better

## CRITICAL: Exploration vs Implementation

**Default to exploration mode.** Only implement after explicit triggers: "do it", "proceed", "make the changes".

- **Exploration** (questions, "what if", "could we") → Discuss only, no changes
- **Implementation** (explicit approval) → Make changes

When exploring, end with: "Would you like me to implement these changes, or are you still exploring?"

## CRITICAL: Research-First Decision Making

**Never suggest based on assumptions.** Before any suggestion:
1. **Read code first** - Check existing patterns, verify current implementation
2. **Verify docs** - WebSearch for our specific library versions (check package.json)
3. **State what you verified** - "I checked the module and confirmed..." not "It probably does..."

**When uncertain:** Say "I cannot verify this" and ask. Never guess.

## Continuous Improvement

When you discover undocumented patterns, make mistakes, or learn something:
- **Behavioral** (how Claude should act) → Suggest updating CLAUDE.md
- **Reference** (patterns, gotchas, processes) → Suggest updating or creating a doc

At session end, ask: "Did we learn anything that should be documented?"

## Commands

All commands use `npm run` (or `bun run`). TypeScript executes directly via `tsx` — there is no build step.

```bash
npm run auto              # Full automation cycle: fetch → score → alert → propose → digest
npm run fetch             # Fetch jobs from Vollna API
npm run jobs              # List qualified jobs (score 65+); accepts: hot, warm, pending, submitted
npm run propose <id>      # Generate proposal for a single job
npm run batch-propose     # Generate proposals for all pending qualified jobs
npm run review            # Print review summary; "review file" generates markdown
npm run submit <id>       # Copy proposal to clipboard and open job URL
npm run status <id> <s>   # Update job status: submitted | responded | won "notes" | lost
npm run track             # Pipeline overview (also initializes the database)
npm run stats             # Detailed statistics (7-day and 30-day)
npm run portfolio         # Sync GitHub repos to config/profile.json
npm run test-discord      # Test Discord webhook
npm run digest            # Send daily digest manually
```

## Architecture

```
CLI (src/cli/index.ts)  ←→  Automation orchestrator (src/automation/cron.ts)
        ↕                              ↕
SQLite DB (src/db/tracker.ts)    Vollna API (src/alerts/vollna.ts)
        ↕                              ↕
Scorer (src/ai/scorer.ts)       Discord alerts (src/alerts/discord.ts)
        ↕
Proposal generator (src/ai/proposalGen.ts)
```

**Data flow:** Vollna API → fetch & deduplicate → score (0-100, 5 weighted factors) → store in SQLite → generate proposals for jobs above threshold → send Discord alerts → manual review & submission via CLI.

### Key modules

- **`src/cli/index.ts`** — Command router; parses CLI args and dispatches to other modules.
- **`src/automation/cron.ts`** — Orchestrates the full pipeline cycle. Called by `npm run auto` and GitHub Actions.
- **`src/db/tracker.ts`** — SQLite database (better-sqlite3, synchronous). Three tables: `jobs`, `proposals`, `stats`. Auto-creates `data/pipeline.db` on first use.
- **`src/ai/scorer.ts`** — Scores jobs 0-100 using weighted factors: tech match (30%), budget (25%), client quality (20%), project clarity (15%), timing (10%). Auto-rejects jobs with zero tech match or budget below minimums.
- **`src/ai/proposalGen.ts`** — Selects one of 7 templates (fullStack, frontend, api, bugFix, mvp, maintenance, generic) based on keyword triggers, then populates it with job-specific details.
- **`src/alerts/vollna.ts`** — Vollna API integration with token auth. Fetches from configured filters and deduplicates by URL.
- **`src/alerts/discord.ts`** — Discord webhook notifications. Color-coded embeds by score category (hot/warm/maybe/pass).
- **`src/automation/review-queue.ts`** — Generates review summaries (console or markdown file).
- **`src/portfolio/github.ts`** — Syncs GitHub repos into `config/profile.json`.

### Configuration files (config/)

- **`profile.json`** — Agency info, tech stack, rates, differentiators. Used by proposal generator.
- **`scoring.json`** — Score weights, thresholds, budget tiers, tech keywords (primary/secondary/bonus/negative), client quality signals. Auto-propose threshold is 75.
- **`templates.json`** — 7 proposal templates with trigger keywords, section content (hook, understanding, approach, proof, CTA), and formatting rules (max 2000 chars).

### Database schema

Jobs table tracks the full lifecycle: `new → qualified → proposed → submitted → responded → won/lost/rejected`. Key columns: `score`, `score_breakdown` (JSON), `proposal_text`, `proposal_template`, `budget_type/min/max`, `client_payment_verified/hire_rate/total_spent`.

## Tech Stack

- **TypeScript 5.3** with strict mode, ES2022 target, ESNext modules, bundler module resolution
- **Runtime:** Node.js with tsx (primary) or Bun (optional)
- **Database:** better-sqlite3 (synchronous SQLite)
- **Dependencies:** dotenv, date-fns, rss-parser, open, clipboardy
- **CI:** GitHub Actions (automation.yml) — runs every 30 min on weekdays 9-6 EST, daily digest at 8 AM EST

## Environment Variables

Required in `.env` (see `.env.example`):
- `VOLLNA_API_TOKEN` — Vollna API token for job fetching
- `DISCORD_WEBHOOK_URL` — Discord webhook for alerts

Optional:
- `GITHUB_TOKEN` — For private repo access during portfolio sync
- `OPENAI_API_KEY` — Reserved for future AI features

## Required Actions After Code Changes

1. **Verify no runtime errors**: `npx tsx src/cli/index.ts track` - must run without errors
2. **Test affected commands**: Run the relevant `npm run` command for any module you changed
3. **Check database integrity**: If DB schema changed, delete `data/pipeline.db` and run `npm run track` to verify clean initialization
4. All verification steps must pass before committing

## Security Best Practices
- **Environment variables**: Never hardcode API tokens, webhook URLs, or secrets — always use `.env`
- Never log sensitive information (API tokens, webhook URLs, user data)
- Never commit `.env` files or `data/pipeline.db` to version control
- Validate and sanitize all external API responses before storing in SQLite
- Use HTTPS for all API communications

## Git Workflow

**Quick reference:**
- Branch: `type/description` (e.g., `feature/ai-scoring`, `fix/discord-webhook`)
- Commit: `type(scope): description` (e.g., `feat(scorer): add budget tier weighting`, `fix(discord): handle missing embed fields`)

## Notes

- No build step; TypeScript runs directly via `npx tsx`.
- No test framework; testing is manual via CLI commands and inline test blocks in scorer/proposalGen/discord modules.
- No linter or formatter configured.
- The SQLite database at `data/pipeline.db` is auto-created on first run. To reset, delete it and run `npm run track`.
