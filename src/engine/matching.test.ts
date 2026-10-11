import { describe, it, expect } from "vitest";
import { createSeed } from "../data/seed";
import {
  skillSimilarity,
  compulsorySimilarity,
  normalizeSkill,
  matcherEvaluation,
} from "./skills";
import {
  checkEligibility,
  scoreApplicant,
  evaluateApplicant,
  assignTier,
  overallTier,
  skillGap,
  recommendPath,
  resultDiff,
  validateOpportunity,
  preferenceFit,
} from "./matching";
describe("deterministic matching engine", () => {
  const d = createSeed(),
    a = d.applicants[0],
    j = d.opportunities[0];
  it("normalises explicit aliases", () => {
    expect(normalizeSkill("React.js")).toBe(normalizeSkill("ReactJS"));
    expect(skillSimilarity("Node", "Node.js")).toBe(1);
  });
  it("never lets fuzzy similarity establish compulsory eligibility", () => {
    expect(skillSimilarity("JavaScrip", "JavaScript")).toBeGreaterThanOrEqual(
      0.8,
    );
    expect(compulsorySimilarity("JavaScrip", "JavaScript")).toBe(0);
    const candidate = {
      ...a,
      skills: a.skills.map((s) =>
        s.name === "JavaScript" ? { ...s, name: "JavaScrip" } : s,
      ),
    };
    expect(checkEligibility(candidate, j).eligible).toBe(false);
  });
  it("rejects perfect skills with insufficient qualification and never scores or tiers them", () => {
    const r = scoreApplicant(d.applicants[1], j);
    expect(r.eligible).toBe(false);
    expect(r.failed.some((f) => f.reason.includes("Diploma"))).toBe(true);
    expect(r.score).toBeNull();
    expect(r.rankScore).toBeNull();
    expect(r.tier).toBeNull();
  });
  it("honours every qualification rung", () => {
    expect(checkEligibility({ ...a, degree: "PhD" }, j).eligible).toBe(true);
    expect(checkEligibility({ ...a, degree: "ITI" }, j).eligible).toBe(false);
  });
  it("checks allowed location and Any explicitly", () => {
    expect(checkEligibility({ ...a, location: "Delhi" }, j).eligible).toBe(
      false,
    );
    expect(checkEligibility(d.applicants[2], d.opportunities[2]).eligible).toBe(
      true,
    );
  });
  it("checks otherCriteria without coercing values", () => {
    const node = d.opportunities[1];
    expect(
      checkEligibility({ ...a, location: "Mumbai", experienceYears: 0 }, node)
        .eligible,
    ).toBe(false);
    expect(
      checkEligibility({ ...a, location: "Mumbai", experienceYears: 1 }, node)
        .eligible,
    ).toBe(true);
  });
  it("implements points, percentages, and level factors precisely", () => {
    expect(scoreApplicant(a, j).score).toBe(100);
    const c = {
      ...a,
      skills: a.skills.map((s) => ({ ...s, level: 1 as const })),
    };
    expect(scoreApplicant(c, j).score).toBe(40);
    expect(scoreApplicant(c, j).scorePct).toBe(40);
  });
  it("does not double-count duplicate profile skills", () => {
    expect(
      scoreApplicant({ ...a, skills: [...a.skills, ...a.skills] }, j).score,
    ).toBe(100);
  });
  it("chooses the match with the highest earned points", () => {
    const c = {
      ...a,
      skills: [
        ...a.skills.filter((s) => s.name !== "ReactJS"),
        { name: "React", level: 1 as const, evidence: "self" as const },
        { name: "ReactJS", level: 5 as const, evidence: "self" as const },
      ],
    };
    expect(scoreApplicant(c, j).breakdown[0].points).toBe(35);
  });
  it("uses inclusive raw-point tier boundaries", () => {
    expect(assignTier(80, j.tierCutoffs)).toBe("Tier 1");
    expect(assignTier(50, j.tierCutoffs)).toBe("Tier 2");
    expect(assignTier(49.99, j.tierCutoffs)).toBe("Tier 3");
  });
  it("preferences do not change eligibility, points, or tiers", () => {
    const one = scoreApplicant(a, j),
      two = scoreApplicant(
        {
          ...a,
          preferences: { commute: 0, minPay: 100000, jobType: "Part-time" },
        },
        j,
      );
    expect(two.eligible).toBe(one.eligible);
    expect(two.score).toBe(one.score);
    expect(two.tier).toBe(one.tier);
    expect(two.rankScore).toBeLessThan(one.rankScore!);
  });
  it("assigns half credit for unknown preferences", () => {
    expect(
      preferenceFit(
        { ...a, preferences: { commute: null, minPay: null, jobType: null } },
        j,
      ).score,
    ).toBe(50);
  });
  it("ranks only eligible opportunities with deterministic tie breaks", () => {
    const rs = evaluateApplicant(a, d.opportunities);
    expect(rs.filter((r) => !r.eligible).every((r) => r.rank === null)).toBe(
      true,
    );
    expect(rs.filter((r) => r.eligible).map((r) => r.rank)).toEqual(
      rs.filter((r) => r.eligible).map((_, i) => i + 1),
    );
  });
  it("computes overall tier from the best three eligible percentages", () => {
    const rs = evaluateApplicant(a, d.opportunities),
      o = overallTier(rs);
    expect(o.count).toBeLessThanOrEqual(3);
    expect(o.tier).toBe("Tier 1");
    expect(
      overallTier(rs.map((r) => ({ ...r, eligible: false }))).tier,
    ).toBeNull();
  });
  it("requires Verified certificate evidence but permits self evidence", () => {
    const bad = {
      ...a,
      skills: a.skills.map((s) => ({
        ...s,
        evidence: "certificate" as const,
        certificateId: "missing",
      })),
    };
    expect(checkEligibility(bad, j).eligible).toBe(false);
    expect(checkEligibility(a, j).eligible).toBe(true);
  });
  it("identifies compulsory gaps before points gaps", () => {
    const gaps = skillGap(d.applicants[2], j);
    expect(gaps[0].compulsory).toBe(true);
  });
  it("chooses the shortest local course covering the requested level", () => {
    const gap = {
      name: "Excel",
      compulsory: false,
      currentLevel: 1,
      targetLevel: 3,
      pointsGain: 9,
    };
    const path = recommendPath([gap], d.courses);
    expect(path.steps[0].course.id).toBe("course-1");
    expect(path.totalHours).toBe(2);
    expect(path.uncovered).toHaveLength(0);
  });
  it("reports gaps with no local course honestly", () => {
    expect(
      recommendPath(
        [
          {
            name: "Unknown Skill",
            compulsory: true,
            currentLevel: 0,
            targetLevel: 3,
            pointsGain: 0,
          },
        ],
        d.courses,
      ).uncovered,
    ).toHaveLength(1);
  });
  it("recomputes location changes and describes lost eligibility", () => {
    const before = evaluateApplicant(a, d.opportunities),
      after = evaluateApplicant({ ...a, location: "Delhi" }, d.opportunities);
    expect(
      resultDiff(before, after).some((x) => x.includes("no longer eligible")),
    ).toBe(true);
  });
  it("validates cutoffs, duplicates, and additional rules", () => {
    expect(validateOpportunity(j)).toEqual([]);
    expect(
      validateOpportunity({ ...j, tierCutoffs: { tier1Min: 50, tier2Min: 50 } })
        .length,
    ).toBeGreaterThan(0);
    expect(
      validateOpportunity({
        ...j,
        scoredSkills: [
          { name: "React", points: 50 },
          { name: "ReactJS", points: 50 },
        ],
      }).length,
    ).toBeGreaterThan(0);
  });
  it("publishes evaluation misses without inventing perfect metrics", () => {
    const m = matcherEvaluation();
    expect(m.fn).toBeGreaterThan(0);
    expect(m.recall).toBeLessThan(1);
  });
});
