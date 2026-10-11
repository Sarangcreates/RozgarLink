You are working with me on "RozgarLink", a Skills-to-Opportunity Matching Engine for a 12-hour hackathon (GovTech domain). Judges will test it live. Read this brief fully. It is the standing rulebook for every later step. Save it verbatim as AGENTS.md in the project root (run git init if needed). Do NOT build anything yet. Reply with a 5-line confirmation of what you understood.

PRODUCT
One web app, two portals:
- COMPANY portal: companies post opportunities with COMPULSORY criteria (eligibility gate) and POINT-WEIGHTED skills (ranking), set Tier 1/2/3 cut-offs, see ranked applicants, and read/write reviews of the job.
- APPLICANT portal: login, profile, goal company, skills, certificates (simulated verification), eligible jobs ranked with tiers, not-eligible jobs with exact reasons, skill gaps and learning paths from a local catalogue, a tier page, progress tracking and daily check-ups.

FIXED TECH STACK (do not change)
React 18 + Vite + TypeScript, Tailwind CSS, React Router, Zustand (persisted to localStorage), Vitest, Recharts, lucide-react. No backend, no database, no paid or external API. Must work fully offline. Run command: npm install && npm run dev.

FOLDERS
src/engine (pure TypeScript, no React/DOM imports, unit-tested), src/data (seed data), src/store, src/pages, src/components, src/lib.

NON-NEGOTIABLE RULES (the project is judged on these)
1. Eligibility is separate from ranking. If a candidate fails ANY compulsory rule of an opportunity, it is "Not Eligible" however good the skill fit is. Only eligible opportunities are scored, tiered and ranked.
2. Eligibility is decided ONLY by explicit rules stated by the opportunity, in deterministic code. AI/NLP/fuzzy matching may recognise skills and inform RANKING. It must never decide eligibility on its own.
3. Every result is explained in plain language: why an eligible job ranks where it does (points breakdown), and exactly which condition a rejected candidate fails.
4. Skill gaps and learning paths come only from a local JSON course catalogue. Never call a live course provider.
5. Any change to a candidate's skills, qualification, certificates or location must instantly recompute eligibility, points, tiers and rankings, with a visible "what changed" highlight.
6. Show everywhere (footer): "Results are decision support. Criteria used are those stated by each opportunity."
7. Fictional data only. Core demo must not depend on any external service.

DEFINITIONS (use exactly these)
- Qualification ladder, low to high: 10th, 12th, ITI, Diploma, Bachelor's, Master's, PhD.
- Eligible = ALL of: every compulsory skill matched (similarity >= threshold, default 0.8); applicant qualification >= minQualification; applicant location is in allowedLocations (or the opportunity allows "Any"); every otherCriteria rule passes (rule = field, operator, value, e.g. experienceYears >= 1).
- Skill level 1-5. levelFactor = 0.4, 0.55, 0.7, 0.85, 1.0 for levels 1..5.
- skillPoints = companyPoints x matchStrength x levelFactor. score = sum of skillPoints. scorePct = score / sum(companyPoints) x 100.
- Tier per opportunity: score >= tier1Min -> Tier 1; score >= tier2Min -> Tier 2; else Tier 3. Cut-offs are in raw points; validate tier1Min > tier2Min >= 0 and tier1Min <= total points.
- Preference fit (0-100): commute 40, pay 40, job type 20; unknown = half credit. Preferences affect ONLY rankScore = 0.8 x scorePct + 0.2 x prefFit. They never affect eligibility.
- Overall applicant tier: mean scorePct of their top 3 eligible opportunities: >= 70 Tier 1, >= 40 Tier 2, else Tier 3. If zero eligible: "Not yet eligible for any listed opportunity" (show beginner path).
- Each profile skill has evidence = self | quiz | certificate | course. All count in matching. Non-self evidence shows a trust badge. Certificate evidence requires a Verified certificate.

DESIGN
Modern, clean, trustworthy GovTech look. Card layout, rounded corners, soft shadows, calm indigo/teal primary, clear typography. Tier colours: Tier 1 green/gold, Tier 2 blue, Tier 3 orange, Not eligible grey/red. Mobile-first, accessible contrast, empty and loading states, max 3 clicks to any main feature.

WORKING STYLE FOR EVERY STEP
- Do only the step I give you, then STOP.
- Before finishing run: npm run test and npm run build. Fix all errors.
- No hardcoded fake numbers in the UI. All values come from the store and the engine.
- Make a git commit at the end of each step.
- End each step with: (a) what you built, (b) files changed, (c) exact commands and clicks for me to test it, (d) any assumption you made.
- Ask me only if truly blocked. Otherwise state the assumption and continue.
