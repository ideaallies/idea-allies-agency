# Feature: Job Scoring

**Status:** Active
**Module:** `src/ai/scorer.ts`
**Config:** `config/scoring.json`

## Overview

Scores jobs 0-100 using 5 weighted factors to determine quality and fit. Jobs scoring 65+ are "qualified" and displayed; jobs scoring 75+ are auto-proposed.

## Scoring Factors

| Factor | Weight | Description |
|--------|--------|-------------|
| Tech Match | 30% | Keywords matched against primary/secondary/bonus/negative lists |
| Budget | 25% | Budget tier evaluation (min/max ranges) |
| Client Quality | 20% | Payment verified, hire rate, total spent signals |
| Project Clarity | 15% | Description quality and requirements completeness |
| Timing | 10% | Job freshness and competition level |

## Score Categories

- **Hot (85+):** High-value, strong fit
- **Warm (65-84):** Good fit, worth pursuing
- **Maybe (50-64):** Marginal, review manually
- **Pass (<50):** Poor fit, skip

## Auto-Reject Rules

- Zero tech match score
- Budget below configured minimums

## Configuration

All weights, thresholds, tech keywords, and budget tiers are in `config/scoring.json`. Changes there affect scoring without code changes.

## Known Edge Cases

- Jobs with no budget listed default to "budget unknown" tier
- Multi-category jobs may match multiple template triggers
