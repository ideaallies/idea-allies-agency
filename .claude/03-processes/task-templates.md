# Task Templates

Reusable templates for common development tasks in Idea Allies.

## New Scoring Factor

```markdown
### Task: Add [Factor Name] to scoring

1. Add factor weight to `config/scoring.json` (ensure weights sum to 100)
2. Add scoring logic to `src/ai/scorer.ts`
3. Update `score_breakdown` JSON structure in scorer output
4. Test with `npm run fetch` then `npm run jobs` to verify scores
5. Update `.claude/features/job-scoring.md` with new factor
6. Update `.claude/03-processes/scoring-guide.md`
```

## New Proposal Template

```markdown
### Task: Add [Template Name] proposal template

1. Add template entry to `config/templates.json` with triggers and sections
2. Test with `npm run propose <job-id>` on a matching job
3. Verify output is under 2000 characters
4. Update `.claude/features/proposal-generation.md` template table
```

## New CLI Command

```markdown
### Task: Add `npm run [command]` CLI command

1. Add script entry to `package.json`
2. Add command handler in `src/cli/index.ts`
3. Implement command logic in appropriate module
4. Test via CLI
5. Update CLAUDE.md Commands section
```

## New Discord Alert Type

```markdown
### Task: Add [Alert Type] Discord notification

1. Add embed builder function in `src/alerts/discord.ts`
2. Wire into pipeline at appropriate stage in `src/automation/cron.ts`
3. Test with `npm run test-discord`
4. Update `.claude/features/discord-alerts.md`
```

## Bug Fix

```markdown
### Task: Fix [Bug Description]

1. Reproduce the issue via CLI
2. Identify root cause in source
3. Implement fix
4. Verify with `npx tsx src/cli/index.ts track`
5. Test the affected command
6. Document in `.claude/01-active/` if part of a tracked issue
```
