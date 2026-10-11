import { describe, it, expect } from "vitest";
import { createSeed } from "../data/seed";
import { applyAction, streak } from "./actions";
import {
  scoreApplicant,
  evaluateApplicant,
  overallTier,
} from "../engine/matching";
import { verifyCertificate, certificateDigest } from "./certificates";
import { quizForSkill } from "../data/quizzes";
import type { Certificate } from "../engine/types";
const now = new Date("2026-10-11T12:00:00");
describe("validated demo mutations and evidence", () => {
  it("saves eligible applications separately from bookmarks and prevents duplicates", async () => {
    const initial = createSeed();
    const applicant = initial.applicants.find(
      (a) => a.id === "sample-applicant-google-1",
    )!;
    const action = { type: "apply" as const, jobId: applicant.goalRole };
    const session = { role: "applicant" as const, id: applicant.id };
    const next = await applyAction(initial, session, action, now);
    const saved = next.applicants.find((a) => a.id === applicant.id)!;
    expect(saved.applications).toEqual([
      { jobId: action.jobId, submittedAt: now.toISOString() },
    ]);
    expect(saved.interestedJobIds).toEqual([]);
    expect(
      initial.applicants.find((a) => a.id === applicant.id)!.applications,
    ).toBeUndefined();
    await expect(applyAction(next, session, action, now)).rejects.toThrow(
      "already applied",
    );
    saved.degree = "Diploma";
    expect(
      scoreApplicant(
        saved,
        next.opportunities.find((j) => j.id === action.jobId)!,
      ).eligible,
    ).toBe(false);
    expect(saved.applications).toHaveLength(1);
  });
  it("rejects ineligible, missing-job and company applications", async () => {
    const data = createSeed();
    await expect(
      applyAction(
        data,
        { role: "applicant", id: "sample-applicant-google-4" },
        { type: "apply", jobId: "sample-job-google" },
        now,
      ),
    ).rejects.toThrow("every compulsory");
    await expect(
      applyAction(
        data,
        { role: "applicant", id: "a1" },
        { type: "apply", jobId: "missing" },
        now,
      ),
    ).rejects.toThrow("not found");
    await expect(
      applyAction(
        data,
        { role: "company", id: "c1" },
        { type: "apply", jobId: "j1" },
        now,
      ),
    ).rejects.toThrow("Applicant access");
  });
  it("profile updates cannot forge application records", async () => {
    const data = createSeed();
    const applicant = structuredClone(data.applicants[0]);
    applicant.applications = [{ jobId: "j1", submittedAt: now.toISOString() }];
    const next = await applyAction(
      data,
      { role: "applicant", id: applicant.id },
      { type: "profile", applicant },
      now,
    );
    expect(next.applicants[0].applications).toBeUndefined();
  });
  it("two local courses move Nila’s reporting job from Tier 3 to Tier 2 with exact points", async () => {
    let d = createSeed();
    const a = () => d.applicants.find((a) => a.id === "a3")!,
      j = d.opportunities.find((j) => j.id === "j3")!;
    expect(scoreApplicant(a(), j).score).toBe(12);
    expect(scoreApplicant(a(), j).tier).toBe("Tier 3");
    d = await applyAction(
      d,
      { role: "applicant", id: "a3" },
      { type: "course", courseId: "course-1" },
      now,
    );
    d = await applyAction(
      d,
      { role: "applicant", id: "a3" },
      { type: "course", courseId: "course-2" },
      now,
    );
    expect(scoreApplicant(a(), j).score).toBe(49);
    expect(scoreApplicant(a(), j).tier).toBe("Tier 2");
    expect(a().skills.every((s) => s.evidence === "course")).toBe(true);
    expect(a().progress.reduce((n, p) => n + p.xp, 0)).toBe(100);
  });
  it("cannot award a course twice", async () => {
    let d = createSeed();
    d = await applyAction(
      d,
      { role: "applicant", id: "a3" },
      { type: "course", courseId: "course-1" },
      now,
    );
    await expect(
      applyAction(
        d,
        { role: "applicant", id: "a3" },
        { type: "course", courseId: "course-1" },
        now,
      ),
    ).rejects.toThrow("already completed");
  });
  it("daily self-report earns XP without raising skills or tiers", async () => {
    const d = createSeed(),
      a = d.applicants[2],
      before = evaluateApplicant(a, d.opportunities);
    const next = await applyAction(
      d,
      { role: "applicant", id: a.id },
      {
        type: "checkin",
        checkIn: {
          date: "fake",
          skill: "Excel",
          minutes: 20,
          note: "Practised formulas",
          quizPassed: true,
        },
      },
      now,
    );
    const b = next.applicants[2];
    expect(b.skills).toEqual(a.skills);
    expect(b.checkIns[0].date).toBe("2026-10-11");
    expect(b.checkIns[0].quizPassed).toBe(false);
    expect(overallTier(evaluateApplicant(b, next.opportunities))).toEqual(
      overallTier(before),
    );
    expect(streak(b, now)).toBe(1);
  });
  it("rejects duplicate daily check-ins", async () => {
    let d = createSeed();
    const action = {
      type: "checkin" as const,
      checkIn: {
        date: "",
        skill: "Excel",
        minutes: 10,
        note: "Practised",
        quizPassed: false,
      },
    };
    d = await applyAction(d, { role: "applicant", id: "a3" }, action, now);
    await expect(
      applyAction(d, { role: "applicant", id: "a3" }, action, now),
    ).rejects.toThrow("already checked in");
  });
  it("rejects wrong quiz answers; passing quiz updates evidence and level once per day", async () => {
    let d = createSeed();
    await expect(
      applyAction(
        d,
        { role: "applicant", id: "a3" },
        { type: "quiz", skill: "Excel", answers: [2, 2, 1] },
        now,
      ),
    ).rejects.toThrow("correctly");
    d = await applyAction(
      d,
      { role: "applicant", id: "a3" },
      {
        type: "quiz",
        skill: "Excel",
        answers: quizForSkill("Excel").map((q) => q.answer),
      },
      now,
    );
    expect(d.applicants[2].skills[0].level).toBe(2);
    expect(d.applicants[2].skills[0].evidence).toBe("quiz");
    await expect(
      applyAction(
        d,
        { role: "applicant", id: "a3" },
        { type: "quiz", skill: "Excel", answers: [0, 1, 2] },
        now,
      ),
    ).rejects.toThrow("already completed");
  });
  it("cannot forge Verified certificates through a profile payload", async () => {
    const d = createSeed(),
      a = structuredClone(d.applicants[2]);
    a.certificates = [{ id: "fake", status: "Verified" } as Certificate];
    a.skills[0] = {
      name: "React",
      level: 5,
      evidence: "certificate",
      certificateId: "fake",
    };
    const next = await applyAction(
      d,
      { role: "applicant", id: a.id },
      { type: "profile", applicant: a },
      now,
    );
    expect(next.applicants[2].certificates).toEqual([]);
    expect(next.applicants[2].skills[0].evidence).toBe("self");
  });
  it("SHA-256 digest is consistent for canonical identity fields", async () => {
    expect(
      await certificateDigest(
        "RL-2026-001",
        "Aarav Joshi",
        "Frontend Foundations",
      ),
    ).toBe(
      await certificateDigest(
        "rl-2026-001",
        "aarav joshi",
        "frontend foundations",
      ),
    );
  });
  it("simulates Verified, Unverified, and Invalid states", async () => {
    const d = createSeed();
    const c: Certificate = {
      id: "",
      applicantId: "a1",
      title: "Frontend Foundations",
      type: "course",
      issuer: "Civic Learning Studio",
      certId: "RL-2026-001",
      issueDate: "2026-09-01",
      status: "Unverified",
      reason: "",
      skillsClaimed: ["Docker"],
    };
    expect((await verifyCertificate(c, "Aarav Joshi", d.registry)).status).toBe(
      "Verified",
    );
    expect(
      (
        await verifyCertificate(
          { ...c, certId: "RL-2026-999" },
          "Aarav Joshi",
          d.registry,
        )
      ).status,
    ).toBe("Unverified");
    expect(
      (await verifyCertificate(c, "Someone Else", d.registry)).status,
    ).toBe("Invalid");
    expect(
      (
        await verifyCertificate(
          { ...c, certId: "wrong" },
          "Aarav Joshi",
          d.registry,
        )
      ).status,
    ).toBe("Invalid");
    const next = await applyAction(
      d,
      { role: "applicant", id: "a1" },
      { type: "certificate", certificate: c },
      now,
    );
    expect(next.applicants[0].certificates[0].skillsClaimed).toEqual(["React"]);
    expect(
      next.applicants[0].skills.find((s) => s.name === "ReactJS")?.evidence,
    ).toBe("certificate");
  });
  it("changing identity rechecks certificate evidence", async () => {
    let d = createSeed();
    const c: Certificate = {
      id: "",
      applicantId: "a1",
      title: "Frontend Foundations",
      type: "course",
      issuer: "Civic Learning Studio",
      certId: "RL-2026-001",
      issueDate: "2026-09-01",
      status: "Unverified",
      reason: "",
      skillsClaimed: [],
    };
    d = await applyAction(
      d,
      { role: "applicant", id: "a1" },
      { type: "certificate", certificate: c },
      now,
    );
    const a = structuredClone(d.applicants[0]);
    a.name = "Changed Name";
    d = await applyAction(
      d,
      { role: "applicant", id: "a1" },
      { type: "profile", applicant: a },
      now,
    );
    expect(d.applicants[0].certificates[0].status).toBe("Invalid");
    expect(scoreApplicant(d.applicants[0], d.opportunities[0]).eligible).toBe(
      false,
    );
  });
  it("company cannot edit another company’s opportunity", async () => {
    const d = createSeed();
    await expect(
      applyAction(
        d,
        { role: "company", id: "c2" },
        { type: "opportunity", opportunity: d.opportunities[0] },
        now,
      ),
    ).rejects.toThrow("your company");
  });
  it("applicant cannot edit another applicant", async () => {
    const d = createSeed();
    await expect(
      applyAction(
        d,
        { role: "applicant", id: "a1" },
        { type: "profile", applicant: d.applicants[1] },
        now,
      ),
    ).rejects.toThrow("your own");
  });
  it("cutoffs re-tier the eligible mid-score profile but do not open failed gates", async () => {
    let d = createSeed();
    const j = d.opportunities[0],
      sana = d.applicants[4];
    expect(scoreApplicant(sana, j).tier).toBe("Tier 2");
    d = await applyAction(
      d,
      { role: "company", id: "c1" },
      {
        type: "opportunity",
        opportunity: { ...j, tierCutoffs: { tier1Min: 60, tier2Min: 45 } },
      },
      now,
    );
    expect(scoreApplicant(d.applicants[4], d.opportunities[0]).tier).toBe(
      "Tier 1",
    );
    expect(scoreApplicant(d.applicants[1], d.opportunities[0]).tier).toBeNull();
  });
  it("rejects invalid cutoff without mutating source data", async () => {
    const d = createSeed();
    await expect(
      applyAction(
        d,
        { role: "company", id: "c1" },
        {
          type: "opportunity",
          opportunity: {
            ...d.opportunities[0],
            tierCutoffs: { tier1Min: 101, tier2Min: 45 },
          },
        },
        now,
      ),
    ).rejects.toThrow("Cut-offs");
    expect(d.revision).toBe(1);
  });
});
