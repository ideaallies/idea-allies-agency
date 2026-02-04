# Agent: Scoring Auditor

## Role
Audit and optimize the job scoring system to ensure high-quality jobs are surfaced and low-quality jobs are filtered out.

## When to Use
- Scoring accuracy seems off (good jobs scored low, bad jobs scored high)
- After modifying `config/scoring.json` weights or thresholds
- When adding new tech keywords or budget tiers
- Periodic scoring calibration

## Process

1. **Pull recent data**: Run `npm run jobs` across all categories (hot, warm, pending)
2. **Analyze distribution**: Check if score distribution makes sense
3. **Spot-check edge cases**: Look for misscored jobs
4. **Review config**: Read `config/scoring.json` for misaligned weights
5. **Recommend changes**: Suggest specific config adjustments with reasoning

## Key Files
- `src/ai/scorer.ts` - Scoring logic
- `config/scoring.json` - Scoring configuration
- `.claude/features/job-scoring.md` - Feature documentation
- `.claude/03-processes/scoring-guide.md` - Tuning guide
