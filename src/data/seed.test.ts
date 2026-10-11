import { describe, it, expect } from "vitest";
import { createSeed } from "./seed";
import {
  sampleApplicants,
  sampleCompanies,
  sampleOpportunities,
} from "./sample-marketplace";
import { scoreApplicant, validateOpportunity } from "../engine/matching";
describe("fictional seed model", () => {
  it("contains the required interconnected demo entities", () => {
    const d = createSeed();
    expect(d.companies).toHaveLength(15);
    expect(d.opportunities).toHaveLength(21);
    expect(d.applicants).toHaveLength(44);
    expect(d.courses.length).toBeGreaterThanOrEqual(20);
    expect(d.reviews.length).toBeGreaterThanOrEqual(15);
    for (const j of d.opportunities)
      expect(d.companies.some((c) => c.id === j.companyId)).toBe(true);
  });
  it("provides valid brand scenarios and eligible examples in every tier", () => {
    expect(sampleCompanies.map((c) => c.name)).toEqual([
      "Google",
      "Netflix",
      "Amazon",
      "NVIDIA",
      "GoDaddy",
      "Persistent",
      "Facebook",
      "OpenAI",
      "Tesla",
    ]);
    for (const job of sampleOpportunities) {
      expect(validateOpportunity(job)).toEqual([]);
      const profiles = sampleApplicants.filter((a) => a.goalRole === job.id);
      const results = profiles.map((a) => scoreApplicant(a, job));
      expect(results.slice(0, 3).map((r) => r.tier)).toEqual([
        "Tier 1",
        "Tier 2",
        "Tier 3",
      ]);
      expect(results[3].eligible).toBe(false);
      expect(results[3].score).toBeNull();
      expect(profiles.every((a) => a.discoverable && a.sample)).toBe(true);
    }
  });
  it("creates independent instances", () => {
    const a = createSeed(),
      b = createSeed();
    a.applicants[0].name = "changed";
    expect(b.applicants[0].name).toBe("Aarav Joshi");
  });
});
