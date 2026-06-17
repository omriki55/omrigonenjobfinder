"""
SaaS scan pipeline v2 — runs centrally via GitHub Actions.

Improvements over v1:
  • Multi-dimensional scoring: skills / seniority / location / growth / comp
    → weighted fit_score + comp_estimate + gaps[] + verdict + apply (bool)
  • Writes rich data to jobs.meta (JSONB) when the column exists — detected at
    runtime so the same binary works before/after the schema migration.
  • Liveness check: re-checks URLs that are 7+ days old and marks gone ones
    fit_score=0 / status='נסגרה' so the tracker flags them.
  • apply threshold configurable via site_content key 'platform:apply_threshold'
    (default 6).

Required env vars (GitHub Actions secrets):
  SUPABASE_URL                e.g. https://xxxx.supabase.co
  SUPABASE_SERVICE_ROLE_KEY   service role key (bypasses RLS — server only!)
"""
import json
import os
import time
import urllib.parse
import urllib.request
import re
from datetime import date, datetime, timezone

from anthropic import Anthropic

from ats_scraper import scrape_ats

SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

MAX_JOBS_PER_USER_PER_RUN = 20
LIVENESS_AGE_DAYS = 7          # re-check jobs older than this
LIVENESS_SAMPLE = 10           # max jobs to liveness-check per run per user

DEFAULT_APPLY_THRESHOLD = 6

DEFAULT_ATS = {
    # All slugs below were verified live against each ATS public API
    # (board returns active postings). Dead/migrated slugs were removed.
    "greenhouse": [
        # Core Israeli-presence companies (verified live)
        "fireblocks", "melio", "riskified", "similarweb", "jfrog", "taboola",
        "nice", "forter", "torq", "payoneer", "bigid",
        # Expanded coverage (verified live)
        "transmitsecurity", "lightricks", "descope", "bringg", "pagaya",
        "optimove", "augury", "zoominfo", "orcasecurity", "appsflyer",
        "saltsecurity", "catonetworks", "axonius", "cybereason", "sisense",
        "yotpo",
        # Batch 3 — verified live against Greenhouse API, all with active
        # Israel-located openings (token shown; company name comes from the API)
        "sentinellabs",       # SentinelOne
        "wizinc",             # Wiz
        "gongio",             # Gong
        "armissecurity",      # Armis
        "aidocmedical",       # Aidoc
        "tipaltisolutions",   # Tipalti
        "openweb",            # OpenWeb
        "cymulate",           # Cymulate
        # Batch 4 — verified live against Greenhouse API with active Israel roles
        "datarails",          # Datarails
        "tomorrow",           # Tomorrow.io
        "workato",            # Workato (Tel Aviv R&D)
        "tripactions",        # Navan (ex-TripActions)
    ],
    "lever": [
        "walkme",
        "cloudinary",         # Cloudinary — verified live, Israel roles
    ],
    # Ashby boards — verified live against the Ashby posting API, Israel roles
    "ashby": [
        "lemonade",           # Lemonade
        "unit",               # Unit (fintech)
    ],
    # Comeet (very common ATS in Israel). Each entry is "COMPANY_UID:API_TOKEN";
    # both are public values harvested from the company's careers page.
    "comeet": [
        "10.000:1030901050040401080",                 # guesty
        "45.00A:54A1A7225062A50FDE2F9A1FBC01FBC1528",  # minute media
    ],
    # Workable: tokens are search keywords (not company slugs).
    # Returns cross-company results filtered to Israel by the location filter.
    "workable": [
        "revops", "revenue operations", "go-to-market",
        "sales operations", "marketing operations", "growth",
    ],
}

# Broad go-to-market / RevOps role family. Merged into each user's own role
# keywords so GTM-adjacent titles are caught even when they don't substring-match
# the user's exact configured role names.
GTM_KEYWORDS = [
    "gtm", "go-to-market", "go to market",
    "revenue operation", "revops", "rev ops", "revenue strategy",
    "sales operation", "sales ops", "sales strategy", "sales enablement",
    "marketing operation", "marketing ops", "demand generation",
    "growth", "business operation", "revenue enablement", "partnerships",
]

SENIORITY_PREFIXES = ("head of ", "senior ", "sr. ", "sr ", "lead ", "principal ",
                      "director of ", "director, ", "vp of ", "vp ", "chief ", "staff ")


# ─── Supabase helpers ────────────────────────────────────────────────────────

def _sb(method: str, path: str, body=None, prefer: str | None = None):
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    # Percent-encode non-ASCII (e.g. Hebrew status values like 'נסגרה' used in
    # filters) so urllib can build the request without an 'ascii' codec crash.
    url = urllib.parse.quote(url, safe="%/:?#[]@!$&'()*+,;=.~_-")
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


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ─── Config loaders ──────────────────────────────────────────────────────────

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


