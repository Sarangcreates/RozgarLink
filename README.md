# Current version: functional local prototype

See [PROTOTYPE.md](PROTOTYPE.md) for current account setup and limitations. Password registration replaces the old demo OTP; judge reset and account switching are disabled. The older demo documentation below describes the original version.

## Public website deployment

### Optional Gemini explanations

Copy `.env.example` to `.env`, add a replacement key as `GEMINI_API_KEY`, then restart `npm run dev`. Keep the key on the backend only; do not use a `VITE_` key. In a hosted backend, set `GEMINI_API_KEY` and optionally `GEMINI_MODEL` in that server's environment. Open **My tier** and click **Explain my points and tier**. The optional service sends matching results and goal skill gaps to Google only when requested. Names, emails, contact details, certificate identifiers, and other applicants are excluded. Gemini explains existing engine results; it never decides eligibility or updates scores, tiers, profiles, or courses. The rest of the app works offline without a key. This optional integration and its data transfer are explicitly approved by the user and override the original no-external-API rule for explanations only. A Gemini key does not replace the hosted backend required by Vercel.

### Hosting setup

For a Render **Web Service** with the Node runtime, use Node 24, build command `npm ci --include=dev && npm run build`, and start command `npm start`. The server binds to `0.0.0.0` automatically on Render and uses Render's `PORT`. The Render-provided `RENDER_EXTERNAL_URL` is automatically trusted for sign-in and printed as the public link. Open that `https://...onrender.com` URL from the dashboard; `localhost:10000` is a local-computer address. Additional separate frontend domains still belong in `APP_ORIGINS`. A static-site-only deployment cannot run the backend.

To preserve accounts on Render, attach persistent storage and set `DB_PATH` to a SQLite file within its mount path (for example `/opt/render/project/src/storage/rozgarlink.sqlite` when that is the disk mount path). Render persistent disks require a paid service; without a persistent disk, SQLite files can be lost on restart or redeploy. Do not switch the database path if you need to preserve an existing database without first migrating it. No paid resources have been created by this project update. The local alternative is `npm run dev` and http://localhost:5173.

The canonical `https://rozgar-link.vercel.app` frontend and local ports 5173, 3001, and 4173 are trusted by default. Direct same-origin requests to the server-hosted app are also accepted. For additional production, custom, or preview domains, set `APP_ORIGINS` to a comma-separated list of their full origins (for example `https://your-custom-domain.example,https://your-preview.example`), then restart the backend. `APP_ORIGIN` remains supported. A changed environment setting takes effect when the backend restarts. Keep unrelated domains out of the allowlist.

The Vercel frontend needs a running backend; a static build cannot provide sign-in or SQLite persistence. The `vercel.json` API rewrite and `api/proxy.ts` function forward same-origin API requests to the server specified by the Vercel environment variable `BACKEND_URL`. They preserve login cookies and never cache account responses.

Deploy the included Dockerfile on a Node-compatible container host with a persistent volume mounted at `/data`. Use one server instance for this SQLite database. Set `APP_ORIGIN=https://rozgar-link.vercel.app`, keep `COOKIE_SECURE=true`, and expose port 3001 through HTTPS. Local data is not uploaded automatically; online accounts start in a separate database. Keep the persistent volume across redeployments.

Once the backend's HTTPS URL is available, set `BACKEND_URL` in the Vercel project's Production environment to that URL (no `/api` suffix), then redeploy. Check `/api/health` on the Vercel domain: it must return JSON with `ok: true`. Register an online account, sign out, sign back in, and verify profile changes remain after a backend restart. The backend and Vercel function require Node.js 24.

Without Docker, run `npm ci`, `npm run build`, and `npm start` on a server with `HOST=0.0.0.0`, `PORT` set to the host's assigned port, `DB_PATH` pointing to persistent storage, `APP_ORIGIN` set to the public frontend origin, and `COOKIE_SECURE=true` behind HTTPS. No hosting service or paid resource has been provisioned by these changes.

