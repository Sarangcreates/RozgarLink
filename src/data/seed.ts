import applicants from "./applicants.json";
import companies from "./companies.json";
import opportunities from "./opportunities.json";
import courses from "./courses.json";
import reviews from "./reviews.json";
import registry from "./registry.json";
import type { DataSet } from "../engine/types";
import {
  sampleApplicants,
  sampleCompanies,
  sampleOpportunities,
  sampleCourses,
} from "./sample-marketplace";
export function createSeed(): DataSet {
  return structuredClone({
    applicants: [...applicants, ...sampleApplicants],
    companies: [...companies, ...sampleCompanies],
    opportunities: [...opportunities, ...sampleOpportunities],
    courses: [...courses, ...sampleCourses],
    reviews,
    registry,
    revision: 1,
  }) as DataSet;
}
