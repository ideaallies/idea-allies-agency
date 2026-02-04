# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Idea Allies is a TypeScript CLI automation pipeline for freelance job discovery and proposal generation. It fetches jobs from Vollna (which aggregates Upwork, Freelancer, Guru, PeoplePerHour), scores them, generates proposals from templates, and sends Discord alerts. Proposal submission to Upwork is manual (for ToS compliance).

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

## Notes

- No build step; TypeScript runs directly via `npx tsx`.
- No test framework; testing is manual via CLI commands and inline test blocks in scorer/proposalGen/discord modules.
- No linter or formatter configured.
- The SQLite database at `data/pipeline.db` is auto-created on first run. To reset, delete it and run `npm run track`.
