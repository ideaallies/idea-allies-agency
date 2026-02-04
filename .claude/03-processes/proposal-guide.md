# Proposal Templates Guide

## Overview

Proposal generation is configured through `config/templates.json` and `config/profile.json`. This document explains how to modify templates and profile data.

## Template Structure

Each template in `templates.json` has:

```json
{
  "templateName": {
    "triggers": ["keyword1", "keyword2"],
    "hook": "Opening line template",
    "understanding": "Client needs paraphrase template",
    "approach": "Technical approach template",
    "proof": "Experience/portfolio template",
    "cta": "Call to action template"
  }
}
```

## Template Selection Logic

1. Job title and description are scanned for trigger keywords
2. First matching template is selected
3. If no keywords match, `generic` template is used
4. Template sections are populated with job-specific data

## Profile Data (`config/profile.json`)

Used to inject credibility into proposals:
- Agency name and description
- Tech stack capabilities
- Rate ranges
- Differentiators and portfolio highlights

## Constraints

- **Max 2000 characters** per proposal (Upwork platform limit)
- Templates should be concise — the generator truncates if needed

## Adding a New Template

1. Add entry to `config/templates.json` with trigger keywords and section content
2. The template is automatically available — no code changes needed
3. Test with `npm run propose <job-id>` on a matching job

## Modifying Profile Data

1. Edit `config/profile.json` directly, or
2. Run `npm run portfolio` to sync GitHub repos into the profile
