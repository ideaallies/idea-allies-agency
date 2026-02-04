# Idea Allies Upwork Pipeline - Setup Guide

Complete automation system for Upwork job discovery, scoring, and proposal generation.

## What's Automated

| Component | Level | Notes |
|-----------|-------|-------|
| Job Discovery | ✅ Fully | Vollna RSS polling every 30 min |
| Job Scoring | ✅ Fully | Instant scoring on fetch |
| Proposal Generation | ✅ Fully | Auto-generates for score ≥85 |
| Discord Alerts | ✅ Fully | Instant for hot jobs |
| Daily Digest | ✅ Fully | 8 AM summary |
| Pipeline Tracking | ✅ Fully | SQLite database |
| Portfolio Sync | ✅ Fully | Weekly GitHub sync |
| Proposal Submission | ❌ Manual | Copy/paste to Upwork (ToS) |

## Quick Start

### 1. Install Dependencies

```bash
bun install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in:

```env
VOLLNA_FEED_URL=<from vollna.com>
DISCORD_WEBHOOK_URL=<from your Discord server>
GITHUB_TOKEN=<optional, for private repos>
```

### 3. Set Up Vollna (Job Alerts)

1. Go to https://vollna.com
2. Create account and set up filters:
   - **Keywords**: Next.js, React, TypeScript, Tailwind, Node.js
   - **Budget**: $500+ fixed, $30+/hr hourly
   - **Categories**: Web Development, Full Stack
   - **Client Location**: US, UK, Canada, EU (payment-verified)
3. Get the RSS feed URL
4. Add to `.env` as `VOLLNA_FEED_URL`

### 4. Set Up Discord

1. In your Discord server: Server Settings → Integrations → Webhooks
2. Create New Webhook
3. Copy webhook URL
4. Add to `.env` as `DISCORD_WEBHOOK_URL`
5. Test: `bun run test-discord`

### 5. Initialize Database

```bash
bun run track
```

### 6. Sync Portfolio

```bash
bun run portfolio
```

### 7. Test Full Automation

```bash
bun run auto
```

## Daily Workflow

### Automated (runs every 30 min)

1. Fetch jobs from Vollna RSS
2. Score and save to database
3. Generate proposals for score ≥85
4. Send Discord alerts for hot jobs
5. Send daily digest at 8 AM

### Manual (you do this)

1. Check Discord for alerts
2. Run `bun run review` to see proposals
3. For each proposal to submit:
   ```bash
   bun run submit <job-id>
   # This copies to clipboard and opens the URL
   ```
4. Paste into Upwork and submit
5. Update status:
   ```bash
   bun run status <job-id> submitted
   ```
6. When client responds:
   ```bash
   bun run status <job-id> responded
   # or
   bun run status <job-id> won "Signed $5k contract"
   # or
   bun run status <job-id> lost
   ```

## All Commands

```bash
# Full automation cycle
bun run auto

# Fetch new jobs
bun run fetch

# List jobs
bun run jobs           # All qualified (65+)
bun run jobs hot       # Score 85+
bun run jobs warm      # Score 70-84
bun run jobs pending   # Needs proposal
bun run jobs submitted # Already submitted

# Proposals
bun run propose <id>   # Generate for one job
bun run batch-propose  # Generate all pending

# Review
bun run review         # Print summary
bun run review file    # Generate markdown file

# Submit
bun run submit <id>    # Copy proposal, open URL

# Update status
bun run status <id> submitted
bun run status <id> responded
bun run status <id> won "Notes here"
bun run status <id> lost

# Stats
bun run track          # Pipeline overview
bun run stats          # Detailed statistics

# Other
bun run portfolio      # Sync GitHub repos
bun run test-discord   # Test webhook
bun run digest         # Send digest manually
```

## Scoring System

Jobs are scored 0-100 based on:

| Factor | Weight | What it measures |
|--------|--------|------------------|
| Budget | 25% | Fixed price or hourly rate |
| Tech Match | 30% | Keywords matching your stack |
| Client Quality | 20% | Payment verified, hire rate, spend |
| Project Clarity | 15% | Description detail, specs |
| Timing | 10% | How recently posted |

### Score Thresholds

- **85+**: Auto-generate proposal, send Discord alert
- **70-84**: Warm lead, consider manually
- **50-69**: Maybe, lower priority
- **<50**: Usually skip

## Proposal Templates

7 templates auto-selected based on keywords:

1. **fullStack** - SaaS, web apps
2. **frontend** - UI, landing pages
3. **api** - Backend, integrations
4. **bugFix** - Debugging, issues
5. **mvp** - Startups, prototypes
6. **maintenance** - Ongoing, retainers
7. **generic** - Fallback

## GitHub Actions

Runs automatically when you push to GitHub:

- **Every 30 min (9 AM - 6 PM EST, weekdays)**: Fetch and process jobs
- **8 AM EST daily**: Send digest

### Required Secrets

Add these in GitHub repo → Settings → Secrets:

- `VOLLNA_FEED_URL`
- `DISCORD_WEBHOOK_URL`

## File Structure

```
├── .github/workflows/
│   └── automation.yml     # GitHub Actions
├── config/
│   ├── profile.json       # Agency profile
│   ├── templates.json     # Proposal templates
│   └── scoring.json       # Scoring rules
├── src/
│   ├── alerts/
│   │   ├── vollna.ts      # RSS fetcher
│   │   └── discord.ts     # Webhook notifications
│   ├── automation/
│   │   ├── cron.ts        # Main runner
│   │   └── review-queue.ts
│   ├── ai/
│   │   ├── scorer.ts      # Scoring engine
│   │   └── proposalGen.ts # Proposal writer
│   ├── db/
│   │   └── tracker.ts     # SQLite database
│   ├── portfolio/
│   │   └── github.ts      # Repo sync
│   └── cli/
│       └── index.ts       # CLI commands
├── data/
│   └── pipeline.db        # Database (auto-created)
└── .env                   # Your secrets
```

## Customization

### Adjust Scoring

Edit `config/scoring.json`:

- Change weights
- Add/remove tech keywords
- Adjust budget thresholds

### Modify Templates

Edit `config/templates.json`:

- Add new templates
- Change trigger keywords
- Update template sections

### Update Profile

Edit `config/profile.json`:

- Your agency info
- Tech stack
- Hourly rates
- Differentiators

## Troubleshooting

### "VOLLNA_FEED_URL not set"

Add the URL to your `.env` file.

### Discord alerts not sending

1. Check `DISCORD_WEBHOOK_URL` in `.env`
2. Run `bun run test-discord`
3. Ensure webhook is active in Discord

### No jobs found

1. Check Vollna filters
2. Try broadening keywords
3. RSS feed might be empty

### Database errors

Delete `data/pipeline.db` and run `bun run track` again.
