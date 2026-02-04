# Scoring Guide

## Overview

Job scoring is configured entirely through `config/scoring.json`. This document explains how to tune scoring behavior without code changes.

## Configuration Structure

### Weights
Controls how much each factor contributes to the total score (must sum to 100):
- `techMatch: 30` - How well job skills match our stack
- `budget: 25` - Budget tier evaluation
- `clientQuality: 20` - Client reliability signals
- `projectClarity: 15` - Description quality
- `timing: 10` - Freshness and competition

### Thresholds
- `qualified: 65` - Minimum score to appear in job listings
- `autoPropose: 75` - Minimum score for automatic proposal generation

### Tech Keywords
Four tiers of keyword matching:
- **primary** - Core skills (highest match score)
- **secondary** - Supporting skills (moderate match score)
- **bonus** - Nice-to-have skills (small boost)
- **negative** - Red flag keywords (score penalty)

### Budget Tiers
Define acceptable budget ranges by project type (fixed vs hourly).

### Client Quality Signals
- `payment_verified` - Client has verified payment method
- `hire_rate` - Percentage of posted jobs that result in hires
- `total_spent` - Total platform spending history

## Tuning Tips

- If too many low-quality jobs appear: raise `qualified` threshold
- If too few proposals generated: lower `autoPropose` threshold
- If irrelevant jobs score high: review `primary` and `negative` keyword lists
- If good jobs score low: check if their skills are in `secondary` or `bonus` lists
