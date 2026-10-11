import type { Applicant, Company, Course, Opportunity } from "../engine/types";

// Brand names identify illustrative demo scenarios, never actual vacancies or hiring rules.
const roles = [
  {
    slug: "google",
    name: "Google",
    title: "Software Engineer",
    city: "Bengaluru",
    experience: 1,
    skills: ["Python", "Algorithms", "SQL", "Git"],
  },
  {
    slug: "netflix",
    name: "Netflix",
    title: "Backend Engineer",
    city: "Hyderabad",
    experience: 2,
    skills: ["Java", "Microservices", "Docker", "System Design"],
  },
  {
    slug: "amazon",
    name: "Amazon",
    title: "Software Development Engineer",
    city: "Bengaluru",
    experience: 1,
    skills: ["Java", "Algorithms", "AWS", "SQL"],
  },
  {
    slug: "nvidia",
    name: "NVIDIA",
    title: "GPU Software Engineer",
    city: "Bengaluru",
    experience: 1,
    skills: ["C++", "CUDA", "Python", "Linear Algebra"],
  },
  {
    slug: "godaddy",
    name: "GoDaddy",
    title: "Full Stack Developer",
    city: "Pune",
    experience: 0,
    skills: ["JavaScript", "React", "Node.js", "Git"],
  },
  {
    slug: "persistent",
    name: "Persistent",
    title: "Java Application Developer",
    city: "Pune",
    experience: 0,
    skills: ["Java", "SQL", "Git", "Testing"],
  },
  {
    slug: "facebook",
    name: "Facebook",
    title: "Frontend Engineer",
    city: "Hyderabad",
    experience: 1,
    skills: ["React", "JavaScript", "TypeScript", "Accessibility"],
  },
  {
    slug: "openai",
    name: "OpenAI",
    title: "Machine Learning Engineer",
    city: "Bengaluru",
    experience: 2,
    skills: ["Python", "Machine Learning", "Statistics", "PyTorch"],
  },
  {
    slug: "tesla",
    name: "Tesla",
    title: "Embedded Software Engineer",
    city: "Pune",
    experience: 1,
    skills: ["C++", "Embedded Systems", "Linux", "Testing"],
  },
];

export const sampleCompanies: Company[] = roles.map((r) => ({
  id: `sample-company-${r.slug}`,
  name: r.name,
  sector: "Technology · fictional demo",
  about:
    "Illustrative company scenario only. Not affiliated with this brand. All vacancies, requirements, locations and candidates are fictional.",
  email: `${r.slug}@companies.example.test`,
  color: "#117e78",
  initials: r.name.slice(0, 2).toUpperCase(),
}));

export const sampleOpportunities: Opportunity[] = roles.map((r) => ({
  id: `sample-job-${r.slug}`,
  companyId: `sample-company-${r.slug}`,
  title: `${r.title} (sample)`,
  location: r.city,
  description:
    "Fictional demonstration vacancy. These illustrative requirements are not this company's official hiring requirements.",
  workInvolved: `Practise building and reviewing a local demonstration project using ${r.skills.join(", ")}.`,
  jobType: "Full-time",
  salary: null,
  commuteMinutes: null,
  eligibility: {
    compulsorySkills: r.skills
      .slice(0, 2)
      .map((name) => ({ name, threshold: 0.8 })),
    minQualification: "Bachelor's",
    allowedLocations: [r.city],
    otherCriteria: [
      { field: "experienceYears", operator: ">=", value: r.experience },
    ],
  },
  scoredSkills: r.skills.map((name, i) => ({
    name,
    points: [40, 30, 20, 10][i],
  })),
  tierCutoffs: { tier1Min: 80, tier2Min: 50 },
}));

const names = [
  "Aditi",
  "Kabir",
  "Isha",
  "Rohan",
  "Tara",
  "Neel",
  "Maya",
  "Arjun",
  "Sana",
];
export const sampleApplicants: Applicant[] = roles.flatMap((r, index) =>
  [5, 3, 2, 5].map((level, variant): Applicant => ({
    id: `sample-applicant-${r.slug}-${variant + 1}`,
    sample: true,
    discoverable: true,
    name: `${names[index]} Demo ${variant + 1}`,
    email: `${r.slug}.${variant + 1}@applicants.example.test`,
    phone: "",
    status: "job-seeker",
    degree: variant === 3 ? "Diploma" : "Bachelor's",
    college: "Fictional Demo Institute",
    year: 2025,
    location: r.city,
    hobbies: [],
    preferences: { commute: null, minPay: null, jobType: "Full-time" },
    goalCompany: `sample-company-${r.slug}`,
    goalRole: `sample-job-${r.slug}`,
    targetWeeks: 8,
    experienceYears: r.experience,
    skills: (variant === 2 ? r.skills.slice(0, 2) : r.skills).map((name) => ({
      name,
      level: level as 2 | 3 | 5,
      evidence: "self",
    })),
    certificates: [],
    interestedJobIds: [],
    completedCourseIds: [],
    checkIns: [],
    progress: [],
    onboarded: true,
  })),
);

export const sampleCourses: Course[] = [
  ...new Set(roles.flatMap((r) => r.skills)),
].map((skill, i) => ({
  id: `sample-course-${i + 1}`,
  title: `${skill}: local practice workshop`,
  provider: "RozgarLink Demo Academy",
  skillsTaught: [skill],
  level: 5,
  duration: 8,
  link: `#sample-course-${i + 1}`,
  content: `Simulated local workshop: define a small ${skill} project, build a working example, check edge cases and document your results. Completion records fictional course evidence for the demo; it is not a professional certification.`,
}));
