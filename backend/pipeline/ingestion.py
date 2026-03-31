"""
ingestion.py
------------
This modules: 
1. Scrapes the user's business website, strips nav/footer/scripts  
2. GPT-4o-mini extracts: name, industry, services, audience, UVP, search query  
"""

import re
import json
import ipaddress
import logging
import socket
import requests
from bs4 import BeautifulSoup
from openai import OpenAI
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# SSRF protection
# ---------------------------------------------------------------------------

_PRIVATE_NETWORKS = [
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("169.254.0.0/16"),   # link-local / AWS metadata
    ipaddress.ip_network("100.64.0.0/10"),     # carrier-grade NAT
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),          # IPv6 ULA
]

_ALLOWED_SCHEMES = {"http", "https"}

# Hostnames that must never be resolved (cloud metadata endpoints)
_BLOCKED_HOSTNAMES = {
    "metadata.google.internal",
    "metadata.internal",
    "169.254.169.254",
}


def validate_url(url: str) -> None:
    """
    Validate a URL to prevent Server-Side Request Forgery (SSRF).

    Raises ValueError for:
    - Non-HTTP(S) schemes
    - Private / reserved IP ranges
    - Known cloud metadata hostnames
    - Missing or empty hostname
    """
    parsed = urlparse(url)

    if parsed.scheme not in _ALLOWED_SCHEMES:
        raise ValueError(f"Disallowed URL scheme: {parsed.scheme!r}")

    hostname = parsed.hostname
    if not hostname:
        raise ValueError("URL is missing a hostname")

    if hostname.lower() in _BLOCKED_HOSTNAMES:
        raise ValueError(f"Blocked hostname: {hostname}")

    # Attempt to resolve the hostname; if it resolves to a private range, block it
    try:
        addr_str = socket.getaddrinfo(hostname, None)[0][4][0]
        ip = ipaddress.ip_address(addr_str)
        for net in _PRIVATE_NETWORKS:
            if ip in net:
                raise ValueError(f"URL resolves to a private/reserved IP address: {ip}")
    except socket.gaierror:
        # Hostname doesn't resolve — allow the request to fail naturally
        pass


# ---------------------------------------------------------------------------
# URL fetching
# ---------------------------------------------------------------------------

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (compatible; LLM-Visibility-Diagnostic/1.0; "
        "+https://github.com/your-org/llm-visibility)"
    )
}


def fetch_url(url: str, timeout: int = 15) -> str:
    """
    Fetch a URL and return clean readable text.
    Strips nav, footer, script, style tags.
    """
    resp = requests.get(url, headers=HEADERS, timeout=timeout)
    resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "lxml")

    # Remove non-content elements
    for tag in soup(["script", "style", "nav", "footer", "header",
                     "aside", "form", "noscript", "svg", "iframe"]):
        tag.decompose()

    text = soup.get_text(separator=" ", strip=True)
    # Collapse whitespace
    text = re.sub(r"\s+", " ", text).strip()
    return text


# ---------------------------------------------------------------------------
# Chunking
# ---------------------------------------------------------------------------

def chunk_text(
    text: str,
    chunk_size: int = 300,   # words per chunk (~400 tokens)
    overlap: int = 40,       # words of overlap between chunks
) -> list[str]:
    """
    Split text into overlapping word-count chunks.
    Skips chunks that are too short to be meaningful.
    """
    words = text.split()
    chunks: list[str] = []
    start = 0

    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunk = " ".join(words[start:end])
        if len(chunk.strip()) > 80:  # skip near-empty chunks
            chunks.append(chunk)
        start += chunk_size - overlap

    return chunks


# ---------------------------------------------------------------------------
# Business context extraction
# ---------------------------------------------------------------------------

CONTEXT_PROMPT = """Analyze this business website content and extract key information.

Content (first 3000 chars):
{text}

Return ONLY a valid JSON object with these exact keys:
{{
  "business_name": "name of the business",
  "industry": "primary industry or sector (e.g. SaaS, Bakery, Legal Services)",
  "products_services": ["main product or service 1", "main product or service 2"],
  "target_audience": "who they primarily serve (e.g. small business owners, students)",
  "location": "city/region if mentioned, else 'Not specified'",
  "unique_value_prop": "what makes them different — one clear sentence",
  "search_query": "a 8-12 word Google search query to find COMPETING businesses offering similar products/services"
}}

Important: the search_query should help find COMPETITORS, not the business itself.
Example: if the business is a vegan bakery in Toronto, the query might be
'vegan bakery Toronto artisan plant-based cakes small business'."""


def extract_business_context(text: str, client: OpenAI) -> dict:
    """
    Use GPT-4o-mini to extract structured business information from website text.
    Returns a dict with keys: business_name, industry, products_services,
    target_audience, location, unique_value_prop, search_query.
    """
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "user", "content": CONTEXT_PROMPT.format(text=text[:3000])}
        ],
        response_format={"type": "json_object"},
        temperature=0.2,
    )

    try:
        return json.loads(response.choices[0].message.content)
    except json.JSONDecodeError:
        # Fallback with minimal info
        return {
            "business_name": "Unknown Business",
            "industry": "Unknown",
            "products_services": [],
            "target_audience": "Unknown",
            "location": "Not specified",
            "unique_value_prop": "",
            "search_query": "small business services",
        }
