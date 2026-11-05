"""Turn job-posting web pages into rows for the OKU Jobs Selangor dashboard.

Pure functions only (no network), so every step is unit-tested in tests/.

Pipeline (matches Figure 3.4 of the FYP proposal):
    page HTML -> JobPosting data (schema.org JSON-LD, or HTML fallback)
              -> clean text -> district / industry / salary normalisation
              -> skill extraction -> accommodation (OKU-friendly) detection
"""

from __future__ import annotations

import html as html_lib
import json
import re
from typing import Any

from skills_vocab import INDUSTRY_KEYWORDS, SKILLS

# ---------------------------------------------------------------- districts
# Town / area -> JKM district office used by the dashboard. Longer names are
# matched first so "Kota Damansara" wins over "Damansara".
_TOWN_TO_DISTRICT: dict[str, str] = {
    # Petaling district is split into three JKM offices.
    "petaling jaya": "Petaling Jaya", "damansara": "Petaling Jaya",
    "kota damansara": "Petaling Jaya", "ara damansara": "Petaling Jaya",
    "mutiara damansara": "Petaling Jaya", "bandar utama": "Petaling Jaya",
    "kelana jaya": "Petaling Jaya", "sungai buloh": "Petaling Jaya",
    "subang jaya": "Subang Jaya", "usj": "Subang Jaya", "sunway": "Subang Jaya",
    "bandar sunway": "Subang Jaya", "puchong": "Subang Jaya",
    "seri kembangan": "Subang Jaya", "serdang": "Subang Jaya",
    "putra heights": "Subang Jaya", "subang": "Subang Jaya",
    "shah alam": "Shah Alam", "setia alam": "Shah Alam",
    "glenmarie": "Shah Alam", "kota kemuning": "Shah Alam",
    "bukit jelutong": "Shah Alam", "batu tiga": "Shah Alam",
    "klang": "Klang", "port klang": "Klang", "pelabuhan klang": "Klang",
    "kapar": "Klang", "meru": "Klang", "bukit tinggi": "Klang",
    "pulau indah": "Klang", "bandar botanic": "Klang",
    "kajang": "Hulu Langat", "bangi": "Hulu Langat",
    "bandar baru bangi": "Hulu Langat", "semenyih": "Hulu Langat",
    "ampang": "Hulu Langat", "cheras": "Hulu Langat",
    "balakong": "Hulu Langat", "beranang": "Hulu Langat",
    "hulu langat": "Hulu Langat",
    "gombak": "Gombak", "selayang": "Gombak", "batu caves": "Gombak",
    "rawang": "Gombak", "kuang": "Gombak", "taman melawati": "Gombak",
    "hulu klang": "Gombak", "kepong": "Gombak",
    "hulu selangor": "Hulu Selangor", "kuala kubu bharu": "Hulu Selangor",
    "serendah": "Hulu Selangor", "bukit beruntung": "Hulu Selangor",
    "batang kali": "Hulu Selangor", "kalumpang": "Hulu Selangor",
    "kuala langat": "Kuala Langat", "banting": "Kuala Langat",
    "telok panglima garang": "Kuala Langat", "jenjarom": "Kuala Langat",
    "tanjung sepat": "Kuala Langat", "teluk panglima garang": "Kuala Langat",
    "kuala selangor": "Kuala Selangor", "puncak alam": "Kuala Selangor",
    "bandar puncak alam": "Kuala Selangor", "tanjong karang": "Kuala Selangor",
    "tanjung karang": "Kuala Selangor", "jeram": "Kuala Selangor",
    "ijok": "Kuala Selangor",
    "sabak bernam": "Sabak Bernam", "sungai besar": "Sabak Bernam",
    "sekinchan": "Sabak Bernam", "sabak": "Sabak Bernam",
    "sepang": "Sepang", "cyberjaya": "Sepang", "salak tinggi": "Sepang",
    "dengkil": "Sepang", "klia": "Sepang", "bandar baru salak tinggi": "Sepang",
}
_TOWNS = sorted(_TOWN_TO_DISTRICT, key=len, reverse=True)
_SELANGOR = re.compile(r"\bselangor\b", re.I)


def district_from_location(text: str | None) -> str:
    """Map a free-text location to a dashboard district ('' if unknown)."""
    if not text:
        return ""
    low = text.lower()
    for town in _TOWNS:
        if re.search(rf"\b{re.escape(town)}\b", low):
            return _TOWN_TO_DISTRICT[town]
    return ""


def is_selangor(location: str | None) -> bool:
    return bool(location) and (
        bool(_SELANGOR.search(location)) or district_from_location(location) != ""
    )


