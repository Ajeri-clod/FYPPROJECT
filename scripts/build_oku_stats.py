"""Aggregate the JKM OKU registry export into anonymised dashboard statistics.

    python3 scripts/build_oku_stats.py path/to/DATA_OKU_SEL_21-25_Combined.xlsx

Reads the "SELANGOR DATA COMBINE" sheet and writes src/data/oku-stats.json.
Only counts leave this script: registration numbers, names, addresses and dates
of birth are never written out, so the raw spreadsheet must NOT be committed.
"""

import json
import sys
from datetime import date
from pathlib import Path

import pandas as pd

OUT = Path(__file__).resolve().parent.parent / "src" / "data" / "oku-stats.json"
SHEET = "SELANGOR DATA COMBINE"
TREND_YEARS = [2021, 2022, 2023, 2024, 2025]
WORKING_AGE = (15, 64)  # DOSM labour-force definition

CATEGORY = {
    "PEMBELAJARAN": "Learning",
    "FIZIKAL": "Physical",
    "PENGLIHATAN": "Visual",
    "MENTAL": "Mental",
    "PENDENGARAN": "Hearing",
    "PELBAGAI": "Multiple",
    "PERTUTURAN": "Speech",
}
EMPLOYMENT = {
    "TIDAK BEKERJA": "Not working",
    "PEKERJA SWASTA": "Private sector",
    "BEKERJA SENDIRI": "Self-employed",
    "PEKERJA KERAJAAN": "Government",
    "PESARA": "Retired",
}
EMPLOYED = {"Private sector", "Self-employed", "Government"}
OCCUPATION = {
    "PEKERJAAN ASAS": "Elementary occupations",
    "PEKERJAAN PERKHIDMATAN DAN JUALAN": "Service & sales",
    "JURUTEKNIK DAN PROFESIONAL": "Technicians & associate professionals",
    "PENGURUSAN DAN PROFESSIONAL": "Management & professional (civil service)",
    "SOKONGAN 1": "Support staff I (civil service)",
    "SOKONGAN 2": "Support staff II (civil service)",
    "PEKERJAAN SOKONGAN PERKERANIAN": "Clerical support",
    "OPERATOR LOJI DAN MESIN DAN PEMASANGAN": "Plant & machine operators",
    "PROFESIONAL": "Professionals",
    "PEKERJA KEMAHIRAN DAN PEKERJA PERTUKANGAN YANG BERKAITAN": "Craft & related trades",
    "PENGURUS": "Managers",
    "PEKERJAAN MAHIR PERTANIAN, PERHUTANAN DAN PERIKANAN": "Skilled agriculture, forestry & fishery",
    "PENGURUSAN TERTINGGI": "Top management (civil service)",
    "PEKERJAAN ANGKATAN TENTERA": "Armed forces",
}
GENDER = {"LELAKI": "Male", "PEREMPUAN": "Female"}
MARITAL = {
    "TIDAK BERKAHWIN": "Single",
    "BERKAHWIN": "Married",
    "BALU/DUDA": "Widowed",
    "BERCERAI": "Divorced",
    "BERPISAH": "Separated",
}
ETHNICITY = {"MELAYU": "Malay", "CINA": "Chinese", "INDIA": "Indian"}
AGE_BANDS = [
    ("0–14", 0, 14),
    ("15–24", 15, 24),
    ("25–34", 25, 34),
    ("35–44", 35, 44),
    ("45–54", 45, 54),
    ("55–64", 55, 64),
    ("65+", 65, 200),
]


def band(age: float) -> str | None:
    if pd.isna(age):
        return None
    for label, lo, hi in AGE_BANDS:
        if lo <= age <= hi:
            return label
    return None


def counts(series: pd.Series, order: list[str] | None = None) -> list[dict]:
    vc = series.dropna().value_counts()
    keys = order if order else list(vc.index)
    return [{"name": k, "count": int(vc.get(k, 0))} for k in keys]


def rate_table(df: pd.DataFrame, col: str, order: list[str] | None = None) -> list[dict]:
    wa = df[df["working_age"]]
    keys = order if order else list(wa[col].dropna().value_counts().index)
    out = []
    for k in keys:
        grp = wa[wa[col] == k]
        n = len(grp)
        emp = int(grp["employed"].sum())
        out.append({"name": k, "workingAge": n, "employed": emp, "rate": round(emp / n * 100, 1) if n else 0})
    return out


