import { useState } from "react";
import { Link } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Award, Flame, BookOpen, ShieldCheck, Check } from "lucide-react";
import { useStore } from "../store/useStore";
import {
  evaluateApplicant,
  overallTier,
  recommendPath,
  skillGap,
} from "../engine/matching";
import { localDate, streak } from "../lib/actions";
import { quizForSkill } from "../data/quizzes";
import { PageTitle, Stat, Modal } from "../components/ui";
export default function Progress() {
  const { data, session, act, busy } = useStore(),
    a = data.applicants.find((a) => a.id === session!.id)!,
    overall = overallTier(evaluateApplicant(a, data.opportunities));
  const xp = a.progress.reduce((n, p) => n + p.xp, 0),
    level = 1 + Math.floor(xp / 100),
    today = localDate(),
    checked = a.checkIns.some((c) => c.date === today),
    verified = a.certificates.filter((c) => c.status === "Verified").length;
  const [error, setError] = useState(""),
    [quizSkill, setQuizSkill] = useState(a.skills[0]?.name || "Excel"),
    [quiz, setQuiz] = useState(false),
    [answers, setAnswers] = useState<number[]>([]),
    [quizError, setQuizError] = useState("");
  const days = Array.from({ length: 56 }, (_, i) => {
      const day = new Date();
      day.setDate(day.getDate() - (55 - i));
      return localDate(day);
    }),
    chartData = Object.values(
      a.progress.reduce<
        Record<string, { date: string; skills: number; readiness: number }>
      >((o, p) => {
        o[p.date] = {
          date: p.date.slice(5),
          skills: p.skillCount,
          readiness: p.overallPct,
        };
        return o;
      }, {}),
    );
  const goal = data.opportunities.find((j) => j.id === a.goalRole),
    path = goal ? recommendPath(skillGap(a, goal), data.courses) : null;
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 6);
  const weekStart = localDate(weekAgo),
    recent = a.progress.filter((p) => p.date >= weekStart),
    minutes = a.checkIns
      .filter((c) => c.date >= weekStart)
      .reduce((n, c) => n + c.minutes, 0);
  async function checkin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    setError("");
    try {
      await act({
        type: "checkin",
        checkIn: {
          date: today,
          skill: String(f.skill),
          minutes: Number(f.minutes),
          note: String(f.note),
          quizPassed: false,
        },
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function submitQuiz() {
    setQuizError("");
    try {
      await act({ type: "quiz", skill: quizSkill, answers });
      setQuiz(false);
    } catch (e) {
      setQuizError((e as Error).message);
    }
  }
  const badges = [
    ...(a.completedCourseIds.length
      ? [
          {
            title: "Learning in motion",
            text: a.completedCourseIds.length + " completed local courses",
          },
        ]
      : []),
    ...(verified
      ? [
          {
            title: "Evidence builder",
            text: verified + " simulated verified certificates",
          },
        ]
      : []),
    ...(streak(a) >= 3
      ? [
          {
            title: "Consistent learner",
            text: streak(a) + "-day check-in streak",
          },
        ]
      : []),
  ];
  return (
    <>
      <PageTitle
        eyebrow="PROGRESS & DAILY PRACTICE"
        title="Small steps. Visible progress."
        description="XP celebrates activity. Eligibility and tiers always come from the matching engine."
      />
      <div className="stats-grid">
        <Stat
          label="Match readiness"
          value={
            overall.count
              ? overall.scorePct.toFixed(1) + "%"
              : "No eligible tier"
          }
          icon={<ShieldCheck />}
          detail="Overall best-match score percentage"
        />
        <Stat
          label="Activity level"
          value={"Level " + level}
          icon={<Award />}
          detail={xp + " XP · " + (100 - (xp % 100)) + " XP to next level"}
        />
        <Stat
          label="Completed courses"
          value={a.completedCourseIds.length}
          icon={<BookOpen />}
        />
        <Stat
          label="Daily streak"
          value={streak(a) + " days"}
          icon={<Flame />}
        />
      </div>
      <div className="two-columns">
        <section className="panel">
          <h2>Your skills over time</h2>
          <p className="muted">
            Snapshots are recorded when an activity earns XP.
          </p>
          {chartData.length ? (
            <div className="chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d8e5ea" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line
                    name="Skills"
                    dataKey="skills"
                    type="monotone"
                    stroke="#147e76"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="small-note">
              Complete a course, add a skill, or check in to create your first
              progress snapshot.
            </p>
          )}
          <h3 style={{ marginTop: 23 }}>Last 56 days</h3>
          <div className="heatmap" aria-label="Daily check-in calendar">
            {days.map((date) => (
              <div
                key={date}
                className={
                  a.checkIns.some((c) => c.date === date) ? "active" : ""
                }
                title={
                  date +
                  (a.checkIns.some((c) => c.date === date)
                    ? " · checked in"
                    : " · no check-in")
                }
                aria-label={
                  date +
                  (a.checkIns.some((c) => c.date === date)
                    ? " checked in"
                    : " no check-in")
                }
              />
            ))}
          </div>
          <p className="small-note">
            Teal squares indicate recorded check-ins.
          </p>
        </section>
        <section className="panel">
          <h2>Today’s check-up</h2>
          {checked ? (
            <div className="notice">
              <Check size={18} />
              <span>
                You have checked in today. Keep practising; XP does not
                automatically raise your skill level.
              </span>
            </div>
          ) : (
            <form onSubmit={checkin}>
              <label>
                Skill practised
                <input
                  name="skill"
                  required
                  maxLength={60}
                  defaultValue={a.skills[0]?.name || "Excel"}
                />
              </label>
              <label>
                Minutes practised
                <input
                  name="minutes"
                  type="number"
                  required
                  min="1"
                  max="1440"
                  defaultValue="20"
                />
              </label>
              <label>
                What did you learn?
                <textarea name="note" required maxLength={1000} />
              </label>
              {error && (
                <p role="alert" className="form-error">
                  {error}
                </p>
              )}
              <button className="btn primary" disabled={busy}>
                Save daily check-in
              </button>
            </form>
          )}
          <p className="small-note">
            Self-reported practice gives activity XP only. Quiz, simulated
            course, or verified certificate evidence can update a skill level.
          </p>
          <label>
            Local self-quiz skill
            <select
              value={quizSkill}
              onChange={(e) => setQuizSkill(e.target.value)}
            >
              {[
                ...new Set([
                  ...a.skills.map((s) => s.name),
                  ...data.courses.flatMap((c) => c.skillsTaught),
                ]),
              ].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <button
            className="btn secondary"
            disabled={!quizForSkill(quizSkill).length}
            onClick={() => {
              setQuiz(true);
              setAnswers([]);
              setQuizError("");
            }}
          >
            Take 3-question demo quiz
          </button>
          {!quizForSkill(quizSkill).length && (
            <p className="small-note">
              No local quiz is available for this skill.
            </p>
          )}
          <p className="small-note">
            Quiz evidence is simulated for the demo, not a professional
            qualification.
          </p>
        </section>
      </div>
      <div className="two-columns" style={{ marginTop: 23 }}>
        <section className="panel">
          <h2>This week, in your words</h2>
          <p className="muted">
            Over the last seven days, you logged {minutes} practice minutes,
            completed {recent.filter((p) => p.kind === "course").length} local
            learning steps, and earned {recent.reduce((n, p) => n + p.xp, 0)}{" "}
            XP. Your current overall result is{" "}
            {overall.tier
              ? overall.tier + " at " + overall.scorePct.toFixed(1) + "%"
              : "no eligible tier"}
            .
          </p>
          <p className="small-note">
            Next suggested action:{" "}
            {path?.steps[0]?.course.title ||
              "Review your profile and compulsory eligibility rules"}
            .
          </p>
          <Link className="text-btn" to="/goal">
            Open my learning path
          </Link>
          <h3 style={{ marginTop: 24 }}>Your badges</h3>
          {badges.length ? (
            badges.map((b) => (
              <div className="gap-item" key={b.title}>
                <div>
                  <strong>{b.title}</strong>
                  <small>{b.text}</small>
                </div>
                <Award size={18} color="#147e76" />
              </div>
            ))
          ) : (
            <p className="small-note">
              Badges appear when you reach the relevant activity milestones.
            </p>
          )}
        </section>
        <section className="panel">
          <h2>Activity & tier history</h2>
          {a.progress.length ? (
            a.progress
              .slice()
              .reverse()
              .slice(0, 12)
              .map((p) => (
                <div className="activity-item" key={p.id}>
                  <div>
                    <strong>{p.label}</strong>
                    <p className="small-note">
                      {p.tier || "No eligible tier"} · {p.overallPct.toFixed(1)}
                      % readiness
                    </p>
                  </div>
                  <span>
                    {p.date}
                    <br />+{p.xp} XP
                  </span>
                </div>
              ))
          ) : (
            <p className="muted">
              Your activities and matching snapshots will appear here.
            </p>
          )}
        </section>
      </div>
      {!checked && a.checkIns.length > 0 && (
        <div className="notice" style={{ marginTop: 20 }}>
          <Flame size={18} />
          <span>
            A gentle reminder: you haven’t checked in today. A short practice
            session is a useful next step.
          </span>
        </div>
      )}
      {quiz && (
        <Modal
          title={"Practice quiz: " + quizSkill}
          onClose={() => setQuiz(false)}
        >
          {quizForSkill(quizSkill).map((q, i) => (
            <div className="quiz-question" key={i}>
              <h3>{q.question}</h3>
              {q.options.map((option, n) => (
                <label className="quiz-option" key={n}>
                  <input
                    type="radio"
                    name={"q" + i}
                    checked={answers[i] === n}
                    onChange={() =>
                      setAnswers((previous) => {
                        const next = [...previous];
                        next[i] = n;
                        return next;
                      })
                    }
                  />
                  {option}
                </label>
              ))}
            </div>
          ))}
          {quizError && (
            <p role="alert" className="form-error">
              {quizError}
            </p>
          )}
          <button className="btn primary" disabled={busy} onClick={submitQuiz}>
            Submit demo quiz
          </button>
        </Modal>
      )}
    </>
  );
}
