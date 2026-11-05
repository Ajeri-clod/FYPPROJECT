"""Merge several scraper CSVs into one, dropping duplicate postings.

    python combine.py OUT.csv IN1.csv IN2.csv ...
Missing input files are skipped (e.g. a site that returned nothing).
"""

import csv
import sys
from pathlib import Path


def main(out: str, inputs: list[str]) -> int:
    seen, rows, fields = set(), [], None
    for path in inputs:
        p = Path(path)
        if not p.exists():
            print(f"skip (not found): {p}")
            continue
        with p.open(encoding="utf-8-sig", newline="") as f:
            reader = csv.DictReader(f)
            fields = fields or reader.fieldnames
            for row in reader:
                key = (row["title"].lower(), row["employer"].lower(), row["district"].lower())
                if key not in seen:
                    seen.add(key)
                    rows.append(row)
    if not fields:
        print("No input files had data.")
        return 1
    Path(out).parent.mkdir(parents=True, exist_ok=True)
    with open(out, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)
    print(f"Combined {len(rows)} unique postings into {out}")
    return 0


if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    sys.exit(main(sys.argv[1], sys.argv[2:]))
