"""Flask web app for browsing scored jobs."""
import json
import os
import subprocess
import threading
from datetime import datetime, timezone
from pathlib import Path

from flask import Flask, jsonify, redirect, render_template, url_for

BASE_DIR = Path(__file__).parent
SCORED_JOBS_PATH = BASE_DIR / "scored_jobs.json"

app = Flask(__name__)

# Global flag to track if a refresh is running
_refresh_running = False


def _load_jobs() -> tuple[list[dict], datetime | None]:
    """Return (jobs, last_modified_utc) from scored_jobs.json."""
    if not SCORED_JOBS_PATH.exists():
        return [], None
    try:
        mtime = datetime.fromtimestamp(
            SCORED_JOBS_PATH.stat().st_mtime, tz=timezone.utc
        )
        with open(SCORED_JOBS_PATH, encoding="utf-8") as f:
            jobs = json.load(f)
        jobs.sort(key=lambda j: j.get("fit_score", 0), reverse=True)
        return jobs, mtime
    except Exception:
        return [], None


def _minutes_ago(dt: datetime | None) -> str:
    if dt is None:
        return "never"
    delta = datetime.now(tz=timezone.utc) - dt
    mins = int(delta.total_seconds() // 60)
    if mins < 1:
        return "just now"
    if mins == 1:
        return "1 minute ago"
    if mins < 60:
        return f"{mins} minutes ago"
    hours = mins // 60
    return f"{hours} hour{'s' if hours != 1 else ''} ago"


def _run_pipeline():
    global _refresh_running
    try:
        subprocess.run(
            ["python", str(BASE_DIR / "_live_run.py")],
            cwd=str(BASE_DIR),
            timeout=600,
        )
    finally:
        _refresh_running = False


@app.route("/")
def index():
    jobs, mtime = _load_jobs()
    last_updated = _minutes_ago(mtime)
    return render_template(
        "index.html",
        jobs=jobs,
        last_updated=last_updated,
        refreshing=_refresh_running,
    )


@app.route("/refresh")
def refresh():
    global _refresh_running
    if not _refresh_running:
        _refresh_running = True
        t = threading.Thread(target=_run_pipeline, daemon=True)
        t.start()
    return redirect(url_for("index"))


@app.route("/api/jobs")
def api_jobs():
    jobs, mtime = _load_jobs()
    return jsonify(
        {
            "jobs": jobs,
            "last_updated": mtime.isoformat() if mtime else None,
            "last_updated_label": _minutes_ago(mtime),
            "refreshing": _refresh_running,
            "count": len(jobs),
        }
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=False)
