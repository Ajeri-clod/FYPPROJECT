/** Shape of `src/data/oku-stats.json`, produced by `scripts/build_oku_stats.py`. */

export interface NamedCount {
  name: string;
  count: number;
}

export interface EmploymentRate {
  name: string;
  workingAge: number;
  employed: number;
  /** Employed ÷ working-age registrations, as a percentage. */
  rate: number;
}

export interface OkuAggregate {
  total: number;
  workingAge: number;
  employedWorkingAge: number;
  gender: NamedCount[];
  category: NamedCount[];
  subCategory: NamedCount[];
  ageBands: NamedCount[];
  marital: NamedCount[];
  ethnicity: NamedCount[];
  employmentStatus: NamedCount[];
  employmentStatusWorkingAge: NamedCount[];
  occupation: NamedCount[];
  registrationsByYear: NamedCount[];
  employmentByCategory: EmploymentRate[];
  employmentByGender: EmploymentRate[];
  employmentByAgeBand: EmploymentRate[];
}

export interface DistrictSummary extends Omit<EmploymentRate, "name"> {
  name: string;
  total: number;
}

export interface OkuStats {
  meta: {
    source: string;
    generatedOn: string;
    records: number;
    workingAgeDefinition: string;
  };
  districts: string[];
  all: OkuAggregate;
  byDistrict: Record<string, OkuAggregate>;
  districtSummary: DistrictSummary[];
}