# RozgarLink

A fictional Skills-to-Opportunity Matching Engine for a GovTech hackathon. One app with company and applicant portals, an explained deterministic matching engine, and a free local SQLite database.

## Run

Install **Node.js 24.x** (required for built-in SQLite) and npm. Extract the ZIP, enter the `rozgarlink` folder, then:

```bash
npm install
npm run dev
```

Open **http://localhost:5173**. The same command starts the Node.js API on port 3001 and the React frontend on port 5173. Both ports must be available. Stop with Ctrl+C.

The initial dependency installation needs internet access. Once installed, the application runs locally without internet, external APIs, paid services, or a hosted database. Keep the Node server running for shared SQLite persistence. If the API becomes unavailable, an explicitly labelled browser-local fallback is available; fallback changes are not synced into SQLite when the server returns.

For the production build:

```bash
npm run build
npm start
```

Open **http://localhost:3001**. `dist/` is included, but rebuilding after edits is recommended.

## Sign in and explore

1. Select **Applicant portal** or **Company portal** on the landing page.
2. Choose a fictional account from the dropdown. Email and phone login both work.
3. Enter **123456**, or use the visible demo OTP button.
4. Applicant: open Profile, Jobs, Goal & learning, Tier, and Progress from the navigation.
5. Company: open an opportunity to see eligible applicant tiers, rejected applicants with reasons, scoring explanations, editable cut-offs, and reviews. Use New opportunity to create a listing.
6. Open the **Judge demo** page for repeatable scenarios and reset all fictional data there. Reset requires the confirmation shown on that page.

OTP, certificate verification, course completion, and quizzes are clearly labelled simulations. There is no SMS service, real credential issuer, or job application submission. This is a local hackathon demo, not a production identity or recruitment service. All profiles, companies, reviews, and opportunities are fictional.

## Five live judging scenarios

Start with Reset demo data if another scenario has changed the seeds.

| Scenario                                     | Clicks and expected result                                                                                                                                                                |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Strong skill fit cannot bypass qualification | Judge demo → Meera → inspect CivicByte Frontend Developer. Diploma fails the Bachelor's gate even with strong skills. No score or tier is assigned.                                       |
| Curated alias is explained                   | Judge demo → Aarav → inspect the same role. ReactJS matches React via the explicit local alias dictionary, and the points table explains the match.                                       |
| Learning improves points                     | Judge demo → Nila → complete Excel Essentials and SQL Essentials using the scenario button. Data Entry & Reporting Trainee changes from 12 raw points / Tier 3 to 49 raw points / Tier 2. |
| Location changes eligibility                 | Judge demo → Aarav → change residence to Delhi. The Frontend Developer role becomes Not Eligible with the allowed-location reason. Restore Pune to regain eligibility.                    |
| Cut-offs change tiers, not gates             | Judge demo → company cut-off scenario → CivicByte Frontend Developer → change Tier 1 to 60 and Tier 2 to 45. Sana's 64-point result becomes Tier 1; Meera still fails qualification.      |

The Judge demo includes measured precision/recall on the small local labelled alias evaluation set and shows missed matches. This is a demonstration dataset, not a claim about real-world matching accuracy.

## Matching rules