def load_apply_threshold() -> int:
    try:
        rows = _sb("GET", "site_content?key=eq.platform%3Aapply_threshold&select=value")
        if rows:
            return int(rows[0]["value"])
    except Exception:
        pass
    return DEFAULT_APPLY_THRESHOLD


def load_exclude_titles():
    """Title substrings to drop from scans. Admin-configurable via the
    site_content key 'platform:exclude_titles' (JSON list of strings).
    Falls back to the scraper's built-in defaults when unset."""
    try:
        rows = _sb("GET", "site_content?key=eq.platform%3Aexclude_titles&select=value")
        if rows:
            cfg = json.loads(rows[0]["value"])
            if isinstance(cfg, list):
                print(f"  Using admin exclude list ({len(cfg)} terms)")
                return [str(x) for x in cfg]
    except Exception as e:
        print(f"  ⚠️  platform:exclude_titles read failed: {e}")
    return None  # scrape_ats uses its built-in defaults


def detect_meta_column() -> bool:
    """Return True if jobs table has a 'meta' column (runtime detection)."""
    try:
        # Try fetching a single row with meta — 400 = column missing, 200 = exists
        _sb("GET", "jobs?select=meta&limit=1")
        return True
    except Exception:
        return False


# ─── Matching helpers ─────────────────────────────────────────────────────────

def role_keywords(roles: list[str]) -> list[str]:
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


# ─── Scoring ──────────────────────────────────────────────────────────────────

SCORING_PROMPT = """\
You are a precise job-fit evaluator. Score this opening for the candidate below.

CANDIDATE:
- Target roles: {roles}
- Background: {background}
- Preferred location: {location}

JOB:
Company: {company}
Title: {title}
Location: {job_location}
Description: {description}

Respond ONLY with valid JSON (no markdown):
{{
  "dimensions": {{
    "skills": <1-10>,
    "seniority": <1-10>,
    "location": <1-10>,
    "growth": <1-10>,
    "comp": <1-10>
  }},
  "fit_score": <weighted integer 1-10; weights: skills×0.35, seniority×0.25, location×0.20, growth×0.10, comp×0.10>,
  "comp_estimate": "<salary range string, e.g. '25–35K NIS/mo' or 'unknown'>",
  "gaps": ["<gap 1>", "<gap 2>"],
  "verdict": "<one crisp sentence: why apply or skip>",
  "apply": <true if fit_score >= {threshold}, else false>,
  "score_reason": "<1-2 sentences summarising the score>",
  "ai_opener": "<2-3 sentence personalised cold outreach opener for this specific company>"
}}
If the location is incompatible and non-remote set location dimension to 1 and fit_score to 0.\
"""


def score_job(client: Anthropic, profile: dict, job: dict, threshold: int) -> dict | None:
    roles = ", ".join(profile.get("roles") or []) or "any relevant role"
    background = profile.get("profile_summary") or "Not provided"
    location = profile.get("location") or "Not specified"

    prompt = SCORING_PROMPT.format(
        roles=roles,
        background=background,
        location=location,
        company=job.get("company", ""),
        title=job.get("title", ""),
        job_location=job.get("location", ""),
        description=(job.get("description") or "")[:900],
        threshold=threshold,
    )
    for attempt in range(2):
        try:
            resp = client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=700,
                messages=[{"role": "user", "content": prompt}],
            )
            text = resp.content[0].text.strip()
            if "```" in text:
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
                text = text.split("```")[0]
            return json.loads(text.strip())
        except Exception as e:
            if attempt == 0:
                time.sleep(3)
            else:
                print(f"      ⚠️  scoring failed: {e}")
    return None


# ─── Liveness ─────────────────────────────────────────────────────────────────

def check_liveness(url: str) -> bool:
    """Return False if the URL returns 404/410 (job taken down)."""
    if not url:
        return True
    # Percent-encode any non-ASCII characters (e.g. Hebrew in the path/query)
    # so urllib doesn't raise "'ascii' codec can't encode" on the request URL.
    try:
        url = urllib.parse.quote(url, safe=":/?#[]@!$&'()*+,;=%~")
    except Exception:
        return True
    try:
        req = urllib.request.Request(url, method="HEAD",
                                     headers={"User-Agent": "JobSearchAI-liveness/1.0"})
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.status < 400
    except urllib.error.HTTPError as e:
        return e.code not in (404, 410)
    except Exception:
        return True  # network error → assume alive


