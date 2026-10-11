import { describe, it, expect } from "vitest";
import { createSeed } from "./seed";
describe("fictional seed model", () => {
  it("contains the required interconnected demo entities", () => {
    const d = createSeed();
    expect(d.companies).toHaveLength(6);
    expect(d.opportunities).toHaveLength(12);
    expect(d.applicants).toHaveLength(8);
    expect(d.courses.length).toBeGreaterThanOrEqual(20);
    expect(d.reviews.length).toBeGreaterThanOrEqual(15);
    for (const j of d.opportunities)
      expect(d.companies.some((c) => c.id === j.companyId)).toBe(true);
  });
  it("creates independent instances", () => {
    const a = createSeed(),
      b = createSeed();
    a.applicants[0].name = "changed";
    expect(b.applicants[0].name).toBe("Aarav Joshi");
  });
});
