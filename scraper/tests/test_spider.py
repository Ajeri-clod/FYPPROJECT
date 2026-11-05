"""End-to-end: run the real spider against a tiny local job site."""

import argparse
import csv
import functools
import http.server
import shutil
import threading
from pathlib import Path

import pytest

import scrape_jobs

FIX = Path(__file__).parent / "fixtures"


@pytest.fixture()
def site(tmp_path):
    root = tmp_path / "site"
    (root / "job").mkdir(parents=True)
    (root / "private").mkdir()
    (root / "robots.txt").write_text("User-agent: *\nDisallow: /private/\n")
    (root / "jobs.html").write_text(
        '<a href="/job/1-customer-service">1</a> <a href="/job/2-packer">2</a>'
        '<a href="/private/9-secret">blocked by robots</a> <a href="/about">about</a>'
        '<a rel="next" href="/jobs2.html">Next</a>'
    )
    (root / "jobs2.html").write_text(
        '<a href="/job/3-barista">3</a> <a href="/job/4-kerani">4</a> <a href="/job/1-customer-service">dup</a>'
    )
    shutil.copy(FIX / "job_jsonld.html", root / "job" / "1-customer-service")
    shutil.copy(FIX / "job_graph.html", root / "job" / "2-packer")
    shutil.copy(FIX / "job_kl.html", root / "job" / "3-barista")
    shutil.copy(FIX / "job_plain.html", root / "job" / "4-kerani")
    shutil.copy(FIX / "job_jsonld.html", root / "private" / "9-secret")

    class Handler(http.server.SimpleHTTPRequestHandler):
        def guess_type(self, path):
            return "text/plain" if path.endswith(".txt") else "text/html"

        def log_message(self, *a):
            pass

    server = http.server.ThreadingHTTPServer(
        ("127.0.0.1", 0), functools.partial(Handler, directory=str(root))
    )
    threading.Thread(target=server.serve_forever, daemon=True).start()
    yield f"http://127.0.0.1:{server.server_address[1]}"
    server.shutdown()


def test_spider_crawls_follows_pages_and_obeys_robots(site, tmp_path):
    args = argparse.Namespace(
        max_jobs=20, max_pages=5, delay=0.1, browser=False, all_locations=False
    )
    preset = {
        "source": "Test",
        "start_urls": [f"{site}/jobs.html"],
        "link_pattern": r"/(job|private)/\d+-[^/]+$",
    }
    result = scrape_jobs.build_spider(args, preset)().start()
    rows = [dict(i) for i in result.items]
    urls = {r["url"].split("/", 3)[3] for r in rows}
    assert "private/9-secret" not in urls  # robots.txt respected
    assert urls == {"job/1-customer-service", "job/2-packer", "job/3-barista", "job/4-kerani"}

    kept = [r for r in rows if scrape_jobs.keep(r, selangor_only=True)]
    assert {r["title"] for r in kept} == {
        "Customer Service Executive", "Warehouse Packer", "Kerani Akaun - Klang"
    }  # Kuala Lumpur barista dropped

    out = tmp_path / "out" / "jobs.csv"
    scrape_jobs.write_outputs(kept, out)
    with out.open(encoding="utf-8-sig") as f:
        written = list(csv.DictReader(f))
    assert len(written) == 3 and written[0]["scrapedOn"]
    assert out.with_suffix(".json").exists()
