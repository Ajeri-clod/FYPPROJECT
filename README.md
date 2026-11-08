# OKU Jobs Selangor — OKU Data Analytics Dashboard

Final Year Project prototype: **Development of OKU Data Analytics Dashboard for
Job Opportunities in Selangor** (Bachelor of Information Systems (Hons.)
Intelligent Systems Engineering, UiTM).

The dashboard covers Research Objective 3 (and RO2's matching model) of the
proposal:

| Module | Route | Data |
| --- | --- | --- |
| Overview | `/` | JKM registry (real, aggregated) |
| OKU Profiles | `/profiles?district=` | JKM registry (real, aggregated) |
| Employment Statistics | `/employment?district=` | JKM registry (real, aggregated) + DOSM labour force |
| OKU Job Placements | `/placements?year=&programme=` | PERKESO placement statistics (real, aggregated) |
| Labour Market Insights | `/labour-market` | Job postings (sample) |
| Job Postings (CRUD) | `/jobs` | Job postings (sample) |
| Job Recommendations | `/recommendations?candidate=` | TF-IDF + cosine similarity over postings |
| Skill-Gap Analytics | `/skill-gap?candidate=` | Demand (postings) vs supply (job-seekers) |

## Run it

**Windows:** double-click `start-dashboard.bat`. On first run it installs the
packages, then starts the server and opens http://localhost:3000. Click
**Dev quick login**. Needs [Node.js](https://nodejs.org) (LTS). Keep the window
open while you use the dashboard.

**Share a temporary link** (e.g. for a supervisor to try it on her own
device): double-click `share-dashboard.bat`. It starts the dashboard and opens
a free Cloudflare quick tunnel, then prints a link like
`https://some-words.trycloudflare.com`. The link works only while both windows
stay open and the PC is awake, and it changes every run. Anyone with the link
can open the dashboard through **Dev quick login**, so share it only with the
people who need it. The dashboard shows aggregated statistics only.

**Command line:**

```bash
bun install
bun run dev
```

Open http://localhost:3000 and click **Dev quick login**. No database needed:
data lives in memory (set `DATABASE_URL` to switch to Postgres).

## Data

### JKM OKU registry → `src/data/oku-stats.json`

The raw spreadsheet holds personal data (registration numbers, addresses, dates
of birth), so it is **never committed** (`*.xlsx` is git-ignored). Instead,
`scripts/build_oku_stats.py` turns it into anonymised counts:

```bash
python3 scripts/build_oku_stats.py path/to/DATA_OKU_SEL_21-25_Combined.xlsx
```

Re-run it whenever JKM sends a newer extract. It translates the Malay labels
(e.g. `PEMBELAJARAN` → Learning, `PEKERJA SWASTA` → Private sector) and computes
employment rates for working-age OKU (15–64; employed = private sector,
government or self-employed).

### PERKESO OKU job placements → `src/data/perkeso-placements.json`

Aggregate statistics from a PERKESO data request (via UPEN Selangor): OKU
placed into jobs in Selangor, 2021–2025. They are split by programme
(MYFutureJobs, Disability Management) and broken down by sector, job type
(MASCO) and salary band, plus OKU career-fair attendance. They drive the
**OKU Job Placements** page. The file has counts only, so the JSON is
committed; the original spreadsheet is git-ignored. Rebuild with:

```bash
python3 scripts/build_perkeso_stats.py path/to/STATISTICS_REQUEST_UPEN_SELANGOR_OKU_DM_AARON_1.xlsx
```

The request also asked for the labour force participation rate, district of
placement, 12-month retention and number of employers hiring OKU. PERKESO left
those blank, so they are worth a follow-up request.

### DOSM labour-force statistics → `src/data/dosm-labour.json`

Official figures from the data.gov.my open-data API (no scraping, no key):
the Labour Force Survey by district, and Selangor's median formal-sector wage.
Employment Statistics uses them to compare OKU employment with all working-age
residents of each district. Refresh after DOSM's yearly update (next due 31 Dec
2026):

```bash
python3 scripts/build_labour_stats.py
```

### Job postings → scraped with `scraper/`

The Labour Market, Recommendations and Skill-Gap modules use job postings. Out
of the box they show 30 sample vacancies (`src/features/jobs/demo-data.ts`).
To load real ones, double-click `scrape-jobs.bat` (Windows), or run the
scraper and then:

```bash
bun run import-jobs scraper/output/jobs.csv
```

On Windows, `import-jobs.bat` reloads the last scrape without scraping again.
The imported file (`src/data/jobs-imported.json`) is git-ignored, so
downloading a fresh copy of the project never overwrites it.

See [`scraper/README.md`](scraper/README.md) for how the scraper works and its
responsible-scraping safeguards. Postings can also be added through the
`/jobs` form.

### Still sample data
- **Job-seeker profiles**: `src/features/matching/candidates.ts`, 16 synthetic
  profiles. The JKM registry has no skills field, so real candidate skills must
  come from another source (e.g. JKM/PERKESO job-seeker forms).

## Matching model

`src/features/matching/tfidf.ts` implements Content-Based Filtering. It builds
TF-IDF vectors (scikit-learn defaults: smooth idf, l2-normalised) and scores
them with cosine similarity, `cos = (D1·D2)/(‖D1‖‖D2‖)`. It is
fair by design: only skills, education and experience text is scored, never
disability category, gender, ethnicity or age. Unit tests are in
`tfidf.test.ts` and `skill-gap.test.ts`.

## Checks

```bash
bun run typecheck && bun run check && bun run test && bun run build
```

See `CLAUDE.md` for the architecture and conventions.
