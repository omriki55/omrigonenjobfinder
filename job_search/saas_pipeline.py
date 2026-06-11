"""
SaaS scan pipeline — runs centrally via GitHub Actions.

For every registered user (Supabase `profiles`) who saved an Anthropic API
key (`user_secrets`), this script:
  1. scrapes the platform-wide ATS board list once (Greenhouse/Lever/Ashby),
  2. filters jobs per user by their target role titles,
  3. scores each new job with Claude Haiku using THE USER'S OWN API key,
  4. upserts results into the per-user `jobs` table (RLS: owner-only).

Required env vars (GitHub Actions secrets):
  SUPABASE_URL                e.g. https://xxxx.supabase.co
  SUPABASE_SERVICE_ROLE_KEY   service role key (bypasses RLS — server only!)
"""
import json
import os
import time
import urllib.parse
import urllib.request
from datetime import date

from anthropic import Anthropic

from ats_scraper import scrape_ats

SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

MAX_JOBS_PER_USER_PER_RUN = 20

# Platform default board list (admin can override via site_content key 'platform:ats')
DEFAULT_ATS = {
    "greenhouse": ["monday", "wiz", "fireblocks", "melio", "gong", "riskified",
                    "similarweb", "lemonade", "jfrog", "snyk", "taboola", "verbit"],
    "lever": ["yotpo", "bigpanda", "deel"],
    "ashby": ["island"],
}

SENIORITY_PREFIXES = ("head of ", "senior ", "sr. ", "sr ", "lead ", "principal ",
                       "director of ", "director, ", "vp of ", "vp ", "chief ", "staff ")


def _sb(method: str, path: str, body=None, prefer: str | None = None):
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    headers = {
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": "application/json",
    }
    if prefer:
        headers["Prefer"] = prefer
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=30) as r:
        raw = r.read().decode("utf-8")
        return json.loads(raw) if raw.strip() else None


def load_platform_ats() -> dict:
    try:
        rows = _sb("GET", "site_content?key=eq.platform%3Aats&select=value")
        if rows:
            cfg = json.loads(rows[0]["value"])
            if isinstance(cfg, dict) and cfg:
                print("  Using admin-configured ATS list")
                return cfg
    except Exception as e:
        print(f"  ⚠️  platform:ats read failed: {e}")
    return DEFAULT_ATS


def role_keywords(roles: list[str]) -> list[str]:
    """Build title-match phrases from a user's target roles."""
    out = set()
    for role in roles or []:
        r = (role or "").strip().lower()
        if len(r) < 3:
            continue
        out.add(r)
        for p in SENIORITY_PREFIXES:
            if r.startswith(p):
                stripped = r[len(p):].strip()
                if len(stripped) >= 3:
                    out.add(stripped)
    return sorted(out)


def title_matches(title: str, keywords: list[str]) -> bool:
    t = (title or "").lower()
    return any(k in t for k in keywords)


def build_scoring_prompt(profile: dict) -> str:
    roles = ", ".join(profile.get("roles") or []) or "any relevant role"
    name = profile.get("full_name") or profile.get("username") or "the candidate"
    background = profile.get("profile_summary") or "Not provided"
    location = profile.get("location") or "Not specified"
    return f"""You are evaluating a job listing for {name}.

CANDIDATE PROFILE:
- Target roles: {roles}
- Background: {background}
- Acceptable locations: {location} (remote/global also OK unless stated otherwise)

JOB LISTING:
Company: {{company}}
Role: {{title}}
Location: {{location_}}
Description: {{description}}

Respond in JSON ONLY:
{{{{
  "fit_score": <integer 1-10>,
  "score_reason": "<1-2 sentences>",
  "ai_opener": "<2-3 sentence personalized cold outreach opener specific to this company>",
  "location_ok": <true/false>
}}}}
If location_ok is false, set fit_score to 0."""


