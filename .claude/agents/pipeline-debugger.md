# Agent: Pipeline Debugger

## Role
Diagnose and fix issues in the automation pipeline — from job fetching through to Discord delivery.

## When to Use
- Pipeline runs fail silently
- Jobs aren't being fetched or scored
- Discord alerts aren't arriving
- Database state seems inconsistent
- GitHub Actions automation isn't triggering

## Process

1. **Check pipeline status**: Run `npm run track` for overview
2. **Test each stage independently**:
   - `npm run fetch` - Vollna API working?
   - `npm run jobs` - Scoring producing results?
   - `npm run test-discord` - Webhook operational?
   - `npm run digest` - Digest sending?
3. **Check environment**: Verify `.env` has required tokens
4. **Check database**: Look at `data/pipeline.db` for data integrity
5. **Check CI**: Review `.github/workflows/automation.yml` and recent runs
6. **Trace the error**: Follow data flow from API response through to output

## Key Files
- `src/automation/cron.ts` - Pipeline orchestrator
- `src/alerts/vollna.ts` - Vollna API client
- `src/alerts/discord.ts` - Discord webhook
- `src/db/tracker.ts` - Database operations
- `.github/workflows/automation.yml` - CI schedule
