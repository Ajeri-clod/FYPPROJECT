"""End-to-end: run the real spider against a tiny local job site."""

import argparse
import os
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
        max_jobs=20, max_pages=5, delay=0.1, browser=False, all_locations=False, scroll=None
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


INFINITE_LIST = """<html><body><div id="list"></div><script>
let n = 0;
function more() {  // like Hiredly: job cards are added by JavaScript on scroll
  const list = document.getElementById("list");
  for (const slug of [["1-customer-service"], ["2-packer"]][n] || []) {
    const a = document.createElement("a"); a.href = "/job/" + slug; a.textContent = slug;
    list.appendChild(a); list.appendChild(document.createElement("div")).style.height = "3000px";
  }
  n++;
}
more();
window.addEventListener("scroll", () => { if (innerHeight + scrollY >= document.body.scrollHeight - 50) more(); });
</script></body></html>"""


@pytest.mark.skipif(
    not os.environ.get("SCRAPLING_EXECUTABLE_PATH"),
    reason="needs a browser: set SCRAPLING_EXECUTABLE_PATH or run `scrapling install`",
)
def test_javascript_listing_with_infinite_scroll(site, tmp_path):
    (tmp_path / "site" / "js-list.html").write_text(INFINITE_LIST)
    args = argparse.Namespace(
        max_jobs=20, max_pages=1, delay=0.1, browser=False, all_locations=False, scroll=3
    )
    preset = {
        "source": "Test",
        "start_urls": [f"{site}/js-list.html"],
        "link_pattern": r"/job/\d+-[^/]+$",
        "listing_browser": True,
    }
    result = scrape_jobs.build_spider(args, preset)().start()
    titles = {dict(i)["title"] for i in result.items}
    # Without the browser no links exist; without scrolling only the first appears.
    assert titles == {"Customer Service Executive", "Warehouse Packer"}
