"""
tests/test_parallel_fetch.py
----------------------------
Unit test for the concurrent competitor fetch. Mocks the page fetcher so it
runs without the network.

  cd backend && python tests/test_parallel_fetch.py
"""

import sys
import os
import threading

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pipeline.retrieval as retrieval


def test_parallel_fetch_order_and_skips():
    """All URLs attempted; order preserved; blocked + near-empty pages skipped."""
    attempted: list[str] = []
    lock = threading.Lock()

    def fake_fetch(url: str) -> str:
        with lock:
            attempted.append(url)
        if "blocked" in url:
            raise RuntimeError("403 Forbidden")
        if "empty" in url:
            return "tiny"            # <= 150 chars → skipped as near-empty
        return f"real content for {url} " + ("x" * 200)

    urls = [
        "https://a.com/x",
        "https://blocked.com/y",
        "https://b.com/z",
        "https://empty.com/w",
        "https://c.com/v",
    ]

    original = retrieval.fetch_url
    retrieval.fetch_url = fake_fetch
    try:
        docs = retrieval.fetch_competitor_docs(urls)
    finally:
        retrieval.fetch_url = original

    # Every URL was attempted (fan-out covered all inputs).
    assert sorted(attempted) == sorted(urls), "not all URLs attempted"

    # Blocked + empty dropped; the rest kept in original input order.
    assert [d["url"] for d in docs] == [
        "https://a.com/x", "https://b.com/z", "https://c.com/v"
    ], f"order/skip wrong: {[d['url'] for d in docs]}"

    # Return shape unchanged.
    assert set(docs[0].keys()) == {"url", "text", "domain"}
    assert docs[0]["domain"] == "a.com"

    print("  PASS  parallel fetch preserves order, skips failures, shape intact")


def test_parallel_fetch_empty_input():
    """No URLs → empty list, no pool created."""
    assert retrieval.fetch_competitor_docs([]) == []
    print("  PASS  empty URL list returns []")


if __name__ == "__main__":
    print("Running parallel-fetch tests (no network)...\n")
    for t in (test_parallel_fetch_order_and_skips, test_parallel_fetch_empty_input):
        try:
            t()
        except Exception as e:
            print(f"  FAIL  {t.__name__}: {e}")
