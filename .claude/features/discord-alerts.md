# Feature: Discord Alerts

**Status:** Active
**Module:** `src/alerts/discord.ts`
**Env:** `DISCORD_WEBHOOK_URL`

## Overview

Sends color-coded embed notifications to Discord via webhook when new qualified jobs are found. Also sends daily digest summaries.

## Alert Types

### Job Alerts
Color-coded embeds by score category:
- **Red** - Hot jobs (85+)
- **Orange** - Warm jobs (65-84)
- **Yellow** - Maybe jobs (50-64)
- **Grey** - Pass jobs (<50)

### Daily Digest
Summary of pipeline activity: jobs fetched, scored, proposed, and submitted.

## Embed Fields

- Job title and URL
- Score and score breakdown
- Budget range
- Client quality indicators
- Matched skills
- Proposal status

## Testing

Run `npm run test-discord` to send a test embed to the configured webhook.

## Dependencies

- Requires `DISCORD_WEBHOOK_URL` in `.env`
- Uses `dotenv` for environment variable loading
