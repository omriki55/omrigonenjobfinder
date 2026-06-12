# Self-Hosting Guide

Host your own instance of JobSearch AI with your own user base in ~15 minutes.

## What you need

- A GitHub account (free)
- A Supabase account (free tier)
- An Anthropic API key (pipeline default; users bring their own for scoring)

---

## Step 1 — Fork the repo

Fork [omriki55/omrigonenjobfinder](https://github.com/omriki55/omrigonenjobfinder) to your own GitHub account.

Enable GitHub Pages: **Settings → Pages → Source: main / folder: /docs**.

---

## Step 2 — Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Note your **Project URL** and **Service Role Key** (Settings → API).
3. In the SQL Editor, run the contents of `docs/supabase-setup.sql`.

---

## Step 3 — Point the frontend at your Supabase project

Edit `docs/supabase-config.js`:

```js
const SUPABASE_URL = 'https://YOUR_REF.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
```

Commit and push — Pages redeploys automatically.

---

## Step 4 — Add repo secrets

**Settings → Secrets and variables → Actions → New repository secret**

| Secret | Value |
|---|---|
| SUPABASE_URL | your project URL |
| SUPABASE_SERVICE_ROLE_KEY | your service role key |

---

## Step 5 — Customise the ATS board list (optional)

Default list is in `job_search/saas_pipeline.py` (DEFAULT_ATS). Override via Supabase:

```sql
INSERT INTO site_content (key, value)
VALUES ('platform:ats', '{"greenhouse":["co1"],"lever":[],"ashby":[]}');
```

---

## Step 6 — Create your admin account

Sign up on the live site, then in Supabase SQL Editor:

```sql
UPDATE profiles SET is_admin = true WHERE username = 'YOUR_USERNAME';
```

---

## Verify

Trigger a manual run: **Actions → SaaS Job Scan → Run workflow**.
Then sign in at `/docs/app.html` to confirm jobs appear.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Blank app | Check supabase-config.js URL/key |
| Workflow fails | Add the two repo secrets |
| Cannot sign up | Disable confirm-email in Supabase Auth settings |
| No jobs appear | Check user_secrets — Anthropic key must be saved |