# ------------------------------------------------------------------- text
_TAG = re.compile(r"<[^>]+>")
_BLOCK = re.compile(r"</?(p|div|li|ul|ol|br|h[1-6]|tr)\b[^>]*>", re.I)
_SPACE = re.compile(r"[ \t\r\f\v]+")


def html_to_text(value: str | None) -> str:
    """Strip HTML (JSON-LD descriptions are often HTML) into readable text."""
    if not value:
        return ""
    text = _BLOCK.sub("\n", value)
    text = html_lib.unescape(_TAG.sub(" ", text))
    lines = [_SPACE.sub(" ", line).strip() for line in text.split("\n")]
    return "\n".join(line for line in lines if line)


# ----------------------------------------------------------------- JSON-LD
_LD_SCRIPT = re.compile(
    r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
    re.I | re.S,
)


def _iter_nodes(data: Any):
    if isinstance(data, list):
        for item in data:
            yield from _iter_nodes(item)
    elif isinstance(data, dict):
        yield data
        if "@graph" in data:
            yield from _iter_nodes(data["@graph"])


def _is_job(node: dict) -> bool:
    kind = node.get("@type")
    kinds = kind if isinstance(kind, list) else [kind]
    return any(str(k).lower() == "jobposting" for k in kinds)


def find_job_postings(page_html: str) -> list[dict]:
    """All schema.org JobPosting objects embedded as JSON-LD in a page.

    Most Malaysian job portals publish these for Google for Jobs, which makes
    them far more stable to scrape than CSS selectors.
    """
    jobs: list[dict] = []
    for raw in _LD_SCRIPT.findall(page_html):
        try:
            data = json.loads(raw.strip(), strict=False)
        except json.JSONDecodeError:
            continue
        jobs.extend(n for n in _iter_nodes(data) if _is_job(n))
    return jobs


def _text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, dict):
        return _text(value.get("name") or value.get("value") or "")
    if isinstance(value, list):
        return ", ".join(t for t in (_text(v) for v in value) if t)
    return html_to_text(str(value))


def _location(job: dict) -> str:
    parts: list[str] = []
    locations = job.get("jobLocation") or []
    for loc in locations if isinstance(locations, list) else [locations]:
        if not isinstance(loc, dict):
            parts.append(_text(loc))
            continue
        addr = loc.get("address", loc)
        if isinstance(addr, dict):
            parts += [
                _text(addr.get(k))
                for k in ("streetAddress", "addressLocality", "addressRegion", "postalCode")
            ]
        else:
            parts.append(_text(addr))
    if job.get("jobLocationType") == "TELECOMMUTE":
        parts.append("Remote")
    return ", ".join(p for p in parts if p)


# ----------------------------------------------------------------- salary
_PER_MONTH = {"MONTH": 1, "YEAR": 1 / 12, "WEEK": 4.33, "DAY": 26, "HOUR": 8 * 26}


def parse_salary(base_salary: Any) -> tuple[int | None, int | None]:
    """schema.org baseSalary -> (min, max) RM per month."""
    if not isinstance(base_salary, dict):
        return None, None
    value = base_salary.get("value", base_salary)
    unit = "MONTH"
    if isinstance(value, dict):
        unit = str(value.get("unitText") or base_salary.get("unitText") or "MONTH").upper()
        lo, hi = value.get("minValue"), value.get("maxValue")
        if lo is None and hi is None:
            lo = hi = value.get("value")
    else:
        lo = hi = value
    factor = _PER_MONTH.get(unit, 1)

    def to_int(v: Any) -> int | None:
        try:
            amount = float(str(v).replace(",", ""))
        except (TypeError, ValueError):
            return None
        return round(amount * factor) if amount > 0 else None

    return to_int(lo), to_int(hi)


# ----------------------------------------------------------- employment type
_EMPLOYMENT = {
    "FULL_TIME": "Full-time", "PART_TIME": "Part-time", "CONTRACTOR": "Contract",
    "TEMPORARY": "Contract", "INTERN": "Internship", "PER_DIEM": "Part-time",
}


def employment_type(value: Any) -> str:
    raw = value if isinstance(value, list) else [value]
    for v in raw:
        key = str(v or "").upper().replace("-", "_").replace(" ", "_")
        if key in _EMPLOYMENT:
            return _EMPLOYMENT[key]
        if "INTERN" in key:
            return "Internship"
        if "CONTRACT" in key or "TEMP" in key:
            return "Contract"
        if "PART" in key:
            return "Part-time"
    return "Full-time"


# ------------------------------------------------------------------ skills
_SKILL_PATTERNS = [
    (skill, re.compile(rf"(?<![\w+#]){pattern}(?![\w+#])", re.I))
    for skill, pattern in SKILLS.items()
]


