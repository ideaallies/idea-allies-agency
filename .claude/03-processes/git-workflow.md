# Git Workflow

## Branch Naming

Format: `type/description`

| Type | Usage | Example |
|------|-------|---------|
| feature | New functionality | `feature/ai-scoring-v2` |
| fix | Bug fixes | `fix/discord-embed-color` |
| refactor | Code restructuring | `refactor/scorer-module` |
| docs | Documentation only | `docs/update-readme` |
| chore | Maintenance tasks | `chore/update-dependencies` |

## Commit Messages

Format: `type(scope): description`

### Types
- `feat` - New feature
- `fix` - Bug fix
- `refactor` - Code change that neither fixes a bug nor adds a feature
- `docs` - Documentation only
- `chore` - Maintenance, dependencies, CI

### Scopes
- `scorer` - Scoring module
- `proposal` - Proposal generation
- `discord` - Discord alerts
- `vollna` - Vollna API integration
- `db` - Database/tracker
- `cli` - CLI commands
- `auto` - Automation/cron
- `config` - Configuration files
- `ci` - GitHub Actions

### Examples
```
feat(scorer): add budget tier weighting for hourly jobs
fix(discord): handle missing embed fields gracefully
refactor(db): extract query builders into separate functions
docs(config): document scoring.json threshold values
chore(ci): update automation schedule to weekdays only
```

## Workflow

1. Create branch from `master`
2. Make changes, commit with conventional messages
3. Verify with `npx tsx src/cli/index.ts track`
4. Push and create PR (if working with others)