- Eligibility is a separate gate: **every** compulsory skill, qualification, location, and additional criterion must pass.
- Compulsory matching uses deterministic normalization and curated aliases only. Ranking may use fuzzy similarity. Fuzzy matches never satisfy a compulsory gate.
- Qualification order: 10th, 12th, ITI, Diploma, Bachelor's, Master's, PhD.
- Skill levels 1–5 use factors 0.4, 0.55, 0.7, 0.85, and 1.0.
- Skill points = company points × match strength × level factor. Only eligible results receive points, tiers, or ranks.
- Per-opportunity cut-offs use raw points. Tier 1 > Tier 2 ≥ 0 and Tier 1 ≤ total points.
- Preference fit: commute 40, pay 40, job type 20; unknown earns half credit. Rank score = 0.8 × score percentage + 0.2 × preference fit. Preferences never affect eligibility.
- Overall tier uses the three eligible opportunities with the highest **score percentage** (or all eligible opportunities when fewer than three). Mean ≥70 is Tier 1, ≥40 is Tier 2, otherwise Tier 3. With none eligible, a beginner path is shown.
- Certificate-backed skills count only when the matching certificate is Verified. Changing the applicant's name rechecks certificates. Manual skill changes become self-reported evidence.
- Profile saves and learning actions immediately recompute results and show what changed. Draft profile edits preview the goal result. Other connected sessions refresh every three seconds; stale writes are rejected to avoid silent overwrites.
- Courses and learning paths come only from the bundled local JSON catalogue. Completing a course is simulated and cannot fix qualification or location gates.

## Database and API

**SQLite is free and embedded**: no database account, subscription, API key, or separate installation. The seeded database is included at `server/data/rozgarlink.sqlite`. If absent, startup creates it from the local JSON seeds. `npm run seed` initializes a missing database and preserves existing data.

SQLite stores fictional entities as typed JSON records, a revision counter, and expiring demo sessions with hashed random tokens. Mutations validate ownership and inputs, use transactions and version checks, and reuse the matching logic from the frontend. Session cookies are HttpOnly and SameSite Strict. Public reads expose only this fictional demo dataset. The server binds to the local machine.

Core endpoints: `GET /api/state`, `GET /api/auth/me`, `POST /api/auth/login`, `POST /api/auth/logout`, `POST /api/actions`, `GET /api/evaluate/:id`, and `POST /api/demo/reset`. Mutations accept JSON and require a signed-in demo session except login. Data changes require the current revision. No external API is called.

## Project files

```text
src/engine/       Pure TypeScript eligibility, matching, scoring, tiers, explanations, tests
src/data/         Fictional seed JSON, local course catalogue, quizzes, certificate registry
src/store/        Zustand persisted browser state and API synchronization
src/pages/        Company and applicant features, landing, login, judge demo
src/components/   Layout, explanations, reviews, reusable UI
src/lib/          Validated actions, certificate simulation, API client
server/           Express API, SQLite repository, seeding, integration tests
scripts/          Combined frontend/backend development launcher
server/data/      Included seeded SQLite database
AGENTS.md         Original standing rulebook, preserved verbatim
IMPLEMENTATION.md Latest-request stack override and implementation scope
```

React 18, Vite, TypeScript, Tailwind, React Router, Zustand, Vitest, Recharts, lucide-react, Express, and Node's SQLite. The lockfile fixes the delivered dependency resolution. No `node_modules` folder is included; `npm install` supplies it.

## Verification

```bash
npm run test
npm run build
```

Tests cover gates versus ranking, exact points, boundaries, aliases, preference separation, cut-off validation, empty results, course progression, certificate evidence and identity changes, daily actions, ownership, API sessions, stale writes, SQLite persistence, and reset. Development and production HTTP startup were also smoke-tested. Interactive browser visual QA was unavailable in the build environment; use the live judging scenarios above to verify the browser UI on your machine.

## Scope and assumptions

Your latest request for a backend and a free database takes precedence over the earlier frontend-only restriction. The original AGENTS.md remains unchanged; IMPLEMENTATION.md records the override. SQLite replaces a hosted free-tier database so there is no account, quota, or payment requirement. No real users or opportunities are supported in this demo. The local course catalogue contains learning content and simulated completion; it does not embed a third-party course platform. Readiness estimates use one hour of learning per day and are not promises of employment. The full current app is delivered as requested; future changes can return to your one-step-at-a-time workflow.

Results are decision support. Criteria used are those stated by each opportunity.
