"""Scrape Selangor job postings for the OKU Jobs Selangor dashboard.

    python scrape_jobs.py --site hiredly --max-jobs 100
    python scrape_jobs.py --site maukerja --max-jobs 100
    python scrape_jobs.py --start-url URL --link-pattern REGEX   # any other site
    python scrape_jobs.py --inspect URL                          # check a site first

Writes output/jobs.csv (+ jobs.json). Import it into the dashboard with
`bun run import-jobs scraper/output/jobs.csv`.

Responsible-scraping defaults: robots.txt is obeyed, one request at a time per
site with a 3-second delay, a hard cap on pages, and only job-advert fields are
kept (no recruiter names, emails or phone numbers).
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from collections import Counter
from datetime import date
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

from scrapling.fetchers import AsyncStealthySession, FetcherSession
from scrapling.spiders import Response, Spider

from extract import (
    FIELDS,
    dedupe_key,
    fallback_job,
    find_job_postings,
    is_selangor,
    normalise_job,
)

HERE = Path(__file__).resolve().parent

# Starting points for sites checked in Nov 2026. Sites change their layout:
# if a preset finds no jobs, run --inspect on the start URL and adjust.
SITES: dict[str, dict] = {
    "hiredly": {
        "source": "Hiredly",
        "start_urls": ["https://my.hiredly.com/jobs"],
        "link_pattern": r"/jobs/jobs-malaysia-[^/?#]+$",
        "page_param": "page",
    },
    "maukerja": {
        "source": "Maukerja",
        "start_urls": ["https://www.maukerja.my/en/jobsearch/jobs-in-selangor"],
        "link_pattern": r"/job/[A-Za-z0-9]+-[^/?#]+$",
        "page_param": "page",
    },
}

_NEXT_TEXT = re.compile(r"^\s*(next|seterusnya|›|»|>)\s*$", re.I)


def with_page(url: str, param: str, number: int) -> str:
    parts = urlparse(url)
    query = dict(parse_qsl(parts.query))
    query[param] = str(number)
    return urlunparse(parts._replace(query=urlencode(query)))


def build_spider(args: argparse.Namespace, preset: dict) -> type[Spider]:
    link_rx = re.compile(preset["link_pattern"])
    domains = {urlparse(u).netloc for u in preset["start_urls"]}
    source = preset["source"]
    page_param = preset.get("page_param")

    class JobSpider(Spider):
        name = f"oku_jobs_{source.lower().replace(' ', '_')}"
        start_urls = preset["start_urls"]
        allowed_domains = domains
        robots_txt_obey = True
        concurrent_requests = 2
        concurrent_requests_per_domain = 1
        download_delay = args.delay

        def __init__(self, *a, **kw):
            super().__init__(*a, **kw)
            self.job_links: set[str] = set()
            self.listing_pages = 0

        def configure_sessions(self, manager):
            if args.browser:
                manager.add(
                    "default",
                    AsyncStealthySession(headless=True, network_idle=True, disable_resources=True),
                )
            else:
                manager.add("default", FetcherSession(impersonate="chrome", timeout=30))

        async def parse(self, response: Response):
            """Listing page: queue job links, then the next listing page."""
            self.listing_pages += 1
            # Some listing pages embed every job as JSON-LD already.
            for item in self.rows_from(response):
                yield item

            for href in response.css("a::attr(href)").getall():
                url = response.urljoin(href).split("#")[0]
                path = urlparse(url).path
                if link_rx.search(path) and url not in self.job_links:
                    if len(self.job_links) >= args.max_jobs:
                        break
                    self.job_links.add(url)
                    yield response.follow(url, callback=self.parse_job, priority=10)

            if self.listing_pages >= args.max_pages or len(self.job_links) >= args.max_jobs:
                return
            nxt = response.css('a[rel="next"]::attr(href)').get()
            if not nxt:
                for a in response.css("a"):
                    if _NEXT_TEXT.match(a.get_all_text() or "") and a.attrib.get("href"):
                        nxt = a.attrib["href"]
                        break
            if not nxt and page_param:
                nxt = with_page(preset["start_urls"][0], page_param, self.listing_pages + 1)
            if nxt:
                yield response.follow(nxt, callback=self.parse, priority=0)

        async def parse_job(self, response: Response):
            rows = list(self.rows_from(response))
            if not rows:
                title = (
                    response.css('meta[property="og:title"]::attr(content)').get()
                    or response.css("h1::text").get()
                    or response.css("title::text").get("")
                )
                rows = [fallback_job(title, response.get_all_text() or "", "", response.url, source)]
            for row in rows:
                yield row

        def rows_from(self, response: Response):
            for job in find_job_postings(response.html_content):
                yield normalise_job(job, response.url, source)

    return JobSpider


def keep(row: dict, selangor_only: bool) -> bool:
    if not row["title"]:
        return False
    return not selangor_only or row["district"] or is_selangor(row["location"])


def write_outputs(rows: list[dict], out: Path) -> None:
    out.parent.mkdir(parents=True, exist_ok=True)
    with out.open("w", newline="", encoding="utf-8-sig") as f:  # -sig: opens cleanly in Excel
        writer = csv.DictWriter(f, fieldnames=FIELDS + ["scrapedOn"])
        writer.writeheader()
        for row in rows:
            writer.writerow({**row, "scrapedOn": date.today().isoformat()})
    out.with_suffix(".json").write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding="utf-8")


def inspect(url: str, browser: bool) -> None:
    """Print what the scraper can see on a page, to configure a new site."""
    if browser:
        from scrapling.fetchers import StealthyFetcher

        page = StealthyFetcher.fetch(url, headless=True, network_idle=True)
    else:
        from scrapling.fetchers import Fetcher

        page = Fetcher.get(url, impersonate="chrome")
    print(f"Status: {page.status}   URL: {page.url}")
    jobs = find_job_postings(page.html_content)
    print(f"JobPosting JSON-LD blocks on this page: {len(jobs)}")
    for job in jobs[:3]:
        row = normalise_job(job, url, "inspect")
        print(f"  - {row['title']} | {row['employer']} | {row['location']} | skills: {row['skills']}")
    host = urlparse(page.url).hostname
    links = [page.urljoin(h) for h in page.css("a::attr(href)").getall()]
    internal = [u for u in links if urlparse(u).hostname == host]
    shapes = Counter(re.sub(r"/[^/]+$", "/<slug>", urlparse(u).path) for u in internal)
    print(f"\nInternal links: {len(internal)}. Most common link shapes:")
    for shape, n in shapes.most_common(12):
        print(f"  {n:4d}  {shape}")
    print("\nSample links:")
    for u in internal[:15]:
        print("  ", u)
    if not internal:
        print("  (none - the page probably needs JavaScript; retry with --browser)")


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--site", choices=sorted(SITES), help="use a built-in site preset")
    p.add_argument("--start-url", action="append", help="listing/search page to start from (repeatable)")
    p.add_argument("--link-pattern", help="regex matching job-detail URL paths")
    p.add_argument("--source", default="Web", help="source label stored with each job")
    p.add_argument("--max-jobs", type=int, default=100, help="stop after this many job pages (default 100)")
    p.add_argument("--max-pages", type=int, default=10, help="max listing pages to walk (default 10)")
    p.add_argument("--delay", type=float, default=3.0, help="seconds between requests (default 3)")
    p.add_argument("--browser", action="store_true", help="render pages in a headless browser (JavaScript sites)")
    p.add_argument("--all-locations", action="store_true", help="keep jobs outside Selangor too")
    p.add_argument("--out", default=str(HERE / "output" / "jobs.csv"), help="CSV output path")
    p.add_argument("--inspect", metavar="URL", help="show links and JSON-LD found on one page, then exit")
    args = p.parse_args()

    if args.inspect:
        inspect(args.inspect, args.browser)
        return 0

    if args.site:
        preset = dict(SITES[args.site])
        if args.start_url:
            preset["start_urls"] = args.start_url
    elif args.start_url and args.link_pattern:
        preset = {"source": args.source, "start_urls": args.start_url, "link_pattern": args.link_pattern}
    else:
        p.error("give --site, or both --start-url and --link-pattern (or use --inspect URL)")
    if args.link_pattern:
        preset["link_pattern"] = args.link_pattern

    if args.delay < 1:
        p.error("--delay must be at least 1 second - be polite to the job sites")

    result = build_spider(args, preset)().start()
    seen, rows = set(), []
    for item in result.items:
        row = dict(item)
        if keep(row, not args.all_locations) and dedupe_key(row) not in seen:
            seen.add(dedupe_key(row))
            rows.append(row)

    out = Path(args.out)
    write_outputs(rows, out)
    s = result.stats
    print(
        f"\nRequests: {s.requests_count}  blocked by robots.txt: {getattr(s, 'robots_disallowed_count', 0)}\n"
        f"Job pages scraped: {len(result.items)}  kept (Selangor, de-duplicated): {len(rows)}\n"
        f"Saved: {out}  and  {out.with_suffix('.json')}"
    )
    if not rows:
        print("No jobs kept. Try --inspect on the start URL, --browser, or --all-locations.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