def score_job(client: Anthropic, prompt_tpl: str, job: dict) -> dict | None:
    prompt = prompt_tpl.format(
        company=job.get("company", ""),
        title=job.get("title", ""),
        location_=job.get("location", ""),
        description=(job.get("description") or "")[:800],
    )
    for attempt in range(2):
        try:
            resp = client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=512,
                messages=[{"role": "user", "content": prompt}],
            )
            text = resp.content[0].text.strip()
            if "```" in text:
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
                text = text.split("```")[0]
            result = json.loads(text.strip())
            return {
                "fit_score": int(result.get("fit_score", 0)),
                "score_reason": result.get("score_reason", ""),
                "ai_opener": result.get("ai_opener", ""),
            }
        except Exception as e:
            if attempt == 0:
                time.sleep(3)
            else:
                print(f"      ⚠️  scoring failed: {e}")
    return None


def process_user(profile: dict, key: str, all_jobs: list[dict]):
    username = profile.get("username", "?")
    uid = profile["user_id"]
    keywords = role_keywords(profile.get("roles") or [])
    if not keywords:
        print(f"  {username}: no roles configured — skipping")
        return

    existing = _sb("GET", f"jobs?user_id=eq.{uid}&select=url")
    existing_urls = {r["url"] for r in (existing or [])}

    candidates = [j for j in all_jobs
                  if title_matches(j["title"], keywords) and j["url"] not in existing_urls]
    candidates = candidates[:MAX_JOBS_PER_USER_PER_RUN]
    print(f"  {username}: {len(candidates)} new matching jobs to score")
    if not candidates:
        _sb("PATCH", f"profiles?user_id=eq.{uid}", {"last_scanned": _now_iso()})
        return

    client = Anthropic(api_key=key)
    prompt_tpl = build_scoring_prompt(profile)
    rows = []
    today = date.today().isoformat()
    for i, job in enumerate(candidates):
        print(f"    scoring {i + 1}/{len(candidates)}: {job['title']} @ {job['company']}")
        scored = score_job(client, prompt_tpl, job)
        if scored is None:
            continue
        rows.append({
            "user_id": uid,
            "company": job.get("company", ""),
            "title": job.get("title", ""),
            "location": job.get("location", ""),
            "url": job.get("url", ""),
            "description": (job.get("description") or "")[:600],
            "fit_score": scored["fit_score"],
            "score_reason": scored["score_reason"],
            "ai_opener": scored["ai_opener"],
            "posted": job.get("posted") or today,
            "scan_date": today,
        })
        if (i + 1) % 5 == 0:
            time.sleep(1)

    if rows:
        _sb("POST", "jobs?on_conflict=user_id,url", rows,
            prefer="resolution=merge-duplicates,return=minimal")
        print(f"    saved {len(rows)} jobs")
    _sb("PATCH", f"profiles?user_id=eq.{uid}", {"last_scanned": _now_iso()})


def _now_iso() -> str:
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat()


def main():
    print("👥 Loading users...")
    profiles = _sb("GET", "profiles?select=user_id,username,full_name,roles,location,profile_summary") or []
    secrets = _sb("GET", "user_secrets?select=user_id,anthropic_key") or []
    keys = {s["user_id"]: s["anthropic_key"] for s in secrets if s.get("anthropic_key")}
    active = [p for p in profiles if p["user_id"] in keys]
    print(f"  {len(profiles)} users, {len(active)} with API keys")
    if not active:
        print("Nothing to do.")
        return

    print("🔍 Scraping ATS boards (platform-wide, once)...")
    ats = load_platform_ats()
    # keywords=[''] disables the title pre-filter (matched per user later);
    # default location filter (Israel + remote) still applies.
    all_jobs = scrape_ats(ats, keywords=[""])
    # de-dup by url
    seen = set()
    unique_jobs = []
    for j in all_jobs:
        if j["url"] and j["url"] not in seen:
            seen.add(j["url"])
            unique_jobs.append(j)
    print(f"  {len(unique_jobs)} unique jobs scraped")

    for profile in active:
        try:
            process_user(profile, keys[profile["user_id"]], unique_jobs)
        except Exception as e:
            print(f"  ⚠️  user {profile.get('username')}: {e}")

    print("✅ Done")


if __name__ == "__main__":
    main()
