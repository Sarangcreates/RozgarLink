import type {
  Action,
  Applicant,
  DataSet,
  Session,
  Skill,
} from "../engine/types";
import { qualifications } from "../engine/types";
import {
  canonicalSkill,
  compulsorySimilarity,
  normalizeSkill,
} from "../engine/skills";
import {
  evaluateApplicant,
  overallTier,
  scoreApplicant,
  validateOpportunity,
} from "../engine/matching";
import { verifyCertificate } from "./certificates";
import { quizForSkill } from "../data/quizzes";
export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function requiredText(s: unknown, max = 2000) {
  return typeof s === "string" && s.trim().length > 0 && s.length <= max;
}
function assert(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error(message);
}
export function validateProfile(a: Applicant) {
  assert(
    requiredText(a.name, 80) &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email) &&
      /^\d{10}$/.test(a.phone),
    "Enter a name, valid email, and 10-digit phone number.",
  );
  assert(
    qualifications.includes(a.degree) &&
      requiredText(a.location, 80) &&
      ["student", "graduate", "working", "job-seeker"].includes(a.status),
    "Check qualification, location, and status.",
  );
  assert(
    Number.isFinite(a.experienceYears) &&
      a.experienceYears >= 0 &&
      a.experienceYears <= 60 &&
      Number.isInteger(a.year) &&
      a.year >= 1950 &&
      a.year <= 2100,
    "Check year and experience.",
  );
  assert(
    Number.isFinite(a.targetWeeks) &&
      a.targetWeeks >= 1 &&
      a.targetWeeks <= 104,
    "Target timeline must be 1–104 weeks.",
  );
  for (const v of [a.preferences.commute, a.preferences.minPay])
    assert(
      v === null || (Number.isFinite(v) && v >= 0 && v <= 10000000),
      "Preference values must be non-negative or unknown.",
    );
  assert(
    a.skills.length <= 50 &&
      a.skills.every(
        (s) =>
          requiredText(s.name, 60) &&
          Number.isInteger(s.level) &&
          s.level >= 1 &&
          s.level <= 5 &&
          ["self", "quiz", "course", "certificate"].includes(s.evidence),
      ),
    "Skill levels must be 1–5; at most 50 skills.",
  );
  assert(
    new Set(a.skills.map((s) => normalizeSkill(s.name))).size ===
      a.skills.length,
    "Remove duplicate skills, including aliases.",
  );
}
function upskill(
  a: Applicant,
  name: string,
  level: Skill["level"],
  evidence: Skill["evidence"],
  certificateId?: string,
) {
  const old = a.skills.find((s) => compulsorySimilarity(s.name, name) === 1);
  if (old) {
    old.level = Math.max(old.level, level) as Skill["level"];
    old.evidence = evidence;
    old.certificateId = certificateId;
  } else
    a.skills.push({
      name: canonicalSkill(name),
      level,
      evidence,
      ...(certificateId ? { certificateId } : {}),
    });
}
export async function applyAction(
  data: DataSet,
  session: Session,
  action: Action,
  now = new Date(),
): Promise<DataSet> {
  const d = structuredClone(data),
    date = localDate(now);
  const a = d.applicants.find((p) => p.id === session.id);
  let event: {
    kind: Applicant["progress"][number]["kind"];
    label: string;
    xp: number;
  } | null = null;
  if (action.type === "opportunity") {
    assert(
      session.role === "company",
      "Only companies can edit opportunities.",
    );
    const j = action.opportunity;
    assert(
      j.companyId === session.id &&
        d.companies.some((c) => c.id === j.companyId),
      "You can edit only your company’s opportunities.",
    );
    const existing = d.opportunities.find((o) => o.id === j.id);
    assert(
      !existing || existing.companyId === session.id,
      "Opportunity belongs to another company.",
    );
    const errors = validateOpportunity(j);
    assert(errors.length === 0, errors.join(" "));
    assert(
      j.id.length <= 100 &&
        j.description.length <= 2000 &&
        j.workInvolved.length <= 2000,
      "Opportunity text is too long.",
    );
    if (existing) d.opportunities[d.opportunities.indexOf(existing)] = j;
    else d.opportunities.push(j);
  } else if (action.type === "review") {
    const r = action.review;
    assert(
      d.opportunities.some((j) => j.id === r.jobId),
      "Opportunity not found.",
    );
    assert(
      Number.isInteger(r.rating) &&
        r.rating >= 1 &&
        r.rating <= 5 &&
        requiredText(r.title, 120) &&
        requiredText(r.text, 1500) &&
        requiredText(r.pros, 500) &&
        requiredText(r.cons, 500),
      "Complete the review and choose a rating from 1–5.",
    );
    assert(
      !/\b(fuck|shit|bastard)\b/i.test(
        [r.title, r.text, r.pros, r.cons].join(" "),
      ),
      "Please remove profanity from the review.",
    );
    const author =
      session.role === "applicant"
        ? a?.name
        : d.companies.find((c) => c.id === session.id)?.name;
    assert(author, "Session not found.");
    d.reviews.push({ ...r, id: crypto.randomUUID(), date, author });
  } else {
    assert(session.role === "applicant" && a, "Applicant access required.");
    if (action.type === "profile") {
      const p = action.applicant;
      assert(p.id === a.id, "You may edit only your own profile.");
      validateProfile(p);
      assert(
        !d.applicants.some(
          (other) =>
            other.id !== a.id &&
            (other.email.toLowerCase() === p.email.toLowerCase() ||
              other.phone === p.phone),
        ),
        "Email or phone is already used by another profile.",
      );
      assert(
        !p.goalRole ||
          d.opportunities.some(
            (j) => j.id === p.goalRole && j.companyId === p.goalCompany,
          ),
        "Choose a goal role belonging to your selected company.",
      );
      if (p.name.trim().toLowerCase() !== a.name.trim().toLowerCase())
        a.certificates = await Promise.all(
          a.certificates.map((c) => verifyCertificate(c, p.name, d.registry)),
        );
      const changedSkills = p.skills.filter(
        (s) =>
          !a.skills.some(
            (old) => normalizeSkill(old.name) === normalizeSkill(s.name),
          ),
      );
      const trusted = p.skills.map((s) => {
        const old = a.skills.find(
          (x) => normalizeSkill(x.name) === normalizeSkill(s.name),
        );
        const certificate = a.certificates.find(
          (c) =>
            c.id === s.certificateId &&
            c.status === "Verified" &&
            c.skillsClaimed.some((n) => compulsorySimilarity(n, s.name) === 1),
        );
        if (s.evidence === "certificate" && certificate) return s;
        if (old && s.evidence === old.evidence && s.level === old.level)
          return s;
        return { ...s, evidence: "self" as const, certificateId: undefined };
      });
      Object.assign(a, {
        ...p,
        skills: trusted,
        certificates: a.certificates,
        completedCourseIds: a.completedCourseIds,
        checkIns: a.checkIns,
        progress: a.progress,
        interestedJobIds: a.interestedJobIds,
        applications: a.applications,
        sample: a.sample,
      });
      if (changedSkills.length)
        event = {
          kind: "skill",
          label: `Added ${changedSkills.map((s) => s.name).join(", ")}`,
          xp: 10 * changedSkills.length,
        };
    } else if (action.type === "apply") {
      const job = d.opportunities.find((j) => j.id === action.jobId);
      assert(job, "Opportunity not found.");
      assert(
        scoreApplicant(a, job).eligible,
        "You must meet every compulsory requirement before applying.",
      );
      assert(
        !a.applications?.some((application) => application.jobId === job.id),
        "You have already applied to this opportunity.",
      );
      a.applications = [
        ...(a.applications || []),
        { jobId: job.id, submittedAt: now.toISOString() },
      ];
    } else if (action.type === "bookmark") {
      assert(
        d.opportunities.some((j) => j.id === action.jobId),
        "Opportunity not found.",
      );
      a.interestedJobIds = a.interestedJobIds.includes(action.jobId)
        ? a.interestedJobIds.filter((id) => id !== action.jobId)
        : [...a.interestedJobIds, action.jobId];
    } else if (action.type === "course") {
      const c = d.courses.find((c) => c.id === action.courseId);
      assert(c, "Course is not in the local catalogue.");
      assert(
        !a.completedCourseIds.includes(c.id),
        "This course is already completed.",
      );
      a.completedCourseIds.push(c.id);
      c.skillsTaught.forEach((s) => upskill(a, s, c.level, "course"));
      event = {
        kind: "course",
        label: `Completed ${c.title} (simulated)`,
        xp: 50,
      };
    } else if (action.type === "certificate") {
      const c = action.certificate;
      assert(
        c.applicantId === a.id &&
          requiredText(c.title, 120) &&
          requiredText(c.issuer, 120) &&
          requiredText(c.certId, 80) &&
          ["course", "project", "degree"].includes(c.type) &&
          /^\d{4}-\d{2}-\d{2}$/.test(c.issueDate),
        "Check the certificate fields.",
      );
      const verified = await verifyCertificate(
        { ...c, id: crypto.randomUUID() },
        a.name,
        d.registry,
      );
      assert(
        !a.certificates.some(
          (old) => old.certId.toUpperCase() === c.certId.toUpperCase(),
        ),
        "This certificate ID is already added.",
      );
      a.certificates.push(verified);
      if (verified.status === "Verified") {
        verified.skillsClaimed.forEach((s) =>
          upskill(a, s, 3, "certificate", verified.id),
        );
        event = {
          kind: "certificate",
          label: `Verified ${verified.title} (simulated)`,
          xp: 40,
        };
      }
    } else if (action.type === "checkin") {
      const c = action.checkIn;
      assert(
        !a.checkIns.some((c) => c.date === date),
        "You have already checked in today.",
      );
      assert(
        requiredText(c.skill, 60) &&
          Number.isInteger(c.minutes) &&
          c.minutes >= 1 &&
          c.minutes <= 1440 &&
          requiredText(c.note, 1000),
        "Add a skill, 1–1440 minutes, and a short note.",
      );
      a.checkIns.push({ ...c, date, quizPassed: false });
      event = {
        kind: "checkin",
        label: `Practised ${c.skill} for ${c.minutes} minutes`,
        xp: 15,
      };
    } else if (action.type === "quiz") {
      const questions = quizForSkill(action.skill);
      assert(
        questions.length === 3 &&
          requiredText(action.skill, 60) &&
          action.answers.length === questions.length &&
          action.answers.every((answer, i) => answer === questions[i].answer),
        "Answer all three skill questions correctly.",
      );
      assert(
        !a.progress.some(
          (p) =>
            p.kind === "quiz" &&
            p.date === date &&
            p.label === `Practice quiz: ${canonicalSkill(action.skill)}`,
        ),
        "This skill quiz was already completed today.",
      );
      const old = a.skills.find(
        (s) => compulsorySimilarity(s.name, action.skill) === 1,
      );
      upskill(
        a,
        action.skill,
        Math.min(5, (old?.level || 0) + 1) as Skill["level"],
        "quiz",
      );
      const check = a.checkIns.find((c) => c.date === date);
      if (check) check.quizPassed = true;
      event = {
        kind: "quiz",
        label: `Practice quiz: ${canonicalSkill(action.skill)}`,
        xp: 20,
      };
    } else throw new Error("Unknown action.");
    if (event)
      a.progress.push({
        id: crypto.randomUUID(),
        date,
        ...event,
        skillCount: a.skills.length,
        overallPct: overallTier(evaluateApplicant(a, d.opportunities)).scorePct,
        tier: overallTier(evaluateApplicant(a, d.opportunities)).tier,
      });
  }
  d.revision++;
  return d;
}
export function streak(a: Applicant, now = new Date()) {
  let n = 0;
  const date = new Date(now);
  if (!a.checkIns.some((c) => c.date === localDate(date)))
    date.setDate(date.getDate() - 1);
  while (a.checkIns.some((c) => c.date === localDate(date))) {
    n++;
    date.setDate(date.getDate() - 1);
  }
  return n;
}