def aggregate(df: pd.DataFrame) -> dict:
    wa = df[df["working_age"]]
    occ = df[df["employed"]]["occupation"]
    return {
        "total": len(df),
        "workingAge": len(wa),
        "employedWorkingAge": int(wa["employed"].sum()),
        "gender": counts(df["gender"], ["Male", "Female"]),
        "category": counts(df["category"]),
        "subCategory": counts(df["sub_category"])[:10],
        "ageBands": counts(df["age_band"], [b[0] for b in AGE_BANDS]),
        "marital": counts(df["marital"], list(MARITAL.values()) + ["Not recorded"]),
        "ethnicity": counts(df["ethnicity"], ["Malay", "Chinese", "Indian", "Other"]),
        "employmentStatus": counts(df["employment"], list(EMPLOYMENT.values())),
        "employmentStatusWorkingAge": counts(wa["employment"], list(EMPLOYMENT.values())),
        "occupation": counts(occ),
        "registrationsByYear": [
            {"name": str(y), "count": int((df["approved_year"] == y).sum())} for y in TREND_YEARS
        ],
        "employmentByCategory": rate_table(df, "category"),
        "employmentByGender": rate_table(df, "gender", ["Male", "Female"]),
        "employmentByAgeBand": rate_table(df, "age_band", [b[0] for b in AGE_BANDS[1:6]]),
    }


def main(path: str) -> None:
    raw = pd.read_excel(path, sheet_name=SHEET, header=1)
    raw.columns = [str(c).strip() for c in raw.columns]

    df = pd.DataFrame()
    df["district"] = raw["CAWANGAN/DAERAH"].str.strip().str.title()
    df["category"] = raw["KATEGORI KETIDAKUPAYAAN"].map(CATEGORY)
    df["sub_category"] = raw["SUB KATEGORI KETIDAKUPAYAAN"].str.strip().str.title()
    df["gender"] = raw["JANTINA"].map(GENDER)
    df["age"] = pd.to_numeric(raw["UMUR"], errors="coerce")
    df["age_band"] = df["age"].map(band)
    df["marital"] = raw["STATUS KAHWIN"].str.strip().str.upper().map(MARITAL).fillna("Not recorded")
    df["ethnicity"] = raw["ETNIK"].str.strip().str.upper().map(ETHNICITY).fillna("Other")
    df["employment"] = raw["STATUS PEKERJAAN"].map(EMPLOYMENT)
    df["occupation"] = raw["PEKERJAAN"].map(OCCUPATION)
    df["employed"] = df["employment"].isin(EMPLOYED)
    df["working_age"] = df["age"].between(*WORKING_AGE)
    approved = raw["TARIKH KELULUSAN"].astype(str).str.lstrip("'")
    df["approved_year"] = pd.to_datetime(approved, format="%d/%m/%Y", errors="coerce").dt.year

    # JKM branches in Selangor only (drops stray out-of-state rows).
    districts = [d for d, n in df["district"].value_counts().items() if n >= 100]
    df = df[df["district"].isin(districts)]

    stats = {
        "meta": {
            "source": "Jabatan Kebajikan Masyarakat (JKM) Selangor — OKU registrations approved 2021–2025",
            "generatedOn": date.today().isoformat(),
            "records": len(df),
            "workingAgeDefinition": f"{WORKING_AGE[0]}–{WORKING_AGE[1]} years",
        },
        "districts": districts,
        "all": aggregate(df),
        "byDistrict": {d: aggregate(df[df["district"] == d]) for d in districts},
        "districtSummary": [
            {
                "name": d,
                "total": int((df["district"] == d).sum()),
                **{
                    k: v
                    for k, v in rate_table(df[df["district"] == d].assign(_all="all"), "_all")[0].items()
                    if k != "name"
                },
            }
            for d in districts
        ],
    }
    OUT.write_text(json.dumps(stats, ensure_ascii=False, indent=1) + "\n")
    print(f"wrote {OUT} ({len(df)} records, {len(districts)} districts)")


if __name__ == "__main__":
    main(sys.argv[1])
