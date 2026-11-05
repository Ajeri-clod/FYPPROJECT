# Job-portal scraper (Scrapling)

Collects Selangor job postings for the **Labour Market Insights**, **Job
Recommendations** and **Skill-Gap Analytics** modules. This is the "online job
portals" data source in Research Objective 1 of the proposal.

## Quick start (Windows)

1. Install Python 3.10 or newer once (tick **Add python.exe to PATH**):
   `winget install Python.Python.3.12`
2. Double-click **`scrape-jobs.bat`** in the project folder. It:
   - sets up the scraper the first time (`scraper\.venv`);
   - scrapes Hiredly and Maukerja (100 job pages each by default);
   - merges them into `scraper\output\jobs.csv`;
   - loads them into the dashboard (`bun run import-jobs`).
3. Restart the dashboard (`start-dashboard.bat`). The "Sample data" badges
   disappear once real postings are loaded.

At ~3 seconds per page, 100 pages per site takes about 10–15 minutes.

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

The Hiredly preset already does this: it opens only the **listing** pages in a
hidden browser and scrolls 8 times (`--scroll` changes that). Job pages are
plain HTML, so they still use the fast HTTP fetcher. Add `--browser` to render
every page in the browser instead.

## How it works (for the methodology chapter)

| Step | What happens | Code |
|---|---|---|
| Crawl | A Scrapling `Spider` walks listing pages ("Next" links, `?page=N`, or scrolling in a headless browser for JavaScript sites) and follows links matching the job-page pattern. It stops paging when a page brings no new jobs. | `scrape_jobs.py` |
| Extract | Reads the schema.org **JobPosting JSON-LD** that job portals publish for Google for Jobs. Falls back to page title and text when it is missing. | `find_job_postings`, `fallback_job` |
| Clean | Strips HTML, converts salary to RM per month, maps employment type. | `html_to_text`, `parse_salary` |
| Integrate | Maps the town to a **JKM district** (e.g. Bangi → Hulu Langat, Cyberjaya → Sepang), so it lines up with the JKM OKU data. Keeps Selangor jobs only. | `district_from_location` |
| Skill extraction | Matches about 100 skills (English and Malay synonyms, e.g. *khidmat pelanggan* → customer service) against the title, requirements and description. | `extract_skills`, `skills_vocab.py` |
| Industry | Uses the posting's own industry field, otherwise keyword voting. | `classify_industry` |
| OKU accommodations | Flags OKU/PWD-friendly wording: wheelchair access, sign language, screen readers, remote work, job coach. | `detect_accommodations` |
| De-duplicate | Same title + employer + district = one posting. | `dedupe_key`, `combine.py` |

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
  LinkedIn forbid scraping, so they are not included. For the government
  source, MYFutureJobs (PERKESO) is the best fit for this project; consider
  asking PERKESO for a data extract instead of scraping.
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