def extract_skills(*texts: str, limit: int = 12) -> list[str]:
    """Skills mentioned in the texts, using the shared skills vocabulary."""
    blob = "\n".join(t for t in texts if t)
    found = [skill for skill, rx in _SKILL_PATTERNS if rx.search(blob)]
    return found[:limit]


# ---------------------------------------------------------------- industry
def classify_industry(*texts: str, explicit: str = "") -> str:
    """Dashboard industry for a job. The posting's own industry field, when it
    matches a category, wins over keywords found in the title/description."""
    if explicit:
        direct = classify_industry(explicit)
        if direct != "Other":
            return direct
    blob = " ".join(t for t in texts if t).lower()
    best, best_hits = "Other", 0
    for industry, words in INDUSTRY_KEYWORDS.items():
        hits = sum(1 for w in words if re.search(rf"\b{re.escape(w)}\b", blob))
        if hits > best_hits:
            best, best_hits = industry, hits
    return best


# ------------------------------------------------------------ accommodations
_ACCOMMODATION_TERMS = {
    "OKU / PWD candidates welcome": r"\b(oku|orang kurang upaya|pwd|persons? with disabilit(?:y|ies)|disabled (?:candidates|applicants|persons?))\b",
    "Wheelchair accessible": r"\bwheelchair\b|\bramp access\b|\baccessible (?:office|building|workplace)\b",
    "Sign language support": r"\bsign language\b|\bbahasa isyarat\b|\bdeaf\b",
    "Screen-reader / assistive tech": r"\bscreen[- ]reader\b|\bjaws\b|\bnvda\b|\bassistive technolog",
    "Remote / work from home": r"\b(work from home|wfh|remote work|fully remote|hybrid)\b",
    "Flexible hours": r"\bflexible (?:working )?hours\b|\bflexi[- ]?hours\b",
    "Job coach support": r"\bjob coach",
}
_ACCOMMODATION_RX = {k: re.compile(v, re.I) for k, v in _ACCOMMODATION_TERMS.items()}


def detect_accommodations(*texts: str) -> str:
    blob = "\n".join(t for t in texts if t)
    return ", ".join(k for k, rx in _ACCOMMODATION_RX.items() if rx.search(blob))


# --------------------------------------------------------------- normalise
FIELDS = [
    "title", "employer", "industry", "district", "employmentType", "skills",
    "description", "accommodations", "salaryMin", "salaryMax", "status",
    "source", "location", "url", "datePosted", "validThrough", "parsedFrom",
]


def normalise_job(job: dict, url: str, source: str) -> dict:
    """schema.org JobPosting -> one dashboard row."""
    title = _text(job.get("title"))
    employer = _text(job.get("hiringOrganization"))
    description = html_to_text(job.get("description"))
    location = _location(job)
    explicit = " , ".join(
        _text(job.get(k))
        for k in ("skills", "qualifications", "experienceRequirements",
                  "educationRequirements", "responsibilities")
    )
    salary_min, salary_max = parse_salary(job.get("baseSalary"))
    return {
        "title": title,
        "employer": employer,
        "industry": classify_industry(
            title, employer, description[:1500],
            explicit=f'{_text(job.get("industry"))} {_text(job.get("occupationalCategory"))}'.strip(),
        ),
        "district": district_from_location(location),
        "employmentType": employment_type(job.get("employmentType")),
        "skills": ", ".join(extract_skills(title, explicit, description)),
        "description": description[:2000],
        "accommodations": detect_accommodations(description, explicit),
        "salaryMin": salary_min,
        "salaryMax": salary_max,
        "status": "open",
        "source": source,
        "location": location,
        "url": url,
        "datePosted": _text(job.get("datePosted"))[:10],
        "validThrough": _text(job.get("validThrough"))[:10],
        "parsedFrom": "json-ld",
    }


def fallback_job(title: str, body_text: str, location: str, url: str, source: str) -> dict:
    """Best-effort row for pages without JobPosting JSON-LD."""
    return {
        "title": title.strip(),
        "employer": "",
        "industry": classify_industry(title, body_text[:1500]),
        "district": district_from_location(location or body_text[:3000]),
        "employmentType": employment_type(body_text[:3000]),
        "skills": ", ".join(extract_skills(title, body_text)),
        "description": body_text[:2000],
        "accommodations": detect_accommodations(body_text),
        "salaryMin": None,
        "salaryMax": None,
        "status": "open",
        "source": source,
        "location": location,
        "url": url,
        "datePosted": "",
        "validThrough": "",
        "parsedFrom": "html",
    }


def dedupe_key(row: dict) -> tuple[str, str, str]:
    return (row["title"].lower(), row["employer"].lower(), row["district"].lower())
