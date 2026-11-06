"""Download official Selangor labour-market statistics from data.gov.my (DOSM).

    python3 scripts/build_labour_stats.py

Writes src/data/dosm-labour.json, used by Employment Statistics to compare OKU
employment with the whole working-age population of each district. Uses the
public data.gov.my API (open data, no key needed), so nothing is scraped.

Datasets:
  lfs_district       - Labour Force Survey by district (yearly)
  formal_wages_state - median monthly wage of formal employees (monthly)
"""

import json
import urllib.request
from datetime import date
from pathlib import Path

API = "https://api.data.gov.my/data-catalogue"
OUT = Path(__file__).resolve().parent.parent / "src" / "data" / "dosm-labour.json"

# DOSM district name -> name used on the dashboard. DOSM's "Petaling" covers
# three JKM offices (Petaling Jaya, Subang Jaya, Shah Alam).
DISTRICTS = {
    "Gombak": "Gombak",
    "Ulu Langat": "Hulu Langat",
    "Ulu Selangor": "Hulu Selangor",
    "Klang": "Klang",
    "Kuala Langat": "Kuala Langat",
    "Kuala Selangor": "Kuala Selangor",
    "Petaling": "Petaling",
    "Sabak Bernam": "Sabak Bernam",
    "Sepang": "Sepang",
}


def get(dataset: str, **params: str) -> list[dict]:
    query = "&".join([f"id={dataset}"] + [f"{k}={v}" for k, v in params.items()])
    with urllib.request.urlopen(f"{API}?{query}", timeout=60) as resp:
        return json.load(resp)


def main() -> None:
    rows = get("lfs_district", filter="Selangor@state", sort="-date", limit="200")
    latest = max(r["date"] for r in rows)
    districts = []
    for r in sorted((r for r in rows if r["date"] == latest), key=lambda r: r["district"]):
        working_age = r["lf"] + r["lf_outside"]  # thousands, aged 15-64
        districts.append(
            {
                "name": DISTRICTS.get(r["district"], r["district"]),
                "workingAgeThousands": round(working_age, 1),
                "employedThousands": r["lf_employed"],
                # Employed / working-age population, computed from the survey
                # counts so it matches the OKU rate's definition exactly.
                "employmentRate": round(r["lf_employed"] / working_age * 100, 1),
                "unemploymentRate": r["u_rate"],
                "participationRate": r["p_rate"],
            }
        )

    wages = get("formal_wages_state", filter="Selangor@state", sort="-date", limit="12")
    stats = {
        "meta": {
            "source": "Department of Statistics Malaysia (DOSM) via data.gov.my — Labour Force Survey by district; formal sector wages by state",
            "license": "Open data (data.gov.my)",
            "lfsYear": latest[:4],
            "wagesMonth": wages[0]["date"][:7],
            "downloadedOn": date.today().isoformat(),
        },
        "districts": districts,
        "selangorMedianWage": wages[0]["wages_median"],
        "wageTrend": [
            {"name": w["date"][:7], "median": w["wages_median"]} for w in reversed(wages)
        ],
    }
    OUT.write_text(json.dumps(stats, indent=1) + "\n")
    print(f"wrote {OUT}: {len(districts)} districts (LFS {latest[:4]}), wages to {stats['meta']['wagesMonth']}")


if __name__ == "__main__":
    main()
