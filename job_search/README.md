# job_search — SaaS Pipeline

Central GitHub Actions worker that powers JobSearch AI.

Runs 3× a day (Sun–Thu, Israeli work week). For each registered user who has saved an Anthropic API key, it scrapes ATS boards, scores new openings against their profile using **their own key**, and writes results to Supabase.

## How it works

```
GitHub Action (cron 3×/day)
  └─ saas_pipeline.py
       ├─ load user list from Supabase (profiles + user_secrets)
       ├─ scrape ATS boards once (Greenhouse / Lever / Ashby)
       ├─ for each user:
       │    ├─ filter jobs by target role titles
       │    ├─ score with Claude Haiku (user's API key)
       │    └─ upsert into jobs table (RLS: owner-only)
       └─ done — users see results in app.html
```

## Files

| File | Purpose |
|---|---|
| `saas_pipeline.py` | Main worker — runs in GitHub Actions |
| `ats_scraper.py` | Scrapes Greenhouse / Lever / Ashby board APIs |
| `scrapers/` | Per-source scrapers (LinkedIn, AllJobs, Comeet, RemoteOK, …) |
| `deduplication.py` | URL + fuzzy-match dedup |
| `scorer.py` | Claude Haiku scoring (legacy local use) |
| `config.py` | Constants and prompt templates |
| `requirements.txt` | `anthropic` is the only runtime dependency for the SaaS pipeline |

## Required secrets (GitHub → Settings → Secrets)

| Secret | Description |
|---|---|
| `SUPABASE_URL` | `https://YOUR_REF.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key — bypasses RLS server-side |

## Running manually

```bash
export SUPABASE_URL=...
export SUPABASE_SERVICE_ROLE_KEY=...
pip install anthropic
python saas_pipeline.py
```

## Customising the ATS board list

The default board list is in `saas_pipeline.py` (`DEFAULT_ATS`). Override via Supabase:

```sql
INSERT INTO site_content (key, value)
VALUES ('platform:ats', '{"greenhouse":["co1","co2"],"lever":["co3"],"ashby":[]}');
```

## Scoring model

Each job is evaluated across five dimensions (skills fit, seniority, location, growth, comp) using Claude Haiku. Only jobs with a weighted score ≥ 6/10 are written to the user's tracker.

## Local / legacy mode

The files `main.py`, `run_pipeline.py`, `sheets.py`, and `email_summary.py` are kept for reference — they implement the original local CLI pipeline (Google Sheets + Gmail). They are **not used by the SaaS platform**.
