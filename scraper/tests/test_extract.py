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
