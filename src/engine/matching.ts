import {
  qualifications,
  type Applicant,
  type Opportunity,
  type Skill,
  type MatchResult,
  type Tier,
  type Course,
  type Gap,
  type RuleResult,
} from "./types";
import {
  canonicalSkill,
  compulsorySimilarity,
  normalizeSkill,
  skillSimilarity,
} from "./skills";
export const levelFactors = [0, 0.4, 0.55, 0.7, 0.85, 1] as const;
export function validSkills(a: Applicant): Skill[] {
  return a.skills.filter(
    (s) =>
      s.evidence !== "certificate" ||
      a.certificates.some(
        (c) =>
          c.id === s.certificateId &&
          c.status === "Verified" &&
          c.skillsClaimed.some((n) => compulsorySimilarity(n, s.name) === 1),
      ),
  );
}
const same = (a: string, b: string) =>
  a.trim().toLowerCase() === b.trim().toLowerCase();
export function checkEligibility(a: Applicant, j: Opportunity) {
  const rules: RuleResult[] = [];
  const skills = validSkills(a);
  for (const required of j.eligibility.compulsorySkills) {
    const match = skills.find(
      (s) =>
        compulsorySimilarity(s.name, required.name) >=
        (required.threshold ?? 0.8),
    );
    rules.push({
      label: "Compulsory skill: " + required.name,
      passed: !!match,
      reason: match
        ? `Your “${match.name}” matches compulsory “${required.name}” through the explicit alias rules (100%).`
        : `Missing compulsory skill: ${required.name}. Fuzzy ranking matches cannot satisfy this gate.`,
    });
  }
  const qi = qualifications.indexOf(a.degree),
    min = qualifications.indexOf(j.eligibility.minQualification);
  const degreePass = qi >= 0 && min >= 0 && qi >= min;
  rules.push({
    label: "Minimum qualification",
    passed: degreePass,
    reason: degreePass
      ? `${a.degree} meets minimum ${j.eligibility.minQualification}.`
      : `Requires ${j.eligibility.minQualification}; you have ${a.degree}.`,
  });
  const loc = j.eligibility.allowedLocations.some(
    (l) => same(l, "Any") || same(l, a.location),
  );
  rules.push({
    label: "Allowed location",
    passed: loc,
    reason: loc
      ? `${a.location} satisfies the stated location rule.`
      : `Allowed residence: ${j.eligibility.allowedLocations.join(", ")}; you live in ${a.location}.`,
  });
  for (const rule of j.eligibility.otherCriteria) {
    const actual = a[rule.field];
    let pass = false;
    if (rule.operator === "=") pass = actual === rule.value;
    else if (rule.operator === "!=") pass = actual !== rule.value;
    else if (typeof actual === "number" && typeof rule.value === "number")
      pass =
        rule.operator === ">=" ? actual >= rule.value : actual <= rule.value;
    rules.push({
      label: rule.field,
      passed: pass,
      reason: `${rule.field} ${rule.operator} ${rule.value} required; your value is ${actual}.`,
    });
  }
  return {
    eligible: rules.every((r) => r.passed),
    passed: rules.filter((r) => r.passed),
    failed: rules.filter((r) => !r.passed),
  };
}
export function preferenceFit(a: Applicant, j: Opportunity) {
  const unknown = (x: unknown) => x === null || x === undefined || x === "";
  const parts = [
    {
      name: "Commute",
      max: 40,
      unknown: unknown(a.preferences.commute) || unknown(j.commuteMinutes),
      pass: (j.commuteMinutes ?? 0) <= (a.preferences.commute ?? 0),
    },
    {
      name: "Pay",
      max: 40,
      unknown: unknown(a.preferences.minPay) || unknown(j.salary),
      pass: (j.salary ?? 0) >= (a.preferences.minPay ?? 0),
    },
    {
      name: "Job type",
      max: 20,
      unknown: unknown(a.preferences.jobType) || unknown(j.jobType),
      pass: same(a.preferences.jobType || "", j.jobType),
    },
  ].map((p) => ({
    name: p.name,
    max: p.max,
    points: p.unknown ? p.max / 2 : p.pass ? p.max : 0,
    reason: p.unknown
      ? "Unknown: half credit."
      : p.pass
        ? "Meets your preference."
        : "Does not meet your preference; eligibility is unchanged.",
  }));
  return { score: parts.reduce((n, p) => n + p.points, 0), parts };
}
export function assignTier(
  score: number,
  cutoffs: Opportunity["tierCutoffs"],
): Tier {
  return score >= cutoffs.tier1Min
    ? "Tier 1"
    : score >= cutoffs.tier2Min
      ? "Tier 2"
      : "Tier 3";
}
export function scoreApplicant(a: Applicant, j: Opportunity): MatchResult {
  const eligibility = checkEligibility(a, j),
    totalPoints = j.scoredSkills.reduce((n, s) => n + s.points, 0);
  const base = {
    opportunityId: j.id,
    applicantId: a.id,
    ...eligibility,
    totalPoints,
    rank: null,
  };
  if (!eligibility.eligible)
    return {
      ...base,
      breakdown: [],
      score: null,
      scorePct: null,
      prefFit: null,
      preferenceBreakdown: [],
      rankScore: null,
      tier: null,
    };
  const skills = validSkills(a);
  const breakdown = j.scoredSkills.map((required) => {
    const matches = skills
      .map((s) => ({ s, strength: skillSimilarity(s.name, required.name) }))
      .filter((m) => m.strength >= 0.8)
      .sort(
        (x, y) =>
          y.strength * levelFactors[y.s.level] -
            x.strength * levelFactors[x.s.level] ||
          x.s.name.localeCompare(y.s.name),
      );
    const best = matches[0],
      level = best?.s.level || 0,
      matchStrength = best?.strength || 0,
      levelFactor = levelFactors[level] || 0;
    return {
      name: required.name,
      companyPoints: required.points,
      matchedAlias: best?.s.name || null,
      matchStrength,
      level,
      levelFactor,
      points: required.points * matchStrength * levelFactor,
    };
  });
  const score = breakdown.reduce((n, s) => n + s.points, 0),
    scorePct = totalPoints ? (score / totalPoints) * 100 : 0,
    pref = preferenceFit(a, j);
  return {
    ...base,
    breakdown,
    score,
    scorePct,
    prefFit: pref.score,
    preferenceBreakdown: pref.parts,
    rankScore: 0.8 * scorePct + 0.2 * pref.score,
    tier: assignTier(score, j.tierCutoffs),
  };
}
export function evaluateApplicant(
  a: Applicant,
  jobs: Opportunity[],
): MatchResult[] {
  const results = jobs.map((j) => scoreApplicant(a, j));
  const eligible = results
    .filter((r) => r.eligible)
    .sort(compareMatches)
    .map((r, i) => ({ ...r, rank: i + 1 }));
  return [
    ...eligible,
    ...results
      .filter((r) => !r.eligible)
      .sort((x, y) => x.opportunityId.localeCompare(y.opportunityId)),
  ];
}
export function compareMatches(a: MatchResult, b: MatchResult) {
  return (
    (b.rankScore ?? -1) - (a.rankScore ?? -1) ||
    (b.score ?? -1) - (a.score ?? -1) ||
    a.opportunityId.localeCompare(b.opportunityId) ||
    a.applicantId.localeCompare(b.applicantId)
  );
}
export function overallTier(results: MatchResult[]) {
  const top = results
    .filter((r) => r.eligible)
    .sort((a, b) => (b.scorePct || 0) - (a.scorePct || 0))
    .slice(0, 3);
  const pct = top.length
    ? top.reduce((s, r) => s + (r.scorePct || 0), 0) / top.length
    : 0;
  return {
    tier: top.length
      ? ((pct >= 70 ? "Tier 1" : pct >= 40 ? "Tier 2" : "Tier 3") as Tier)
      : null,
    scorePct: pct,
    topIds: top.map((r) => r.opportunityId),
    count: top.length,
    nextPct: top.length ? (pct >= 70 ? 0 : (pct >= 40 ? 70 : 40) - pct) : 0,
  };
}
export function skillGap(a: Applicant, j: Opportunity): Gap[] {
  const skills = validSkills(a),
    gaps = new Map<string, Gap>();
  for (const r of j.eligibility.compulsorySkills)
    if (
      !skills.some(
        (s) => compulsorySimilarity(s.name, r.name) >= (r.threshold ?? 0.8),
      )
    )
      gaps.set(normalizeSkill(r.name), {
        name: canonicalSkill(r.name),
        compulsory: true,
        currentLevel: 0,
        targetLevel: 3,
        pointsGain: 0,
      });
  for (const r of j.scoredSkills) {
    const best = skills
      .filter((s) => skillSimilarity(s.name, r.name) >= 0.8)
      .sort(
        (x, y) =>
          levelFactors[y.level] * skillSimilarity(y.name, r.name) -
          levelFactors[x.level] * skillSimilarity(x.name, r.name),
      )[0];
    const currentLevel = best?.level || 0;
    if (currentLevel === 5) continue;
    const targetLevel = Math.min(5, Math.max(3, currentLevel + 1));
    const old = gaps.get(normalizeSkill(r.name));
    const currentPoints = best
      ? r.points *
        skillSimilarity(best.name, r.name) *
        levelFactors[currentLevel]
      : 0;
    gaps.set(normalizeSkill(r.name), {
      name: canonicalSkill(r.name),
      compulsory: old?.compulsory || false,
      currentLevel,
      targetLevel,
      pointsGain: Math.max(
        0,
        r.points * levelFactors[targetLevel] - currentPoints,
      ),
    });
  }
  return [...gaps.values()].sort(
    (x, y) =>
      Number(y.compulsory) - Number(x.compulsory) ||
      y.pointsGain - x.pointsGain ||
      x.name.localeCompare(y.name),
  );
}
export function recommendPath(gaps: Gap[], catalogue: Course[]) {
  const steps: { course: Course; gaps: Gap[] }[] = [],
    uncovered: Gap[] = [];
  for (const gap of gaps) {
    const existing = steps.find(
      (s) =>
        s.course.level >= gap.targetLevel &&
        s.course.skillsTaught.some(
          (n) => compulsorySimilarity(n, gap.name) === 1,
        ),
    );
    if (existing) {
      existing.gaps.push(gap);
      continue;
    }
    const course = catalogue
      .filter(
        (c) =>
          c.level >= gap.targetLevel &&
          c.skillsTaught.some((n) => compulsorySimilarity(n, gap.name) === 1),
      )
      .sort((x, y) => x.duration - y.duration || x.id.localeCompare(y.id))[0];
    if (course) steps.push({ course, gaps: [gap] });
    else uncovered.push(gap);
  }
  return {
    steps,
    uncovered,
    totalHours: steps.reduce((n, s) => n + s.course.duration, 0),
  };
}
export function explain(r: MatchResult, j: Opportunity): string[] {
  if (!r.eligible) return r.failed.map((f) => f.reason);
  const lines = [
    `All compulsory rules pass. ${r.score!.toFixed(2)} / ${r.totalPoints} skill points (${r.scorePct!.toFixed(1)}%).`,
    `${r.tier}: raw-point cut-offs are ${j.tierCutoffs.tier1Min} for Tier 1 and ${j.tierCutoffs.tier2Min} for Tier 2.`,
    `Rank value = 0.8 × ${r.scorePct!.toFixed(1)} + 0.2 × ${r.prefFit!.toFixed(1)} = ${r.rankScore!.toFixed(1)}. Preferences affect this order only.`,
  ];
  if (r.tier !== "Tier 1") {
    const target =
      r.tier === "Tier 3" ? j.tierCutoffs.tier2Min : j.tierCutoffs.tier1Min;
    lines.push(
      `You need ${(target - r.score!).toFixed(2)} additional raw points for ${r.tier === "Tier 3" ? "Tier 2" : "Tier 1"}.`,
    );
  }
  return lines;
}
export function resultDiff(before: MatchResult[], after: MatchResult[]) {
  const messages: string[] = [];
  for (const n of after) {
    const o = before.find((r) => r.opportunityId === n.opportunityId);
    if (!o) continue;
    if (!o.eligible && n.eligible)
      messages.push(`${n.opportunityId}: newly eligible (${n.tier}).`);
    else if (o.eligible && !n.eligible)
      messages.push(
        `${n.opportunityId}: no longer eligible — ${n.failed.map((f) => f.reason).join(" ")}`,
      );
    else if (
      n.eligible &&
      (o.tier !== n.tier ||
        Math.abs((o.score || 0) - (n.score || 0)) > 0.0001 ||
        o.rank !== n.rank)
    )
      messages.push(
        `${n.opportunityId}: ${o.tier} → ${n.tier}; points ${(o.score || 0).toFixed(1)} → ${(n.score || 0).toFixed(1)}; rank ${o.rank} → ${n.rank}.`,
      );
  }
  return messages;
}
export function validateOpportunity(j: Opportunity): string[] {
  const errors: string[] = [];
  if (!j.title?.trim() || j.title.length > 120)
    errors.push("Enter a title of 1–120 characters.");
  if (!j.location?.trim() || !j.description?.trim() || !j.workInvolved?.trim())
    errors.push("Location, description, and work involved are required.");
  if (!qualifications.includes(j.eligibility.minQualification))
    errors.push("Choose a valid qualification.");
  if (
    !j.eligibility.allowedLocations.length ||
    j.eligibility.allowedLocations.some((l) => !l.trim())
  )
    errors.push("Specify allowed locations, or Any.");
  if (
    !j.scoredSkills.length ||
    j.scoredSkills.some(
      (s) =>
        !s.name.trim() ||
        !Number.isFinite(s.points) ||
        s.points <= 0 ||
        s.points > 1000,
    )
  )
    errors.push("Add ranking skills with positive points, at most 1000 each.");
  if (
    new Set(j.scoredSkills.map((s) => normalizeSkill(s.name))).size !==
    j.scoredSkills.length
  )
    errors.push("Ranking skills must be unique, including aliases.");
  if (
    j.eligibility.compulsorySkills.some(
      (s) =>
        !s.name.trim() ||
        !Number.isFinite(s.threshold ?? 0.8) ||
        (s.threshold ?? 0.8) <= 0 ||
        (s.threshold ?? 0.8) > 1,
    )
  )
    errors.push("Compulsory thresholds must be greater than 0 and at most 1.");
  const total = j.scoredSkills.reduce((n, s) => n + s.points, 0),
    { tier1Min, tier2Min } = j.tierCutoffs;
  if (
    !Number.isFinite(tier1Min) ||
    !Number.isFinite(tier2Min) ||
    !(tier1Min > tier2Min && tier2Min >= 0 && tier1Min <= total)
  )
    errors.push(
      "Cut-offs must satisfy Tier 1 > Tier 2 ≥ 0, and Tier 1 ≤ total points.",
    );
  if (j.salary !== null && (!Number.isFinite(j.salary) || j.salary < 0))
    errors.push("Pay must be non-negative, or unknown.");
  if (
    j.commuteMinutes !== null &&
    (!Number.isFinite(j.commuteMinutes) || j.commuteMinutes < 0)
  )
    errors.push("Commute must be non-negative, or unknown.");
  for (const r of j.eligibility.otherCriteria)
    if (
      !["experienceYears", "year", "status"].includes(r.field) ||
      ![">=", "<=", "=", "!="].includes(r.operator) ||
      (r.field === "status"
        ? !["=", "!="].includes(r.operator) ||
          !["student", "graduate", "working", "job-seeker"].includes(
            String(r.value),
          )
        : typeof r.value !== "number" || !Number.isFinite(r.value))
    )
      errors.push("Invalid additional eligibility rule.");
  return errors;
}
