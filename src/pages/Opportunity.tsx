import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Pencil, ShieldCheck, Users, Layers3 } from "lucide-react";
import { useStore } from "../store/useStore";
import {
  compareMatches,
  evaluateApplicant,
  scoreApplicant,
} from "../engine/matching";
import {
  Audit,
  Empty,
  Modal,
  PageTitle,
  Stat,
  TierChip,
  money,
} from "../components/ui";
import Reviews from "../components/Reviews";
import type { Applicant } from "../engine/types";
export default function OpportunityPage() {
  const { id } = useParams(),
    { data, session, act, busy } = useStore(),
    job = data.opportunities.find((j) => j.id === id);
  const [search, setSearch] = useState(""),
    [tier, setTier] = useState("All"),
    [audit, setAudit] = useState<Applicant | null>(null),
    [error, setError] = useState("");
  if (!job)
    return (
      <Empty
        title="Opportunity not found"
        text="This listing may have changed. Return to your workspace."
      />
    );
  const company = data.companies.find((c) => c.id === job.companyId)!,
    own = session?.role === "company" && session.id === job.companyId,
    applicant = data.applicants.find((a) => a.id === session?.id);
  const pool = data.applicants.map((a) => ({ a, r: scoreApplicant(a, job) }));
  const eligible = pool
      .filter((x) => x.r.eligible)
      .sort((x, y) => compareMatches(x.r, y.r)),
    rejected = pool.filter((x) => !x.r.eligible);
  const result = applicant
    ? evaluateApplicant(applicant, data.opportunities).find(
        (r) => r.opportunityId === job.id,
      )
    : null;
  async function cutoffs(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await act({
        type: "opportunity",
        opportunity: {
          ...job!,
          tierCutoffs: {
            tier1Min: Number(f.get("tier1")),
            tier2Min: Number(f.get("tier2")),
          },
        },
      });
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow={company.name.toUpperCase()}
        title={job.title}
        description={`${job.location} · ${job.jobType} · ${money(job.salary)} / month`}
      >
        {own && (
          <Link className="btn secondary" to={"/company/edit/" + job.id}>
            <Pencil size={15} />
            Edit opportunity
          </Link>
        )}
      </PageTitle>
      <div className="two-columns">
        <div className="panel">
          <h2>About the opportunity</h2>
          <p className="muted">{job.description}</p>
          <h3 style={{ marginTop: 22 }}>Work involved</h3>
          <p className="muted">{job.workInvolved}</p>
          <h3 style={{ marginTop: 22 }}>Compulsory requirements</h3>
          <div className="tag-row">
            {job.eligibility.compulsorySkills.map((s) => (
              <span className="skill-tag" key={s.name}>
                {s.name} · required
              </span>
            ))}
          </div>
          <p className="small-note">
            Minimum: {job.eligibility.minQualification} · Allowed residence:{" "}
            {job.eligibility.allowedLocations.join(", ")} · Commute:{" "}
            {job.commuteMinutes === null
              ? "unknown"
              : job.commuteMinutes + " minutes"}
          </p>
        </div>
        <div className="panel">
          <h2>Point system</h2>
          {job.scoredSkills.map((s) => (
            <div className="gap-item" key={s.name}>
              <strong>{s.name}</strong>
              <span>{s.points} points</span>
            </div>
          ))}
          <p className="small-note">
            Tier 1 ≥ {job.tierCutoffs.tier1Min} raw points · Tier 2 ≥{" "}
            {job.tierCutoffs.tier2Min} raw points · otherwise Tier 3.
          </p>
          {own && (
            <form key={data.revision} onSubmit={cutoffs}>
              <div className="form-grid">
                <label>
                  Tier 1
                  <input
                    name="tier1"
                    type="number"
                    step=".1"
                    defaultValue={job.tierCutoffs.tier1Min}
                    required
                  />
                </label>
                <label>
                  Tier 2
                  <input
                    name="tier2"
                    type="number"
                    step=".1"
                    defaultValue={job.tierCutoffs.tier2Min}
                    required
                  />
                </label>
              </div>
              {error && (
                <p role="alert" className="form-error">
                  {error}
                </p>
              )}
              <button className="btn primary" disabled={busy}>
                Update cut-offs
              </button>
            </form>
          )}
        </div>
      </div>
      {session?.role === "company" && (
        <>
          <div className="section-heading">
            <div>
              <h2>Applicant matching leaderboard</h2>
              <p>
                All fictional profiles · eligible candidates ranked using skill
                points and preference fit.
              </p>
            </div>
          </div>
          <div className="stats-grid">
            <Stat
              label="Eligible"
              value={eligible.length}
              icon={<ShieldCheck />}
            />
            {(["Tier 1", "Tier 2", "Tier 3"] as const).map((t) => (
              <Stat
                key={t}
                label={t}
                value={eligible.filter((x) => x.r.tier === t).length}
                icon={<Layers3 />}
              />
            ))}
          </div>
          <div className="filter-row">
            <input
              aria-label="Search applicants"
              placeholder="Search applicants"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              aria-label="Filter applicant tier"
              value={tier}
              onChange={(e) => setTier(e.target.value)}
            >
              {["All", "Tier 1", "Tier 2", "Tier 3"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          {(["Tier 1", "Tier 2", "Tier 3"] as const)
            .filter((t) => tier === "All" || tier === t)
            .map((t) => (
              <section key={t} className="panel" style={{ marginBottom: 16 }}>
                <h3>
                  <TierChip tier={t} />
                </h3>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Applicant</th>
                        <th>Skill points</th>
                        <th>Preference fit</th>
                        <th>Rank value</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {eligible
                        .filter(
                          (x) =>
                            x.r.tier === t &&
                            x.a.name
                              .toLowerCase()
                              .includes(search.toLowerCase()),
                        )
                        .map((x) => (
                          <tr key={x.a.id}>
                            <td>#{eligible.indexOf(x) + 1}</td>
                            <td>
                              {x.a.name}
                              <small>
                                {x.a.degree} · {x.a.location}
                              </small>
                            </td>
                            <td>
                              {x.r.score!.toFixed(2)} / {x.r.totalPoints}
                            </td>
                            <td>{x.r.prefFit!.toFixed(1)}</td>
                            <td>{x.r.rankScore!.toFixed(1)}</td>
                            <td>
                              <button
                                className="text-btn"
                                onClick={() => setAudit(x.a)}
                              >
                                Explain score
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                {!eligible.some((x) => x.r.tier === t) && (
                  <p className="small-note">No profiles in this tier yet.</p>
                )}
              </section>
            ))}
          <details className="panel">
            <summary
              style={{ cursor: "pointer", fontSize: 12, fontWeight: 600 }}
            >
              Not eligible ({rejected.length}) — exact failed conditions
            </summary>
            {rejected.map(({ a, r }) => (
              <div className="rule failed" key={a.id}>
                <Users size={17} />
                <div>
                  <strong>{a.name}</strong>
                  {r.failed.map((f) => (
                    <p key={f.label}>{f.reason}</p>
                  ))}
                </div>
              </div>
            ))}
          </details>
        </>
      )}
      {result && (
        <section className="panel" style={{ marginTop: 24 }}>
          <div className="section-heading" style={{ marginTop: 0 }}>
            <h2>Your evaluation</h2>
            <TierChip tier={result.tier} />
          </div>
          <Audit result={result} job={job} />
          <Link
            className="btn primary"
            style={{ marginTop: 20 }}
            to={"/goal?job=" + job.id}
          >
            Build my learning path
          </Link>
        </section>
      )}
      <div style={{ marginTop: 25 }}>
        <Reviews jobId={job.id} />
      </div>
      {audit && (
        <Modal
          title={"Evaluation: " + audit.name}
          wide
          onClose={() => setAudit(null)}
        >
          <Audit job={job} result={scoreApplicant(audit, job)} />
        </Modal>
      )}
    </>
  );
}
