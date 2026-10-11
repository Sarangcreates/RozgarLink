import applicants from "./applicants.json";
import companies from "./companies.json";
import opportunities from "./opportunities.json";
import courses from "./courses.json";
import reviews from "./reviews.json";
import registry from "./registry.json";
import type { DataSet } from "../engine/types";
export function createSeed(): DataSet {
  return structuredClone({
    applicants,
    companies,
    opportunities,
    courses,
    reviews,
    registry,
    revision: 1,
  }) as DataSet;
}
