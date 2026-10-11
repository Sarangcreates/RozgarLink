import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Plus,
  Users,
  BriefcaseBusiness,
  ShieldCheck,
  Layers3,
  LockKeyhole,
  Trash2,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { useStore } from "../store/useStore";
import { qualifications, type Opportunity } from "../engine/types";
import {
  compareMatches,
  scoreApplicant,
  validateOpportunity,
} from "../engine/matching";
import {
  Audit,
  Empty,
  PageTitle,
  Stat,
  TierChip,
  money,
} from "../components/ui";

export function CompanyDashboard() {
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(9);
  const { data, session } = useStore(),
    company = data.companies.find((c) => c.id === session!.id)!;
  const jobs = data.opportunities.filter((j) => j.companyId === company.id);
  const candidates = data.applicants.filter((a) =>
    [a.name, a.location, a.degree, ...a.skills.map((s) => s.name)]
      .join(" ")
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  );
  const pool = jobs
    .flatMap((j) => data.applicants.map((a) => scoreApplicant(a, j)))
    .filter((r) => r.eligible);
  return (
    <>
      <PageTitle
        eyebrow="COMPANY OVERVIEW"
        title={"Hello, " + company.name + "."}
        description="Make your criteria clear. Find the people who meet them."
      >
        <Link className="btn primary" to="/company/new">
          <Plus size={16} />
          Post opportunity
        </Link>
      </PageTitle>
      <div className="stats-grid">
        <Stat
          label="Posted opportunities"
          value={jobs.length}
          icon={<BriefcaseBusiness />}
        />
        <Stat
          label="Eligible profile matches"
          value={pool.length}
          icon={<ShieldCheck />}
          detail="Across your posted opportunities"
        />
        <Stat
          label="Tier 1 matches"
          value={pool.filter((r) => r.tier === "Tier 1").length}
          icon={<Layers3 />}
        />
        <Stat
          label="Shared matching profiles"
          value={data.applicants.length}
          icon={<Users />}
        />
      </div>
      <div className="goal-banner">
        <div>
          <p className="eyebrow">FAIR MATCHING STARTS HERE</p>
          <h2>Set the gate. Explain the score.</h2>
          <p>
            Compulsory criteria determine eligibility. Weighted skills and
            preferences rank eligible profiles.
          </p>
        </div>
        <ShieldCheck size={45} />
      </div>
      <div className="section-heading">
        <div>
          <h2>Your opportunities</h2>
          <p>
            Tier counts update automatically when profiles or cut-offs change.
          </p>
        </div>
      </div>
      {!jobs.length ? (
        <Empty
          title="Your first opportunity starts here"
          text="Post explicit requirements and ranking skills."
        >
          <Link className="btn primary" to="/company/new">
            Create opportunity
          </Link>
        </Empty>
      ) : (
        <div className="panel table-wrap">
          <table>
            <thead>
              <tr>
                <th>Opportunity</th>
                <th>Pay / month</th>
                <th>Eligible</th>
                <th>Applications</th>
                <th>Tier 1</th>
                <th>Tier 2</th>
                <th>Tier 3</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => {
                const results = data.applicants
                  .map((a) => scoreApplicant(a, j))
                  .filter((r) => r.eligible);
                return (
                  <tr key={j.id}>
                    <td>
                      <Link className="table-title" to={"/opportunity/" + j.id}>
                        {j.title}
                      </Link>
                      <small>
                        {j.location} · {j.jobType}
                      </small>
                    </td>
                    <td>{money(j.salary)}</td>
                    <td>{results.length}</td>
                    <td>
                      {
                        data.applicants.filter((a) =>
                          a.applications?.some(
                            (application) => application.jobId === j.id,
                          ),
                        ).length
                      }
                    </td>
                    {(["Tier 1", "Tier 2", "Tier 3"] as const).map((t) => (
                      <td key={t}>
                        {results.filter((r) => r.tier === t).length}
                      </td>
                    ))}
                    <td>
                      <Link className="text-btn" to={"/opportunity/" + j.id}>
                        View applicants <ArrowRight size={13} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="small-note">
        The leaderboard evaluates profiles shared by applicants. These are
        matching profiles. Open an opportunity to see its submitted applications
        separately.
      </p>
      <section aria-labelledby="candidate-directory-title">
        <div className="section-heading">
          <div>
            <h2 id="candidate-directory-title">Find job seekers</h2>
            <p>
              Browse shared profiles. Sample profiles are fictional and have no
              login accounts.
            </p>
          </div>
        </div>
        <label htmlFor="candidate-search">
          Search by name, skill, location or qualification
        </label>
        <input
          id="candidate-search"
          type="search"
          value={search}
          placeholder="Try Python, Pune or Java"
          onChange={(event) => {
            setSearch(event.target.value);
            setVisibleCount(9);
          }}
        />
        <p className="small-note" role="status">
          {candidates.length} matching profiles
        </p>
        <div className="candidate-grid">
          {candidates.slice(0, visibleCount).map((a) => {
            const matches = jobs
              .map((j) => scoreApplicant(a, j))
              .filter((r) => r.eligible);
            return (
              <article className="panel" key={a.id}>
                {a.sample && (
                  <p className="eyebrow">FICTIONAL SAMPLE PROFILE</p>
                )}
                <h3>{a.name}</h3>
                <p>
                  {a.degree} · {a.location}
                </p>
                <p>{a.experienceYears} years of experience</p>
                <ul>
                  {a.skills.map((skill) => (
                    <li key={skill.name}>
                      {skill.name} · level {skill.level}/5
                    </li>
                  ))}
                </ul>
                <p className="small-note">
                  {matches.length} eligible matches with your opportunities
                </p>
                {matches.length > 0 && (
                  <div>
                    {matches.map((match) => (
                      <p key={match.opportunityId}>
                        <Link to={"/opportunity/" + match.opportunityId}>
                          {
                            jobs.find((j) => j.id === match.opportunityId)!
                              .title
                          }
                        </Link>{" "}
                        <TierChip tier={match.tier} /> ·{" "}
                        {match.score?.toFixed(1)} points
                      </p>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
        {!candidates.length && <p>No shared profiles match this search.</p>}
        {visibleCount < candidates.length && (
          <button
            className="btn secondary"
            onClick={() => setVisibleCount((count) => count + 9)}
          >
            Show more profiles
          </button>
        )}
      </section>
    </>
  );
}
export function OpportunityEditor() {
  const { id } = useParams(),
    { data, session, act, busy } = useStore(),
    navigate = useNavigate(),
    original = data.opportunities.find((j) => j.id === id);
  const [job, setJob] = useState<Opportunity>(() =>
    original
      ? structuredClone(original)
      : {
          id: crypto.randomUUID(),
          companyId: session!.id,
          title: "",
          location: "Pune",
          description: "",
          workInvolved: "",
          jobType: "Full-time",
          salary: 20000,
          commuteMinutes: 30,
          eligibility: {
            compulsorySkills: [],
            minQualification: "12th",
            allowedLocations: ["Any"],
            otherCriteria: [],
          },
          scoredSkills: [
            { name: "Communication", points: 50 },
            { name: "Excel", points: 50 },
          ],
          tierCutoffs: { tier1Min: 75, tier2Min: 45 },
        },
  );
  const [step, setStep] = useState(0),
    [newComp, setNewComp] = useState(""),
    [newSkill, setNewSkill] = useState(""),
    [newPoints, setNewPoints] = useState(20),
    [error, setError] = useState(""),
    [sample, setSample] = useState(data.applicants[0].id);
  if (original && original.companyId !== session?.id)
    return (
      <Empty
        title="This opportunity belongs to another company"
        text="Switch to its company account to edit it."
      />
    );
  const update = <K extends keyof Opportunity>(key: K, value: Opportunity[K]) =>
    setJob((j) => ({ ...j, [key]: value }));
  const total = job.scoredSkills.reduce((n, s) => n + s.points, 0),
    validation = validateOpportunity(job);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (step < 4) {
      setStep(step + 1);
      return;
    }
    if (validation.length) {
      setError(validation.join(" "));
      return;
    }
    try {
      await act({ type: "opportunity", opportunity: job });
      navigate("/opportunity/" + job.id);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="OPPORTUNITY STUDIO"
        title={
          original ? "Edit your opportunity." : "Create a clear opportunity."
        }
        description="Define the non-negotiable rules, then the points that distinguish eligible candidates."
      />
      <div className="stepper">
        {[
          "Basics",
          "Eligibility",
          "Ranking skills",
          "Tier setup",
          "Preview",
        ].map((s, i) => (
          <button
            key={s}
            className={step === i ? "active" : ""}
            onClick={() => setStep(i)}
          >
            <span>{i + 1}</span>
            {s}
          </button>
        ))}
      </div>
      <form className="panel" onSubmit={submit}>
        {step === 0 && (
          <>
            <h2>Tell applicants about the work</h2>
            <div className="form-grid">
              <label>
                Role title
                <input
                  required
                  maxLength={120}
                  value={job.title}
                  onChange={(e) => update("title", e.target.value)}
                />
              </label>
              <label>
                Work location
                <input
                  required
                  maxLength={80}
                  value={job.location}
                  onChange={(e) => update("location", e.target.value)}
                />
              </label>
              <label>
                Monthly pay (₹, blank = unknown)
                <input
                  type="number"
                  min="0"
                  value={job.salary ?? ""}
                  onChange={(e) =>
                    update(
                      "salary",
                      e.target.value === "" ? null : Number(e.target.value),
                    )
                  }
                />
              </label>
              <label>
                Estimated commute (minutes, blank = unknown)
                <input
                  type="number"
                  min="0"
                  value={job.commuteMinutes ?? ""}
                  onChange={(e) =>
                    update(
                      "commuteMinutes",
                      e.target.value === "" ? null : Number(e.target.value),
                    )
                  }
                />
              </label>
              <label>
                Job type
                <select
                  value={job.jobType}
                  onChange={(e) => update("jobType", e.target.value)}
                >
                  {[
                    "Full-time",
                    "Part-time",
                    "Internship",
                    "Apprenticeship",
                    "Traineeship",
                  ].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Description
              <textarea
                required
                maxLength={2000}
                value={job.description}
                onChange={(e) => update("description", e.target.value)}
              />
            </label>
            <label>
              Work involved
              <textarea
                required
                maxLength={2000}
                value={job.workInvolved}
                onChange={(e) => update("workInvolved", e.target.value)}
              />
            </label>
          </>
        )}
        {step === 1 && (
          <>
            <h2>Compulsory eligibility gate</h2>
            <div className="notice">
              <LockKeyhole size={18} />
              <span>
                Candidates failing any of these will NOT be shown as a match.
                Explicit aliases count; fuzzy ranking similarity cannot open
                this gate.
              </span>
            </div>
            <div className="form-grid" style={{ marginTop: 22 }}>
              <label>
                Minimum qualification
                <select
                  value={job.eligibility.minQualification}
                  onChange={(e) =>
                    update("eligibility", {
                      ...job.eligibility,
                      minQualification: e.target
                        .value as Opportunity["eligibility"]["minQualification"],
                    })
                  }
                >
                  {qualifications.map((q) => (
                    <option key={q}>{q}</option>
                  ))}
                </select>
              </label>
              <label>
                Allowed applicant locations (comma-separated, or Any)
                <input
                  required
                  value={job.eligibility.allowedLocations.join(", ")}
                  onChange={(e) =>
                    update("eligibility", {
                      ...job.eligibility,
                      allowedLocations: e.target.value
                        .split(",")
                        .map((s) => s.trim()),
                    })
                  }
                />
              </label>
            </div>
            <div className="inline-fields">
              <label>
                Compulsory skill
                <input
                  value={newComp}
                  onChange={(e) => setNewComp(e.target.value)}
                  maxLength={60}
                  placeholder="e.g. SQL"
                />
              </label>
              <button
                className="btn secondary"
                type="button"
                onClick={() => {
                  if (newComp.trim()) {
                    update("eligibility", {
                      ...job.eligibility,
                      compulsorySkills: [
                        ...job.eligibility.compulsorySkills,
                        { name: newComp.trim(), threshold: 0.8 },
                      ],
                    });
                    setNewComp("");
                  }
                }}
              >
                <Plus size={15} />
                Add skill
              </button>
            </div>
            {job.eligibility.compulsorySkills.map((s, i) => (
              <div className="skill-entry" key={i}>
                <strong>{s.name}</strong>
                <label style={{ margin: 0 }}>
                  Threshold
                  <input
                    type="number"
                    min="0.01"
                    max="1"
                    step=".01"
                    value={s.threshold ?? 0.8}
                    onChange={(e) =>
                      update("eligibility", {
                        ...job.eligibility,
                        compulsorySkills: job.eligibility.compulsorySkills.map(
                          (x, k) =>
                            k === i
                              ? { ...x, threshold: Number(e.target.value) }
                              : x,
                        ),
                      })
                    }
                  />
                </label>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={"Remove " + s.name}
                  onClick={() =>
                    update("eligibility", {
                      ...job.eligibility,
                      compulsorySkills: job.eligibility.compulsorySkills.filter(
                        (_, k) => k !== i,
                      ),
                    })
                  }
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <label style={{ marginTop: 20 }}>
              Minimum experience in years (blank = no rule)
              <input
                type="number"
                min="0"
                max="60"
                value={
                  job.eligibility.otherCriteria.find(
                    (r) => r.field === "experienceYears",
                  )?.value ?? ""
                }
                onChange={(e) =>
                  update("eligibility", {
                    ...job.eligibility,
                    otherCriteria: [
                      ...job.eligibility.otherCriteria.filter(
                        (r) => r.field !== "experienceYears",
                      ),
                      ...(e.target.value === ""
                        ? []
                        : [
                            {
                              field: "experienceYears" as const,
                              operator: ">=" as const,
                              value: Number(e.target.value),
                            },
                          ]),
                    ],
                  })
                }
              />
            </label>
          </>
        )}
        {step === 2 && (
          <>
            <h2>Skills that earn points</h2>
            <p className="muted">
              For eligible profiles: company points × match strength ×
              skill-level factor.
            </p>
            <div className="inline-fields" style={{ marginTop: 20 }}>
              <label>
                Skill
                <input
                  maxLength={60}
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                />
              </label>
              <label>
                Points
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={newPoints}
                  onChange={(e) => setNewPoints(Number(e.target.value))}
                />
              </label>
              <button
                className="btn secondary"
                type="button"
                onClick={() => {
                  if (newSkill.trim() && newPoints > 0) {
                    update("scoredSkills", [
                      ...job.scoredSkills,
                      { name: newSkill.trim(), points: newPoints },
                    ]);
                    setNewSkill("");
                  }
                }}
              >
                <Plus size={15} />
                Add
              </button>
            </div>
            {job.scoredSkills.map((s, i) => (
              <div className="skill-entry" key={i}>
                <strong>{s.name}</strong>
                <input
                  aria-label={s.name + " points"}
                  type="number"
                  min="1"
                  max="1000"
                  value={s.points}
                  onChange={(e) =>
                    update(
                      "scoredSkills",
                      job.scoredSkills.map((x, k) =>
                        k === i ? { ...x, points: Number(e.target.value) } : x,
                      ),
                    )
                  }
                />
                <span>points</span>
                <button
                  className="icon-btn"
                  type="button"
                  aria-label={"Remove " + s.name}
                  onClick={() =>
                    update(
                      "scoredSkills",
                      job.scoredSkills.filter((_, k) => k !== i),
                    )
                  }
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <p className="small-note">
              Total available points: <strong>{total}</strong>
            </p>
          </>
        )}
        {step === 3 && (
          <>
            <h2>Set raw-point tier cut-offs</h2>
            <p className="muted">
              Tier 1 must be above Tier 2 and no higher than the total available
              points.
            </p>
            <div className="form-grid" style={{ marginTop: 22 }}>
              <label>
                Tier 1 minimum
                <input
                  type="number"
                  min="0"
                  max={total}
                  step=".1"
                  required
                  value={job.tierCutoffs.tier1Min}
                  onChange={(e) =>
                    update("tierCutoffs", {
                      ...job.tierCutoffs,
                      tier1Min: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label>
                Tier 2 minimum
                <input
                  type="number"
                  min="0"
                  max={total}
                  step=".1"
                  required
                  value={job.tierCutoffs.tier2Min}
                  onChange={(e) =>
                    update("tierCutoffs", {
                      ...job.tierCutoffs,
                      tier2Min: Number(e.target.value),
                    })
                  }
                />
              </label>
            </div>
            <div className="cutoff-bar">
              <span
                className="tier-3"
                style={{
                  width:
                    (total ? (job.tierCutoffs.tier2Min / total) * 100 : 0) +
                    "%",
                }}
              >
                Tier 3
              </span>
              <span
                className="tier-2"
                style={{
                  width:
                    (total
                      ? ((job.tierCutoffs.tier1Min - job.tierCutoffs.tier2Min) /
                          total) *
                        100
                      : 0) + "%",
                }}
              >
                Tier 2
              </span>
              <span
                className="tier-1"
                style={{
                  width:
                    (total
                      ? ((total - job.tierCutoffs.tier1Min) / total) * 100
                      : 0) + "%",
                }}
              >
                Tier 1
              </span>
            </div>
            <p className="small-note">
              Maximum: {total} points. Tier 2 starts at{" "}
              {job.tierCutoffs.tier2Min}; Tier 1 starts at{" "}
              {job.tierCutoffs.tier1Min}.
            </p>
          </>
        )}
        {step === 4 && (
          <>
            <h2>Preview the exact evaluation</h2>
            {validation.length > 0 && (
              <div className="form-error">
                {validation.map((e) => (
                  <p key={e}>{e}</p>
                ))}
              </div>
            )}
            <label>
              Sample profile
              <select
                value={sample}
                onChange={(e) => setSample(e.target.value)}
              >
                {data.applicants.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} · {a.degree}
                  </option>
                ))}
              </select>
            </label>
            <Audit
              job={job}
              result={scoreApplicant(
                data.applicants.find((a) => a.id === sample)!,
                job,
              )}
            />
          </>
        )}
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <div className="form-actions">
          {step > 0 && (
            <button
              type="button"
              className="btn secondary"
              onClick={() => setStep(step - 1)}
            >
              <ArrowLeft size={15} />
              Back
            </button>
          )}
          <button className="btn primary" disabled={busy}>
            {busy ? "Saving…" : step === 4 ? "Save opportunity" : "Next step"}
            <ArrowRight size={15} />
          </button>
        </div>
      </form>
    </>
  );
}
