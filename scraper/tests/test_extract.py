from pathlib import Path

import extract as e

FIX = Path(__file__).parent / "fixtures"


def load(name: str) -> str:
    return (FIX / name).read_text(encoding="utf-8")


def test_reads_jobposting_json_ld():
    jobs = e.find_job_postings(load("job_jsonld.html"))
    assert len(jobs) == 1
    row = e.normalise_job(jobs[0], "https://example.com/job/1", "Test")
    assert row["title"] == "Customer Service Executive"
    assert row["employer"] == "Sunway Group"
    assert row["district"] == "Subang Jaya"
    assert row["employmentType"] == "Full-time"
    assert (row["salaryMin"], row["salaryMax"]) == (2500, 3200)
    assert row["datePosted"] == "2026-10-28"
    assert row["industry"] == "Hospitality & Tourism"
    for skill in ["communication", "English", "Bahasa Malaysia", "Microsoft Office",
                  "data entry", "teamwork", "attention to detail"]:
        assert skill in row["skills"]
    assert "OKU / PWD candidates welcome" in row["accommodations"]
    assert "Wheelchair accessible" in row["accommodations"]
    assert "<li>" not in row["description"]


def test_reads_graph_and_hourly_salary():
    jobs = e.find_job_postings(load("job_graph.html"))
    assert [j["title"] for j in jobs] == ["Warehouse Packer"]
    row = e.normalise_job(jobs[0], "u", "Test")
    assert row["employer"] == "Shopee Express"
    assert row["district"] == "Sepang"
    assert row["employmentType"] == "Part-time"
    assert row["salaryMin"] == 12 * 8 * 26
    assert {"packing", "warehouse operations", "physical stamina", "shift work"} <= set(
        row["skills"].split(", ")
    )


def test_location_outside_selangor_is_flagged():
    row = e.normalise_job(e.find_job_postings(load("job_kl.html"))[0], "u", "Test")
    assert row["district"] == ""
    assert not e.is_selangor(row["location"])
    assert "food handling certificate" in row["skills"]


def test_broken_json_ld_is_ignored():
    html = '<script type="application/ld+json">{not json</script>'
    assert e.find_job_postings(html) == []


def test_district_mapping():
    assert e.district_from_location("Bandar Baru Bangi, Selangor") == "Hulu Langat"
    assert e.district_from_location("Kota Damansara, Petaling Jaya") == "Petaling Jaya"
    assert e.district_from_location("Puncak Alam") == "Kuala Selangor"
    assert e.district_from_location("Johor Bahru") == ""
    assert e.is_selangor("Somewhere, Selangor")


def test_malay_skills_and_sql_account_not_sql():
    skills = e.extract_skills("Kerani, mahir simpan kira, khidmat pelanggan, SQL Account")
    assert "bookkeeping" in skills and "customer service" in skills
    assert "accounting software" in skills and "SQL" not in skills


def test_fallback_without_json_ld():
    row = e.fallback_job("Kerani Akaun - Klang", load("job_plain.html"), "", "u", "Test")
    assert row["district"] == "Klang"
    assert row["parsedFrom"] == "html"
    assert {"Microsoft Excel", "bookkeeping", "teamwork"} <= set(row["skills"].split(", "))


PAGE_TEXT = """Jobs
Sales jobs
Admin jobs
Senior Account Manager
Job Description
Grow the dielectric fluid business across South-East Asia.
Fluent in Bahasa Malaysia and English. Team player, able to work independently.
Company Benefits
Free coffee and a customer service hotline
Similar Jobs
Cashier
"""


def test_job_section_skips_menus_and_footer():
    section = e.job_section(PAGE_TEXT)
    assert section.startswith("Job Description")
    assert "dielectric" in section
    assert "Sales jobs" not in section and "customer service" not in section


def test_job_section_needs_a_heading():
    assert e.job_section("Sales jobs\nAdmin jobs\nCashier") == ""


def test_truncated_json_ld_uses_page_section_and_ignores_none():
    job = {
        "@type": "JobPosting",
        "title": "Senior Account Manager",
        "hiringOrganization": {"name": "Cargill"},
        "skills": "None",
        "description": "Grow the business...",
        "jobLocation": {"address": {"addressLocality": "Puchong", "addressRegion": "Selangor"}},
    }
    row = e.normalise_job(job, "u", "Hiredly", e.job_section(PAGE_TEXT))
    skills = row["skills"].split(", ")
    assert {"Bahasa Malaysia", "English", "teamwork", "independent work"} <= set(skills)
    assert "sales" not in skills and "None" not in row["skills"]
    assert row["district"] == "Subang Jaya"


def test_salary_from_page_text():
    assert e.salary_from_text("Video Editor\nRM 3000 - RM 5000\nShah Alam") == (3000, 5000)
    assert e.salary_from_text("RM 8K - RM 12K") == (8000, 12000)
    assert e.salary_from_text("MYR3,200 - MYR4,500 Per Month") == (3200, 4500)
    assert e.salary_from_text("RM 900") == (900, 900)
    assert e.salary_from_text("Undisclosed") == (None, None)
    assert e.salary_from_text("RM 50") == (None, None)  # not a monthly salary


def test_industry_prefers_title_over_description():
    assert e.classify_job_industry(
        "Chief Financial Officer", "Baba Eco Group", "We run a warehouse and delivery fleet."
    ) == "Finance & Insurance"


INKLUSIF_PAGE = """Browse Jobs
Operations Analyst
Acme Sdn Bhd
Petaling Jaya, Selangor
Full Time
RM 4,000 – RM 5,500 / month
Accessibility Features
Remote Friendly
Flexible Hours
Screen Reader Compatible
Ergonomic Equipment
About this Role
Analyse partner data and present insights.
Experience with Excel or SQL
Good presentation skills
Apply Now — Create Profile
Browse More Jobs
"""


def test_oku_board_accessibility_list_section_and_text_salary():
    job = {
        "@type": "JobPosting",
        "title": "Operations Analyst",
        "hiringOrganization": {"name": "Acme Sdn Bhd"},
        "description": "Analyse partner data.",
        "jobLocation": {"address": {"addressLocality": "Petaling Jaya, Selangor"}},
        "baseSalary": {"value": {"@type": "QuantitativeValue", "description": "RM 4,000 – RM 5,500 / month"}},
    }
    row = e.normalise_job(
        job, "u", "Inklusif",
        e.job_section(INKLUSIF_PAGE), e.job_header(INKLUSIF_PAGE),
        e.listed_accessibility(INKLUSIF_PAGE),
    )
    assert (row["salaryMin"], row["salaryMax"]) == (4000, 5500)
    assert row["accommodations"].startswith(
        "Remote Friendly, Flexible Hours, Screen Reader Compatible, Ergonomic Equipment"
    )
    assert "Remote / work from home" not in row["accommodations"]  # already listed
    assert {"Microsoft Excel", "SQL", "presentation"} <= set(row["skills"].split(", "))
    assert "Apply Now" not in row["description"]
    assert row["district"] == "Petaling Jaya"
