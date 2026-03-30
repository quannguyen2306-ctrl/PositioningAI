"""
ingestion.py
------------
This modules: 
1. Scrapes the user's business website, strips nav/footer/scripts  
2. GPT-4o-mini extracts: name, industry, services, audience, UVP, search query  
"""

import re
import json
import requests
from bs4 import BeautifulSoup
from openai import OpenAI


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
