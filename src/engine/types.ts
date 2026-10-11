export const qualifications = [
  "10th",
  "12th",
  "ITI",
  "Diploma",
  "Bachelor's",
  "Master's",
  "PhD",
] as const;
export type Qualification = (typeof qualifications)[number];
export type Evidence = "self" | "quiz" | "certificate" | "course";
export type Tier = "Tier 1" | "Tier 2" | "Tier 3";
export interface Skill {
  name: string;
  level: 1 | 2 | 3 | 4 | 5;
  evidence: Evidence;
  certificateId?: string;
}
export interface Certificate {
  id: string;
  applicantId: string;
  title: string;
  type: "course" | "project" | "degree";
  issuer: string;
  certId: string;
  issueDate: string;
  status: "Verified" | "Unverified" | "Invalid";
  reason: string;
  skillsClaimed: string[];
}
export interface CheckIn {
  date: string;
  skill: string;
  minutes: number;
  note: string;
  quizPassed: boolean;
}
export interface ProgressEvent {
  id: string;
  date: string;
  kind: "skill" | "course" | "certificate" | "checkin" | "quiz";
  label: string;
  xp: number;
  skillCount: number;
  overallPct: number;
  tier?: Tier | null;
}
export interface Applicant {
  discoverable?: boolean;
  id: string;
  name: string;
  email: string;
  phone: string;
  status: "student" | "graduate" | "working" | "job-seeker";
  degree: Qualification;
  college: string;
  year: number;
  location: string;
  hobbies: string[];
  preferences: {
    commute: number | null;
    minPay: number | null;
    jobType: string | null;
  };
  goalCompany: string;
  goalRole: string;
  targetWeeks: number;
  experienceYears: number;
  skills: Skill[];
  certificates: Certificate[];
  interestedJobIds: string[];
  completedCourseIds: string[];
  checkIns: CheckIn[];
  progress: ProgressEvent[];
  onboarded: boolean;
}
export interface Criterion {
  field: "experienceYears" | "year" | "status";
  operator: ">=" | "<=" | "=" | "!=";
  value: string | number;
}
export interface Opportunity {
  id: string;
  companyId: string;
  title: string;
  location: string;
  description: string;
  workInvolved: string;
  jobType: string;
  salary: number | null;
  commuteMinutes: number | null;
  eligibility: {
    compulsorySkills: { name: string; threshold?: number }[];
    minQualification: Qualification;
    allowedLocations: string[];
    otherCriteria: Criterion[];
  };
  scoredSkills: { name: string; points: number }[];
  tierCutoffs: { tier1Min: number; tier2Min: number };
}
export interface Company {
  id: string;
  name: string;
  sector: string;
  about: string;
  email: string;
  color: string;
  initials: string;
}
export interface Review {
  id: string;
  jobId: string;
  rating: number;
  title: string;
  text: string;
  pros: string;
  cons: string;
  role: string;
  duration: string;
  date: string;
  author: string;
}
export interface Course {
  id: string;
  title: string;
  provider: string;
  skillsTaught: string[];
  level: 1 | 2 | 3 | 4 | 5;
  duration: number;
  link: string;
  content: string;
}
export interface RegistryEntry {
  certId: string;
  applicantName: string;
  title: string;
  issuer: string;
  skillsClaimed: string[];
}
export interface DataSet {
  applicants: Applicant[];
  companies: Company[];
  opportunities: Opportunity[];
  reviews: Review[];
  courses: Course[];
  registry: RegistryEntry[];
  revision: number;
}
export interface Session {
  role: "applicant" | "company";
  id: string;
}
export interface RuleResult {
  label: string;
  reason: string;
  passed: boolean;
}
export interface SkillBreakdown {
  name: string;
  companyPoints: number;
  matchedAlias: string | null;
  matchStrength: number;
  level: number;
  levelFactor: number;
  points: number;
}
export interface MatchResult {
  opportunityId: string;
  applicantId: string;
  eligible: boolean;
  passed: RuleResult[];
  failed: RuleResult[];
  breakdown: SkillBreakdown[];
  score: number | null;
  totalPoints: number;
  scorePct: number | null;
  prefFit: number | null;
  preferenceBreakdown: {
    name: string;
    points: number;
    max: number;
    reason: string;
  }[];
  rankScore: number | null;
  tier: Tier | null;
  rank: number | null;
}
export interface Gap {
  name: string;
  compulsory: boolean;
  currentLevel: number;
  targetLevel: number;
  pointsGain: number;
}
export type Action =
  | { type: "profile"; applicant: Applicant }
  | { type: "opportunity"; opportunity: Opportunity }
  | { type: "review"; review: Review }
  | { type: "bookmark"; jobId: string }
  | { type: "course"; courseId: string }
  | { type: "certificate"; certificate: Certificate }
  | { type: "checkin"; checkIn: CheckIn }
  | { type: "quiz"; skill: string; answers: number[] };
