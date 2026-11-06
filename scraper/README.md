# Job-portal scraper (Scrapling)

Collects Selangor job postings for the **Labour Market Insights**, **Job
Recommendations** and **Skill-Gap Analytics** modules. This is the "online job
portals" data source in Research Objective 1 of the proposal.

## Quick start (Windows)

1. Install Python 3.10 or newer once (tick **Add python.exe to PATH**):
   `winget install Python.Python.3.12`
2. Double-click **`scrape-jobs.bat`** in the project folder. It:
   - sets up the scraper the first time (`scraper\.venv`);
   - scrapes Hiredly and Maukerja, keeping 100 Selangor jobs from each by default;
   - merges them into `scraper\output\jobs.csv`;
   - loads them into the dashboard (`bun run import-jobs`).
3. Restart the dashboard (`start-dashboard.bat`). The "Sample data" badges
   disappear once real postings are loaded.

At ~3 seconds per page this takes about 15–20 minutes. Hiredly lists jobs from
all of Malaysia, so the scraper reads more pages than it keeps; roughly 2 in 3
were in Selangor in testing.

## Command line

```bash
cd scraper
python -m venv .venv && .venv\Scripts\activate      # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt

python scrape_jobs.py --site hiredly --max-jobs 100
python scrape_jobs.py --site maukerja --max-jobs 100 --out output/maukerja.csv
python combine.py output/jobs.csv output/hiredly.csv output/maukerja.csv
cd .. && bun run import-jobs scraper/output/jobs.csv
```

`bun run import-jobs --clear` switches the dashboard back to the sample postings.

### Another site, or a preset that stopped working

Sites change their layout. Check what the scraper can see on a listing page:

```bash
python scrape_jobs.py --inspect "https://example.com/jobs?location=selangor"
```

It prints how many schema.org `JobPosting` blocks it found and the most common
link shapes, e.g. `/job/<slug>`. Then run with your own pattern:

```bash
python scrape_jobs.py --start-url "https://example.com/jobs?location=selangor" \
  --link-pattern "/job/[^/]+$" --source "Example Jobs"
```

If `--inspect` shows no job links (only menus or categories), the site builds
its listings with JavaScript. Hiredly is like this. Run `scrapling install`
once to download the browser, then inspect again with the browser, scrolling
to load more jobs:

```bash
python scrape_jobs.py --inspect "https://my.hiredly.com/jobs?state=Selangor" --browser --scroll 5
```

The `hiredly-listing` preset works this way: it opens only the **listing**
pages in a hidden browser and scrolls 8 times (`--scroll` changes that). Job
pages are plain HTML, so they still use the fast HTTP fetcher. Add `--browser`
to render every page in the browser instead.

### Sitemaps: the best route when a site has one

Many sites list every page in a sitemap for search engines. Check the
`Sitemap:` line in `https://<site>/robots.txt`. The `hiredly` preset reads
`sitemap-jobs.xml` (~7,600 jobs, all of Malaysia), with no browser and no
scrolling. It fetches job pages one at a time and **stops once `--max-jobs`
unique, open, Selangor jobs are kept**. `--max-fetch` caps how many pages it
may read (default 5× `--max-jobs`). A preset needs only these two settings:

```python
"mysite": {"source": "My Site", "sitemap": "https://mysite.my/sitemap-jobs.xml",
           "start_urls": ["https://mysite.my/sitemap-jobs.xml"], "link_pattern": r"/job/[^/]+$"},
```

## How it works (for the methodology chapter)

| Step | What happens | Code |
|---|---|---|
| Crawl | A Scrapling `Spider` reads the site's job sitemap, or walks listing pages ("Next" links, `?page=N`, or scrolling in a headless browser for JavaScript sites), and follows links matching the job-page pattern. Sitemap mode stops once enough Selangor jobs are kept. | `scrape_jobs.py` |
| Extract | Reads the schema.org **JobPosting JSON-LD** that job portals publish for Google for Jobs. If a portal cuts that description short (Hiredly does), it uses the page's own "Job Description" section instead, without menus or footers. Salary shown on the page fills in when the JSON-LD has none. Falls back to page title and text when there is no JSON-LD. | `find_job_postings`, `job_section`, `salary_from_text`, `fallback_job` |
| Clean | Strips HTML, converts salary to RM per month, maps employment type. | `html_to_text`, `parse_salary` |
| Integrate | Maps the town to a **JKM district** (e.g. Bangi → Hulu Langat, Cyberjaya → Sepang), so it lines up with the JKM OKU data. Keeps Selangor jobs only. | `district_from_location` |
| Skill extraction | Matches about 100 skills (English and Malay synonyms, e.g. *khidmat pelanggan* → customer service) against the title, requirements and description. | `extract_skills`, `skills_vocab.py` |
| Industry | Uses the posting's own industry field, then keywords in the job title and employer, then the description. | `classify_job_industry` |
| OKU accommodations | Flags OKU/PWD-friendly wording: wheelchair access, sign language, screen readers, remote work, job coach. | `detect_accommodations` |
| De-duplicate | Same title + employer + district = one posting (portals often repost the same job). Postings past their closing date (`validThrough`) are dropped. | `dedupe_key`, `keep`, `combine.py` |

The skill names in `skills_vocab.py` are the same strings used in job-seeker
profiles. That lets the TF-IDF matcher and skill-gap analysis link them up, so
add new skills there as you find them.

## Responsible scraping

These are built into the code. Mention them in the report:

- **robots.txt is obeyed** (`robots_txt_obey = True`). Disallowed pages are
  skipped automatically.
- **Rate limiting:** one request at a time per site, at least 3 seconds apart
  (minimum 1 s, enforced), with a hard cap on pages per run.
- **Data minimisation (PDPA 2010):** only job-advert fields are stored. No
  recruiter names, emails or phone numbers.
- **Terms of use:** read each portal's terms before scraping. Jobstreet and
  LinkedIn forbid scraping, so they are not included.
- **MYFutureJobs (PERKESO)** is not included. Its job search
  (`candidates.myfuturejobs.gov.my`) is a logged-in style web app. Its
  robots.txt blocks AI crawlers by name and signals that content is not for
  AI training. The right route is a **formal data request to PERKESO**: it
  fits the proposal (PERKESO is already a named data source) and avoids
  scraping a government portal.
- Data is used for academic, non-commercial research only.

## Tests

```bash
pip install pytest
python -m pytest -q
```

The tests cover extraction from sample pages, plus a full crawl of a small
local website. That run checks link following, pagination, robots.txt,
de-duplication and the Selangor filter. A browser test covers a JavaScript,
infinite-scroll listing like Hiredly's. It runs when `SCRAPLING_EXECUTABLE_PATH`
points to a Chromium build, and is skipped otherwise.