def run_liveness_check(uid: str):
    """Mark old jobs that 404 as closed."""
    cutoff = date.today().isoformat()
    # jobs older than LIVENESS_AGE_DAYS, not already closed, limit sample
    rows = _sb(
        "GET",
        f"jobs?user_id=eq.{uid}"
        f"&scan_date=lt.{cutoff}"
        f"&status=neq.נסגרה"
        f"&select=id,url,scan_date"
        f"&order=scan_date.asc"
        f"&limit={LIVENESS_SAMPLE}"
    ) or []

    # filter to LIVENESS_AGE_DAYS old
    from datetime import timedelta
    threshold_date = (date.today() - timedelta(days=LIVENESS_AGE_DAYS)).isoformat()
    old = [r for r in rows if (r.get("scan_date") or "") <= threshold_date]

    closed = 0
    for row in old:
        if not check_liveness(row["url"]):
            _sb("PATCH", f"jobs?id=eq.{row['id']}",
                {"fit_score": 0, "status": "נסגרה", "score_reason": "המשרה הוסרה"})
            closed += 1
        time.sleep(0.3)

    if closed:
        print(f"    liveness: {closed}/{len(old)} jobs marked closed")


# ─── Per-user processing ──────────────────────────────────────────────────────

def process_user(profile: dict, key: str, all_jobs: list[dict],
                 threshold: int, has_meta: bool):
    username = profile.get("username", "?")
    uid = profile["user_id"]
    keywords = role_keywords(profile.get("roles") or [])
    if not keywords:
        print(f"  {username}: no roles configured — skipping")
        return
    # Broaden recall with the GTM/RevOps family (dedupe, keep stable order).
    keywords = sorted(set(keywords) | set(GTM_KEYWORDS))

    existing = _sb("GET", f"jobs?user_id=eq.{uid}&select=url") or []
    existing_urls = {r["url"] for r in existing}

    candidates = [j for j in all_jobs
                  if title_matches(j["title"], keywords) and j["url"] not in existing_urls]
    candidates = candidates[:MAX_JOBS_PER_USER_PER_RUN]
    print(f"  {username}: {len(candidates)} new matching jobs to score")

    # Liveness check on old jobs (background, best-effort)
    try:
        run_liveness_check(uid)
    except Exception as e:
        print(f"    liveness check error: {e}")

    client = Anthropic(api_key=key)
    rows = []
    today = date.today().isoformat()

    for i, job in enumerate(candidates):
        print(f"    scoring {i+1}/{len(candidates)}: {job['title']} @ {job['company']}")
        scored = score_job(client, profile, job, threshold)
        if scored is None:
            continue

        row = {
            "user_id": uid,
            "company": job.get("company", ""),
            "title": job.get("title", ""),
            "location": job.get("location", ""),
            "url": job.get("url", ""),
            "description": (job.get("description") or "")[:600],
            "fit_score": int(scored.get("fit_score", 0)),
            "score_reason": scored.get("score_reason", ""),
            "ai_opener": scored.get("ai_opener", ""),
            "posted": job.get("posted") or today,
            "scan_date": today,
        }

        if has_meta:
            row["meta"] = json.dumps({
                "dimensions": scored.get("dimensions"),
                "comp_estimate": scored.get("comp_estimate"),
                "gaps": scored.get("gaps", []),
                "verdict": scored.get("verdict", ""),
                "apply": scored.get("apply", row["fit_score"] >= threshold),
            })

        rows.append(row)
        if (i + 1) % 5 == 0:
            time.sleep(1)

    if rows:
        _sb("POST", "jobs?on_conflict=user_id,url", rows,
            prefer="resolution=merge-duplicates,return=minimal")
        print(f"    saved {len(rows)} jobs")

    # Re-score jobs still at fit_score 0 (e.g. manually/email-added) so they get
    # a real AI score instead of a misleading 0. min 1 so they aren't re-picked.
    try:
        unscored = _sb("GET",
            f"jobs?user_id=eq.{uid}&fit_score=eq.0&status=neq.נסגרה"
            f"&select=id,company,title,location,url,description&limit=12") or []
        rescored = 0
        for jb in unscored:
            scored = score_job(client, profile, jb, threshold)
            if not scored:
                continue
            fs = max(1, int(scored.get("fit_score", 0)))
            patch = {
                "fit_score": fs,
                "score_reason": scored.get("score_reason", ""),
                "ai_opener": scored.get("ai_opener", ""),
            }
            if has_meta:
                patch["meta"] = json.dumps({
                    "dimensions": scored.get("dimensions"),
                    "comp_estimate": scored.get("comp_estimate"),
                    "gaps": scored.get("gaps", []),
                    "verdict": scored.get("verdict", ""),
                    "apply": scored.get("apply", fs >= threshold),
                })
            _sb("PATCH", f"jobs?id=eq.{jb['id']}", patch)
            rescored += 1
            time.sleep(0.4)
        if rescored:
            print(f"    re-scored {rescored} previously-unscored jobs")
    except Exception as e:
        print(f"    re-score error: {e}")

    _sb("PATCH", f"profiles?user_id=eq.{uid}", {"last_scanned": _now_iso()})


