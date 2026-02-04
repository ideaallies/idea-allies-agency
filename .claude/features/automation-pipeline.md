# Feature: Automation Pipeline

**Status:** Active
**Module:** `src/automation/cron.ts`
**CI:** `.github/workflows/automation.yml`

## Overview

Orchestrates the full pipeline cycle: fetch jobs from Vollna, score them, generate proposals for qualified jobs, send Discord alerts, and deliver daily digests.

## Pipeline Stages

```
1. Fetch    → Vollna API → raw job data
2. Dedupe   → Filter out previously seen jobs (by URL)
3. Score    → Score 0-100, store in SQLite
4. Alert    → Discord notifications for qualified jobs
5. Propose  → Generate proposals for jobs scoring 75+
6. Digest   → Daily summary of pipeline activity
```

## Scheduling (GitHub Actions)

- **Pipeline cycle:** Every 30 minutes, weekdays 9 AM - 6 PM EST
- **Daily digest:** 8 AM EST daily

## Manual Execution

```bash
npm run auto    # Run full cycle once
npm run fetch   # Fetch only
npm run digest  # Digest only
```

## Database

All state stored in `data/pipeline.db` (SQLite, auto-created on first run).

### Job Lifecycle

`new` -> `qualified` -> `proposed` -> `submitted` -> `responded` -> `won/lost/rejected`

## Error Handling

- Vollna API failures are logged but don't crash the pipeline
- Discord webhook failures are logged but don't block other stages
- Database operations are synchronous (better-sqlite3)
