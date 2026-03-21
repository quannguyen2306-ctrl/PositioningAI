"""
retrieval.py
------------
Uses the Serper API to find competitor URLs from a search query,
then fetches and returns their text content.
"""

import requests
from .ingestion import fetch_url

SERPER_ENDPOINT = "https://google.serper.dev/search"

# Sites we don't want as "competitors" — social/directory/aggregator noise
BLOCKLIST = [
    "youtube.com", "facebook.com", "twitter.com", "x.com",
    "instagram.com", "linkedin.com", "tiktok.com",
    "yelp.com", "tripadvisor.com", "bbb.org",
    "wikipedia.org", "reddit.com", "quora.com",
    "amazon.com", "ebay.com",
]


def _is_blocked(url: str) -> bool:
    return any(domain in url for domain in BLOCKLIST)


def search_competitors(
    query: str,
    serper_api_key: str,
    n: int = 10,
) -> list[str]:
    """
    Query Serper (Google Search API) and return up to n competitor URLs.
    Filters out social media, directories, and aggregator sites.
    """
    headers = {
        "X-API-KEY": serper_api_key,
        "Content-Type": "application/json",
    }
    payload = {"q": query, "num": min(n + 5, 20)}  # fetch extra to allow filtering

    resp = requests.post(SERPER_ENDPOINT, headers=headers, json=payload, timeout=12)
    resp.raise_for_status()
    data = resp.json()

    urls: list[str] = []
    for result in data.get("organic", []):
        url = result.get("link", "")
        if url and not _is_blocked(url):
            urls.append(url)
        if len(urls) >= n:
            break

    return urls


def fetch_competitor_docs(
    urls: list[str],
    max_per_doc: int = 8000,  # chars — cap very large pages
) -> list[dict]:
    """
    Scrape text from each competitor URL.
    Returns list of dicts: {url, text, title}.
    Silently skips failed fetches (blocked, timeout, etc.).
    """
    docs: list[dict] = []

    for url in urls:
        try:
            text = fetch_url(url)
            if len(text) > 150:   # ignore near-empty pages
                docs.append({
                    "url": url,
                    "text": text[:max_per_doc],
                    "domain": url.replace("https://", "").replace("http://", "").split("/")[0],
                })
        except Exception:
            # Gracefully skip — many sites block scrapers
            continue

    return docs
