/**
 * SAMPLE job-seeker profiles — synthetic, not real people.
 *
 * The JKM registry has no skills field, so the matcher needs candidate profiles
 * from another source (JKM/PERKESO job-seeker forms, SOCSO Return-to-Work, or
 * MYFutureJobs). These stand-ins show the flow; replace them with the real
 * profiles once collected. Disability category is shown for context only and is
 * never used in the similarity score.
 */
export interface Candidate {
  id: string;
  district: string;
  disabilityCategory: string;
  ageBand: string;
  education: string;
  /** Comma-separated skills. */
  skills: string;
  /** Free-text experience summary — also vectorised. */
  experience: string;
}

export const sampleCandidates: Candidate[] = [
  {
    id: "C-0001",
    district: "Shah Alam",
    disabilityCategory: "Physical",
    ageBand: "25–34",
    education: "Diploma in Office Management",
    skills:
      "Microsoft Office, Microsoft Excel, data entry, typing, filing, record keeping, Bahasa Malaysia",
    experience: "Two years as an admin clerk at a logistics company.",
  },
  {
    id: "C-0002",
    district: "Petaling Jaya",
    disabilityCategory: "Hearing",
    ageBand: "25–34",
    education: "Diploma in Graphic Design",
    skills:
      "Adobe Photoshop, Adobe Illustrator, Canva, creativity, social media, sign language",
    experience:
      "Freelance poster and social media design for small businesses.",
  },
  {
    id: "C-0003",
    district: "Klang",
    disabilityCategory: "Learning",
    ageBand: "15–24",
    education: "SPM, Program Pendidikan Khas Integrasi",
    skills:
      "packing, following instructions, teamwork, cleaning, attention to detail",
    experience: "Job-coach supported placement at a supermarket stockroom.",
  },
  {
    id: "C-0004",
    district: "Subang Jaya",
    disabilityCategory: "Visual",
    ageBand: "35–44",
    education: "Bachelor in Business Administration",
    skills:
      "customer service, communication, English, Bahasa Malaysia, problem solving, CRM software, screen reader",
    experience: "Five years in a telco call centre handling billing enquiries.",
  },
  {
    id: "C-0005",
    district: "Hulu Langat",
    disabilityCategory: "Physical",
    ageBand: "25–34",
    education: "Bachelor in Computer Science",
    skills: "HTML, CSS, JavaScript, React, Git, problem solving, English",
    experience: "Built web projects during internship at a fintech start-up.",
  },
  {
    id: "C-0006",
    district: "Gombak",
    disabilityCategory: "Learning",
    ageBand: "15–24",
    education: "Sijil Kemahiran Malaysia (SKM) Tahap 1 — Food Preparation",
    skills:
      "food preparation, hygiene, cleaning, teamwork, following instructions",
    experience: "Kitchen practical at a vocational training centre.",
  },
  {
    id: "C-0007",
    district: "Sepang",
    disabilityCategory: "Hearing",
    ageBand: "25–34",
    education: "SPM",
    skills:
      "machine operation, quality inspection, safety procedures, teamwork, sign language",
    experience: "Three years as a production operator in an electronics plant.",
  },
  {
    id: "C-0008",
    district: "Kuala Selangor",
    disabilityCategory: "Physical",
    ageBand: "45–54",
    education: "SPM",
    skills: "sewing, alteration, attention to detail, customer service",
    experience: "Runs a home tailoring business for neighbours.",
  },
  {
    id: "C-0009",
    district: "Shah Alam",
    disabilityCategory: "Mental",
    ageBand: "35–44",
    education: "Diploma in Accounting",
    skills:
      "bookkeeping, Microsoft Excel, accounting software, data entry, attention to detail",
    experience: "Accounts assistant at an SME before a career break.",
  },
  {
    id: "C-0010",
    district: "Hulu Selangor",
    disabilityCategory: "Physical",
    ageBand: "25–34",
    education: "SPM",
    skills: "computer hardware, troubleshooting, Windows, customer service",
    experience: "Repairs laptops and phones at a family shop.",
  },
  {
    id: "C-0011",
    district: "Klang",
    disabilityCategory: "Speech",
    ageBand: "25–34",
    education: "Certificate in Hospitality",
    skills: "housekeeping, cleaning, time management, teamwork",
    experience: "Hotel housekeeping internship in Port Dickson.",
  },
  {
    id: "C-0012",
    district: "Sabak Bernam",
    disabilityCategory: "Learning",
    ageBand: "15–24",
    education: "SKM Tahap 1 — Agriculture",
    skills: "farming, harvesting, physical stamina, teamwork",
    experience: "Helps on the family paddy farm.",
  },
  {
    id: "C-0013",
    district: "Petaling Jaya",
    disabilityCategory: "Visual",
    ageBand: "25–34",
    education: "Bachelor in Mass Communication",
    skills: "copywriting, social media, English, creativity, screen reader",
    experience: "Writes for a disability advocacy blog.",
  },
  {
    id: "C-0014",
    district: "Kuala Langat",
    disabilityCategory: "Multiple",
    ageBand: "35–44",
    education: "SPM",
    skills:
      "CCTV monitoring, report writing, attention to detail, communication",
    experience: "Guard-house monitoring at a residential estate.",
  },
  {
    id: "C-0015",
    district: "Subang Jaya",
    disabilityCategory: "Physical",
    ageBand: "45–54",
    education: "Diploma in Nursing (did not complete)",
    skills: "caregiving, empathy, first aid, communication, hygiene",
    experience: "Cared for elderly parents for eight years.",
  },
  {
    id: "C-0016",
    district: "Hulu Langat",
    disabilityCategory: "Hearing",
    ageBand: "15–24",
    education: "SKM Tahap 2 — Bakery",
    skills: "baking, food preparation, hygiene, following instructions",
    experience: "Bakery practical at a community centre.",
  },
];

/** The text vectorised for a candidate: skills + education + experience. */
export function candidateText(
  c: Pick<Candidate, "skills" | "education" | "experience">,
) {
  return `${c.skills}, ${c.education}, ${c.experience}`;
}
