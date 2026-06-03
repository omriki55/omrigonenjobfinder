"""LinkedIn public job search scraper (no auth required)."""
import logging
import time

import requests
from bs4 import BeautifulSoup

from config import SEARCH_QUERIES

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "Referer": "https://www.linkedin.com/",
    "DNT": "1",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
}

SEARCH_URLS = [
    # Israel remote/hybrid
    "https://www.linkedin.com/jobs/search/?keywords={query}&location=Israel&f_WT=2",
    # Global remote
    "https://www.linkedin.com/jobs/search/?keywords={query}&f_WT=2",
]


def _fetch(url: str, timeout: int = 10) -> BeautifulSoup | None:
    try:
        resp = requests.get(url, headers=HEADERS, timeout=timeout)
        resp.raise_for_status()
        return BeautifulSoup(resp.text, "html.parser")
    except Exception as e:
        logger.warning(f"Failed to fetch {url}: {e}")
        return None


def _get_job_description(job_url: str) -> str:
    soup = _fetch(job_url, timeout=15)
    if not soup:
        return ""
    for selector in [".show-more-less-html__markup", ".description__text"]:
        el = soup.select_one(selector)
        if el:
            return el.get_text(separator=" ", strip=True)[:3000]
    return ""


def _parse_job_cards(soup: BeautifulSoup) -> list[dict]:
    jobs = []
    cards = soup.select("div.base-card, li.jobs-search__results-list > div")
    for card in cards:
        try:
            title_el = card.select_one(
                "h3.base-search-card__title, h3.job-search-card__title"
            )
            company_el = card.select_one(
                "h4.base-search-card__subtitle, a.hidden-nested-link"
            )
            location_el = card.select_one(
                "span.job-search-card__location, span.base-search-card__metadata"
            )
            link_el = card.select_one(
                "a.base-card__full-link, a.job-search-card__full-link"
            )
            if not (title_el and link_el):
                continue
            title = title_el.get_text(strip=True)
            company = company_el.get_text(strip=True) if company_el else ""
            location = location_el.get_text(strip=True) if location_el else ""
            url = link_el["href"].split("?")[0]  # strip tracking params
            jobs.append(
                {
                    "title": title,
                    "company": company,
                    "location": location,
                    "url": url,
                    "job_type": "Full-time",
                }
            )
        except Exception as e:
            logger.debug(f"Skipping card: {e}")
    return jobs


def scrape_linkedin() -> list[dict]:
    seen_urls: set[str] = set()
    results: list[dict] = []

    for query in SEARCH_QUERIES:
        for url_template in SEARCH_URLS:
            url = url_template.format(query=requests.utils.quote(query))
            try:
                soup = _fetch(url)
                if not soup:
                    continue
                cards = _parse_job_cards(soup)
                logger.info(
                    f"LinkedIn [{query}] @ {url_template[:60]}: {len(cards)} cards"
                )
                for job in cards:
                    job_url = job["url"]
                    if not job_url or job_url in seen_urls:
                        continue
                    seen_urls.add(job_url)
                    description = _get_job_description(job_url)
                    time.sleep(0.5)  # polite delay
                    results.append(
                        {
                            "company": job["company"],
                            "title": job["title"],
                            "location": job["location"],
                            "url": job_url,
                            "description": description,
                            "job_type": job["job_type"],
                            "source": "LinkedIn",
                        }
                    )
            except Exception as e:
                logger.warning(
                    f"LinkedIn scraper error for query '{query}': {e}", exc_info=True
                )
                continue
            time.sleep(1)  # polite delay between search pages

    logger.info(f"LinkedIn: {len(results)} unique jobs collected")
    return results
