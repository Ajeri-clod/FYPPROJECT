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
| Employment Statistics | `/employment?district=` | JKM registry (real, aggregated) |
| Labour Market Insights | `/labour-market` | Job postings (sample) |
| Job Postings (CRUD) | `/jobs` | Job postings (sample) |
| Job Recommendations | `/recommendations?candidate=` | TF-IDF + cosine similarity over postings |
| Skill-Gap Analytics | `/skill-gap?candidate=` | Demand (postings) vs supply (job-seekers) |

## Run it

**Windows:** double-click `start-dashboard.bat`. On first run it installs the
packages, then starts the server and opens http://localhost:3000. Click
**Dev quick login**. Needs [Node.js](https://nodejs.org) (LTS). Keep the window
open while you use the dashboard.

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

### Still sample data (replace next)

- **Job postings**: `src/features/jobs/demo-data.ts`, 30 illustrative
  Selangor vacancies. Replace them with the scraped job-portal dataset, or add
  postings through the `/jobs` form.
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
