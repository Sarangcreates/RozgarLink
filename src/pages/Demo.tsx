import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FlaskConical, ShieldCheck, ArrowRight, RotateCcw } from "lucide-react";
import { useStore } from "../store/useStore";
import { qualifications } from "../engine/types";
import { evaluateApplicant, overallTier } from "../engine/matching";
import { matcherEvaluation, aliasDictionary } from "../engine/skills";
import { PageTitle, Stat, Audit, Modal, TierChip } from "../components/ui";
export default function Demo() {
  const { data, session, login, act, resetDemo, busy } = useStore(),
    navigate = useNavigate(),
    a = data.applicants.find((a) => a.id === session?.id);
  const [candidate, setCandidate] = useState(a?.id || "a2"),
    [error, setError] = useState(""),
    [audit, setAudit] = useState(false);
  const evaluation = matcherEvaluation(),
    results = a ? evaluateApplicant(a, data.opportunities) : [],
    overall = overallTier(results),
    goal = a ? data.opportunities.find((j) => j.id === a.goalRole) : null;
  async function switchApplicant(id: string) {
    setError("");
    const p = data.applicants.find((a) => a.id === id)!;
    try {
      await login("applicant", p.email, "123456");
      setCandidate(id);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function switchCompany() {
    try {
      await login("company", data.companies[0].email, "123456");
      navigate("/opportunity/j1");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function learn() {
    setError("");
    try {
      if (session?.id !== "a3")
        await login(
          "applicant",
          data.applicants.find((a) => a.id === "a3")!.email,
          "123456",
        );
      for (const courseId of ["course-1", "course-2"]) {
        const current = useStore
          .getState()
          .data.applicants.find((a) => a.id === "a3")!;
        if (!current.completedCourseIds.includes(courseId))
          await useStore.getState().act({ type: "course", courseId });
      }
      setCandidate("a3");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="LIVE JUDGE WORKSPACE"
        title="Put the rules to the test."
        description="Every number below comes from the matching engine and current fictional data."
      >
        <button
          className="btn secondary"
          disabled={busy}
          onClick={() => {
            if (
              window.confirm(
                "Reset all fictional profiles, opportunities, reviews, and progress to the original demo?",
              )
            )
              resetDemo().catch((e) => setError(e.message));
          }}
        >
          <RotateCcw size={15} />
          Reset fictional demo
        </button>
      </PageTitle>
      <div className="notice">
        <FlaskConical size={18} />
        <span>
          This panel switches fictional accounts and edits their actual demo
          profiles. Use reset to replay scenarios from a clean starting point.
        </span>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <section className="panel" style={{ marginTop: 23 }}>
        <div className="inline-fields">
          <label>
            Demo applicant
            <select
              value={candidate}
              onChange={(e) => setCandidate(e.target.value)}
            >
              {data.applicants.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} · {a.degree}
                </option>
              ))}
            </select>
          </label>
          <button
            className="btn primary"
            disabled={busy}
            onClick={() => switchApplicant(candidate)}
          >
            Use this profile
          </button>
        </div>
        {a && (
          <>
            <div className="form-grid">
              <label>
                Qualification — saves immediately
                <select
                  value={a.degree}
                  disabled={busy}
                  onChange={(e) =>
                    act({
                      type: "profile",
                      applicant: {
                        ...a,
                        degree: e.target.value as typeof a.degree,
                      },
                    }).catch((e) => setError(e.message))
                  }
                >
                  {qualifications.map((q) => (
                    <option key={q}>{q}</option>
                  ))}
                </select>
              </label>
              <label>
                Location — saves immediately
                <select
                  value={a.location}
                  disabled={busy}
                  onChange={(e) =>
                    act({
                      type: "profile",
                      applicant: { ...a, location: e.target.value },
                    }).catch((e) => setError(e.message))
                  }
                >
                  {[
                    ...new Set([
                      "Pune",
                      "Mumbai",
                      "Delhi",
                      "Nashik",
                      a.location,
                    ]),
                  ].map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="stats-grid">
              <Stat
                label="Eligible listings"
                value={results.filter((r) => r.eligible).length}
              />
              <Stat
                label="Rejected listings"
                value={results.filter((r) => !r.eligible).length}
              />
              <Stat label="Overall tier" value={overall.tier || "None"} />
              <Stat
                label="Overall score"
                value={overall.scorePct.toFixed(1) + "%"}
              />
            </div>
            {goal && (
              <button className="text-btn" onClick={() => setAudit(true)}>
                Audit the goal evaluation: {goal.title}
                <ArrowRight size={14} />
              </button>
            )}
          </>
        )}
      </section>
      <div className="section-heading">
        <h2>Five required demo scenarios</h2>
      </div>
      <div className="demo-scenarios">
        <section className="panel">
          <h2>1 · Perfect skills, wrong qualification</h2>
          <p>
            Meera has maximum frontend skills but only a Diploma. Frontend
            Developer requires a Bachelor’s. The result must be Not Eligible,
            without score or tier.
          </p>
          <button
            className="btn secondary"
            onClick={() => switchApplicant("a2")}
          >
            Use Meera
          </button>
        </section>
        <section className="panel">
          <h2>2 · Equivalent skill wording</h2>
          <p>
            Aarav’s ReactJS and Node aliases match the curated React and Node.js
            definitions. Audit shows the exact alias and strength.
          </p>
          <button
            className="btn secondary"
            onClick={() => switchApplicant("a1")}
          >
            Use Aarav
          </button>
        </section>
        <section className="panel">
          <h2>3 · Location changes eligibility</h2>
          <p>
            Use Aarav, then change location from Pune to Delhi above. Frontend
            Developer must lose eligibility with a visible reason. Change back
            to restore it.
          </p>
          <button
            className="btn secondary"
            onClick={() => switchApplicant("a1")}
          >
            Open location test
          </button>
        </section>
        <section className="panel">
          <h2>4 · Two courses change the opportunity tier</h2>
          <p>
            Nila starts with Excel level 1. Complete Excel Essentials and SQL
            Essentials from the local catalogue. Her reporting opportunity moves
            from Tier 3 to Tier 2.
          </p>
          <button className="btn secondary" disabled={busy} onClick={learn}>
            Complete Nila’s two demo courses
          </button>
        </section>
        <section className="panel">
          <h2>5 · Company cut-offs re-tier applicants</h2>
          <p>
            Open CivicByte’s Frontend Developer listing. Change Tier 1 or Tier 2
            cut-offs within valid bounds. Eligible applicants re-tier
            immediately; failed gates remain failed.
          </p>
          <button className="btn secondary" onClick={switchCompany}>
            Open company cut-offs
          </button>
        </section>
      </div>
      <section className="panel" style={{ marginTop: 24 }}>
        <h2>Local matcher evaluation</h2>
        <p className="muted">
          A small labelled sanity set, not a benchmark of hiring quality. Fuzzy
          similarity is used for ranking only; compulsory skill gates use exact
          curated aliases.
        </p>
        <div className="stats-grid" style={{ marginTop: 20 }}>
          <Stat label="Labelled pairs" value={evaluation.records.length} />
          <Stat
            label="Precision"
            value={(evaluation.precision * 100).toFixed(1) + "%"}
          />
          <Stat
            label="Recall"
            value={(evaluation.recall * 100).toFixed(1) + "%"}
          />
          <Stat label="Missed known matches" value={evaluation.fn} />
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Skill pair</th>
                <th>Expected</th>
                <th>Similarity</th>
                <th>Predicted</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {evaluation.records.map((r) => (
                <tr key={r.a + "-" + r.b}>
                  <td>
                    {r.a} ↔ {r.b}
                  </td>
                  <td>{r.match ? "Match" : "No match"}</td>
                  <td>{(r.similarity * 100).toFixed(1)}%</td>
                  <td>{r.predicted ? "Match" : "No match"}</td>
                  <td>
                    {r.predicted === r.match ? "Correct" : "Miss / error"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <details style={{ marginTop: 20 }}>
          <summary style={{ fontSize: 11, cursor: "pointer" }}>
            Inspect the explicit eligibility alias dictionary
          </summary>
          {Object.entries(aliasDictionary).map(([name, aliases]) => (
            <p className="small-note" key={name}>
              <strong>{name}</strong>: {aliases.join(", ")}
            </p>
          ))}
        </details>
      </section>
      {audit && a && goal && (
        <Modal
          title="Exact rules and numbers"
          wide
          onClose={() => setAudit(false)}
        >
          <Audit
            result={results.find((r) => r.opportunityId === goal.id)!}
            job={goal}
          />
        </Modal>
      )}
    </>
  );
}
