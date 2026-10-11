import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Check, Clock, Route, ShieldCheck } from "lucide-react";
import { useStore } from "../store/useStore";
import {
  checkEligibility,
  evaluateApplicant,
  recommendPath,
  skillGap,
} from "../engine/matching";
import { compulsorySimilarity } from "../engine/skills";
import type { Course } from "../engine/types";
import { Empty, Modal, PageTitle, Stat, TierChip } from "../components/ui";
export default function Goal() {
  const [params, setParams] = useSearchParams(),
    { data, session, act, busy } = useStore(),
    a = data.applicants.find((a) => a.id === session!.id)!,
    job = data.opportunities.find(
      (j) => j.id === (params.get("job") || a.goalRole),
    );
  const [course, setCourse] = useState<Course | null>(null),
    [error, setError] = useState("");
  if (!job)
    return (
      <Empty
        title="Choose your goal"
        text="Select a company and role in your profile to build a learning path."
      >
        <Link className="btn primary" to="/profile">
          Set my goal
        </Link>
      </Empty>
    );
  const gaps = skillGap(a, job),
    path = recommendPath(gaps, data.courses),
    eligibility = checkEligibility(a, job),
    result = evaluateApplicant(a, data.opportunities).find(
      (r) => r.opportunityId === job.id,
    )!;
  const readyBy = new Date();
  readyBy.setDate(readyBy.getDate() + Math.ceil(path.totalHours));
  const hasEligible = evaluateApplicant(a, data.opportunities).some(
    (r) => r.eligible,
  );
  async function complete(c: Course) {
    setError("");
    try {
      await act({ type: "course", courseId: c.id });
      setCourse(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="YOUR LEARNING ROADMAP"
        title="Turn a gap into a next step."
        description="Local learning resources, ordered by compulsory gaps and potential skill points."
      />
      <label style={{ maxWidth: 500 }}>
        Explore a role
        <select
          value={job.id}
          onChange={(e) => setParams({ job: e.target.value })}
        >
          {data.opportunities.map((j) => (
            <option key={j.id} value={j.id}>
              {j.title} ·{" "}
              {data.companies.find((c) => c.id === j.companyId)?.name}
            </option>
          ))}
        </select>
      </label>
      <div className="goal-banner">
        <div>
          <p className="eyebrow">
            {data.companies.find((c) => c.id === job.companyId)?.name}
          </p>
          <h2>{job.title}</h2>
          <p>
            {result.eligible
              ? `${result.score!.toFixed(1)} / ${result.totalPoints} points`
              : "Compulsory criteria need attention"}{" "}
            · Target: {a.targetWeeks} weeks
          </p>
        </div>
        <TierChip tier={result.tier} />
      </div>
      {eligibility.failed.filter((f) => !f.label.startsWith("Compulsory skill"))
        .length > 0 && (
        <div className="notice warning" style={{ marginTop: 20 }}>
          <ShieldCheck size={18} />
          <div>
            <strong>Courses do not resolve these requirements:</strong>
            {eligibility.failed
              .filter((f) => !f.label.startsWith("Compulsory skill"))
              .map((f) => (
                <p key={f.label}>{f.reason}</p>
              ))}
          </div>
        </div>
      )}
      <div className="stats-grid" style={{ marginTop: 23 }}>
        <Stat label="Skills to develop" value={gaps.length} icon={<Route />} />
        <Stat label="Local learning steps" value={path.steps.length} />
        <Stat
          label="Estimated study time"
          value={path.totalHours + "h"}
          icon={<Clock />}
        />
        <Stat
          label="Study plan finish"
          value={
            path.steps.length
              ? readyBy.toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                })
              : "No steps"
          }
          detail="Illustrative: 1 study hour/day, not job readiness"
        />
      </div>
      <div className="two-columns">
        <section className="panel">
          <h2>Your next learning steps</h2>
          <p className="muted">
            Compulsory gaps first, then higher potential points. For each gap,
            the shortest suitable local course is selected. Completion is
            simulated course evidence.
          </p>
          {path.steps.map(({ course: c, gaps: covered }, i) => (
            <div className="roadmap-step" key={c.id}>
              <span className="roadmap-number">{i + 1}</span>
              <div>
                <h3>{c.title}</h3>
                <p>
                  {c.provider} · {c.duration} hours · teaches up to level{" "}
                  {c.level}/5
                </p>
                <p>
                  {covered
                    .map(
                      (g) =>
                        g.name +
                        (g.compulsory ? " (compulsory)" : "") +
                        " · potential +" +
                        g.pointsGain.toFixed(1) +
                        " points",
                    )
                    .join("; ")}
                </p>
              </div>
              <button
                className="btn secondary"
                disabled={busy || a.completedCourseIds.includes(c.id)}
                onClick={() => setCourse(c)}
              >
                {a.completedCourseIds.includes(c.id)
                  ? "Completed"
                  : "Open lesson"}
              </button>
            </div>
          ))}
          {!path.steps.length && (
            <p className="small-note">
              No available course steps remain for these skill gaps.
            </p>
          )}
          {path.uncovered.length > 0 && (
            <div className="notice warning" style={{ marginTop: 15 }}>
              <span>
                No local catalogue course reaches the required level for:{" "}
                {path.uncovered.map((g) => g.name).join(", ")}. We do not invent
                external courses.
              </span>
            </div>
          )}
          {a.completedCourseIds.length > 0 && (
            <>
              <h3 style={{ marginTop: 25 }}>Completed local courses</h3>
              {a.completedCourseIds.map((id) => {
                const c = data.courses.find((c) => c.id === id);
                return c ? (
                  <p className="small-note" key={id}>
                    <Check
                      size={13}
                      style={{ display: "inline", color: "#147e76" }}
                    />{" "}
                    {c.title}
                  </p>
                ) : null;
              })}
            </>
          )}
        </section>
        <section className="panel">
          <h2>Gap report</h2>
          {gaps.map((g) => (
            <div className="gap-item" key={g.name}>
              <div>
                <strong>{g.name}</strong>
                <small>
                  {g.compulsory ? "Compulsory gap" : "Ranking skill"} · level{" "}
                  {g.currentLevel} → {g.targetLevel}
                </small>
              </div>
              <span>+{g.pointsGain.toFixed(1)} pts</span>
            </div>
          ))}
          {!gaps.length && (
            <p className="muted">
              Your profile has all listed skills at the maximum level.
            </p>
          )}
          <p className="small-note">
            Potential points assume an exact skill match at the indicated target
            level. Eligibility is still checked separately.
          </p>
        </section>
      </div>
      {!hasEligible && (
        <section className="panel" style={{ marginTop: 23 }}>
          <h2>Beginner path</h2>
          <p className="muted">
            Not yet eligible for any listed opportunity. These local starter
            units can help build basic skills; they cannot replace qualification
            or residence requirements.
          </p>
          {data.courses
            .filter(
              (c) =>
                c.level === 3 &&
                c.skillsTaught.some(
                  (s) =>
                    compulsorySimilarity(s, "Basic Computer") === 1 ||
                    compulsorySimilarity(s, "Communication") === 1,
                ),
            )
            .map((c) => (
              <div className="roadmap-step" key={c.id}>
                <div>
                  <h3>{c.title}</h3>
                  <p>{c.duration} hours</p>
                </div>
                <button className="btn secondary" onClick={() => setCourse(c)}>
                  Open lesson
                </button>
              </div>
            ))}
        </section>
      )}
      {course && (
        <Modal title={course.title} onClose={() => setCourse(null)}>
          <p className="muted">
            {course.provider} · {course.duration} hours · level {course.level}
          </p>
          <div className="notice" style={{ marginTop: 20 }}>
            <Route size={18} />
            <span>{course.content}</span>
          </div>
          <p className="small-note">
            This is a local, simulated learning unit. Marking it complete grants
            the course’s stated skill level and recomputes your opportunities.
            No live course provider is contacted.
          </p>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <button
            className="btn primary"
            disabled={busy || a.completedCourseIds.includes(course.id)}
            onClick={() => complete(course)}
          >
            {a.completedCourseIds.includes(course.id)
              ? "Already completed"
              : "Mark step done (demo)"}
          </button>
        </Modal>
      )}
    </>
  );
}