# ─── Main ─────────────────────────────────────────────────────────────────────

HEALTH_FLOOR = 8  # if fewer than this many jobs scrape platform-wide, alert (likely breakage)


def _norm(x: str) -> str:
    x = (x or "").lower()
    x = re.sub(r"\b(ai|inc|ltd|labs|technologies|technology|software|solutions|the)\b", " ", x)
    return re.sub(r"[^a-z0-9֐-׿]+", "", x).strip()


def _send_health_alert(scraped: int):
    key = os.environ.get("RESEND_API_KEY", "")
    to = os.environ.get("ALERT_EMAIL", "")
    if not key or not to:
        print("  (health alert: RESEND_API_KEY/ALERT_EMAIL not set — skipping)")
        return
    body = json.dumps({
        "from": os.environ.get("ALERT_FROM", "onboarding@resend.dev"),
        "to": [to],
        "subject": "\u26a0\ufe0f JobSearch scan health: very few jobs scraped",
        "html": f"<p>The daily scan scraped only <b>{scraped}</b> jobs platform-wide "
                f"(floor {HEALTH_FLOOR}). This usually means an ATS API changed or a "
                f"scraper broke \u2014 worth a look.</p>",
    }).encode()
    req = urllib.request.Request(
        "https://api.resend.com/emails", data=body, method="POST",
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json",
                 "User-Agent": "Mozilla/5.0 (compatible; JobSearchAI/1.0)"})
    try:
        with urllib.request.urlopen(req, timeout=15):
            print("  \U0001f4e7 scan-health alert sent")
    except Exception as e:
        print(f"  health alert failed: {e}")


def main():
    print("👥 Loading users...")
    profiles = _sb("GET",
                   "profiles?select=user_id,username,full_name,roles,location,profile_summary,last_scanned"
                   ) or []
    secrets = _sb("GET", "user_secrets?select=user_id,anthropic_key") or []
    keys = {s["user_id"]: s["anthropic_key"] for s in secrets if s.get("anthropic_key")}
    active = [p for p in profiles if p["user_id"] in keys]
    print(f"  {len(profiles)} users, {len(active)} with API keys")
    if not active:
        print("Nothing to do.")
        return

    # ONLY_NEW mode (frequent catch-up run): score only users who have never
    # been scanned, so new sign-ups get their first jobs within minutes instead
    # of waiting for the daily deep scan. Exits cheaply (before scraping) when
    # there are no new users.
    if os.getenv("ONLY_NEW") == "1":
        active = [p for p in active if not p.get("last_scanned")]
        if not active:
            print("  ONLY_NEW: no new users to scan — exiting")
            print("✅ Done")
            return
        print(f"  ONLY_NEW: {len(active)} new user(s) to onboard")

    threshold = load_apply_threshold()
    print(f"  apply threshold: {threshold}/10")

    has_meta = detect_meta_column()
    print(f"  jobs.meta column: {'✅' if has_meta else '⏳ not yet — skipping meta writes'}")

    print("🔍 Scraping ATS boards (platform-wide, once)...")
    ats = load_platform_ats()
    all_jobs = scrape_ats(ats, keywords=[""], exclude=load_exclude_titles())
    seen: set[str] = set()
    seen_rt: set[str] = set()  # normalized company|title — collapse cross-source dupes
    unique_jobs = []
    for j in all_jobs:
        if not j["url"] or j["url"] in seen:
            continue
        rt = _norm(j.get("company")) + "|" + _norm(j.get("title"))
        if rt and rt in seen_rt:
            continue
        seen.add(j["url"])
        seen_rt.add(rt)
        unique_jobs.append(j)
    print(f"  {len(unique_jobs)} unique jobs scraped")
    if len(unique_jobs) < HEALTH_FLOOR and os.getenv("ONLY_NEW") != "1":
        print(f"  \u26a0\ufe0f  scrape health: only {len(unique_jobs)} jobs (<{HEALTH_FLOOR}) \u2014 sending alert")
        _send_health_alert(len(unique_jobs))

    for profile in active:
        try:
            process_user(profile, keys[profile["user_id"]], unique_jobs,
                         threshold, has_meta)
        except Exception as e:
            print(f"  ⚠️  user {profile.get('username')}: {e}")

    print("✅ Done")


if __name__ == "__main__":
    main()
