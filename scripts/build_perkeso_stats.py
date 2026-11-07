"""Turn PERKESO's OKU job-placement statistics (Selangor, 2021-2025) into JSON.

    python3 scripts/build_perkeso_stats.py path/to/STATISTICS_REQUEST_UPEN_SELANGOR_OKU_DM_AARON_1.xlsx

Writes src/data/perkeso-placements.json for the "OKU Job Placements" page.
The workbook holds aggregate counts only (no personal data). It has three
column groups, each for 2021-2025:
  OKU MFJ                  - OKU job-seekers placed through MYFutureJobs
  PENGURUSAN HILANG UPAYA  - Disability Management (Return-to-Work) participants placed
  OKU PERKESO              - both together (MFJ + Disability Management)

"Under review" (Dalam Semakan) is recomputed as total minus the known
categories, because the reported row double-counts in places (MFJ 2023 sectors).
"""

import json
import sys
from datetime import date
from pathlib import Path

import openpyxl

OUT = Path(__file__).resolve().parent.parent / "src" / "data" / "perkeso-placements.json"
YEARS = [2021, 2022, 2023, 2024, 2025]
GROUPS = {"mfj": 2, "dm": 7, "total": 12}  # first column (0-based) of each group

SECTORS = {
    "pertanian": "Agriculture, forestry & fishing",
    "perlombongan": "Mining & quarrying",
    "pembuatan": "Manufacturing",
    "bekalan elektrik": "Electricity, gas & air-con supply",
    "bekalan air": "Water supply & waste management",
    "pembinaan": "Construction",
    "perdagangan borong": "Wholesale & retail trade, vehicle repair",
    "pengangkutan": "Transport & storage",
    "penginapan": "Accommodation & food services",
    "maklumat dan komunikasi": "Information & communication",
    "aktiviti kewangan": "Finance & insurance/takaful",
    "aktiviti hartanah": "Real estate",
    "aktiviti profesional": "Professional, scientific & technical",
    "aktiviti pentadbiran dan khidmat": "Administrative & support services",
    "pentadbiran awam": "Public administration & defence",
    "pendidikan": "Education",
    "aktiviti kesihatan": "Health & social work",
    "kesenian": "Arts, entertainment & recreation",
    "aktiviti perkhidmatan lain": "Other service activities",
    "aktiviti isi rumah": "Households as employers",
    "aktiviti badan dan pertubuhan luar": "Extraterritorial organisations",
}
OCCUPATIONS = {
    "pengurus": "Managers",
    "profesional": "Professionals",
    "juruteknik": "Technicians & associate professionals",
    "pekerja sokongan perkeranian": "Clerical support workers",
    "pekerja perkhidmatan dan jualan": "Service & sales workers",
    "pekerja kemahiran pertanian": "Skilled agricultural & fishery workers",
    "pekerja kemahiran dan pekerja pertukangan": "Craft & related trades workers",
    "operator mesin": "Plant & machine operators",
    "pekerja asas": "Elementary occupations",
}
SECTIONS = {
    "sektor pekerjaan": "sector",
    "jenis pekerjaan": "occupation",
    "julat gaji bulanan": "salary",
}


def nums(row: tuple, start: int) -> list[int]:
    return [int(v or 0) for v in row[start: start + 5]]


def label_of(text: str, table: dict[str, str]) -> str | None:
    low = " ".join(text.lower().split())
    for key, name in table.items():
        if low.startswith(key):
            return name
    return None


def breakdown(rows: list[tuple], totals: dict[str, list[int]]) -> dict:
    items = [
        {"name": name, **{g: nums(row, col) for g, col in GROUPS.items()}} for name, row in rows
    ]
    unknown = {
        g: [totals[g][i] - sum(it[g][i] for it in items) for i in range(5)] for g in GROUPS
    }
    return {"items": items, "underReview": unknown}


def main(path: str) -> None:
    ws = openpyxl.load_workbook(path, data_only=True).active
    rows = [r for r in ws.iter_rows(values_only=True) if any(c is not None for c in r)]

    totals = next({g: nums(r, c) for g, c in GROUPS.items()}
                  for r in rows if str(r[1] or "").upper().startswith("BIL OKU BEKERJA"))

    section, parts = None, {"sector": [], "occupation": [], "salary": []}
    support = {}
    for r in rows:
        label = " ".join(str(r[1] or "").split())
        low = label.lower()
        if low in SECTIONS:
            section = SECTIONS[low]
            continue
        if low.startswith("jumlah program sokongan"):
            support["programmes"] = [r[2 + i] for i in range(5)]
        if low.startswith("bilangan kehadiran program"):
            support["attendance"] = [r[2 + i] for i in range(5)]
        if not section or low.startswith("dalam semakan"):
            if low.startswith("dalam semakan") and section == "salary":
                section = None  # salary is the last breakdown
            continue
        if section == "sector":
            name = label_of(label, SECTORS)
        elif section == "occupation":
            name = label_of(label, OCCUPATIONS)
        else:
            name = label.replace(" ", "") if label.startswith(("<", ">", "RM")) else None
            name = name and name.replace("RM", "RM ").replace("-", " – ").replace("<RM ", "< RM ").replace(">RM ", "> RM ")
        if name:
            parts[section].append((name, r))
        elif section != "salary" and not any(isinstance(c, (int, float)) for c in r[2:]):
            section = None  # left the table (e.g. SUB SEKTOR / DAERAH rows)

    data = {
        "meta": {
            "source": "PERKESO — statistics request via UPEN Selangor: OKU job placements in Selangor, 2021–2025",
            "builtOn": date.today().isoformat(),
            "programmes": {
                "mfj": "MYFutureJobs (OKU job-seekers)",
                "dm": "Disability Management (Return-to-Work)",
                "total": "All PERKESO OKU placements",
            },
            "notProvided": [
                "Labour force participation rate",
                "District of placement",
                "12-month job retention rate",
                "Number of employers hiring OKU",
            ],
        },
        "years": YEARS,
        "placements": totals,
        "sector": breakdown(parts["sector"], totals),
        "occupation": breakdown(parts["occupation"], totals),
        "salary": breakdown(parts["salary"], totals),
        "support": support,
    }
    for key in ("sector", "occupation", "salary"):
        n = len(data[key]["items"])
        assert n, f"no {key} rows parsed"
        neg = [v for g in GROUPS for v in data[key]["underReview"][g] if v < 0]
        assert not neg, f"{key}: categories exceed the total"
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n")
    print(f"wrote {OUT}: {len(parts['sector'])} sectors, {len(parts['occupation'])} occupations, "
          f"{len(parts['salary'])} salary bands")


if __name__ == "__main__":
    main(sys.argv[1])
