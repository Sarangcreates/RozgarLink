import { Link } from "react-router-dom";
import { useState } from "react";
import { request } from "../lib/api";
import { ArrowRight, Layers3 } from "lucide-react";
import { useStore } from "../store/useStore";
import {
  evaluateApplicant,
  overallTier,
  recommendPath,
  skillGap,
} from "../engine/matching";
import { PageTitle, TierChip, Empty } from "../components/ui";
export default function TierPage() {
  const [insight, setInsight] = useState<{
    text: string;
    revision: number;
    applicantId: string;
  } | null>(null);
  const [insightError, setInsightError] = useState("");
  const [explaining, setExplaining] = useState(false);
  const { data, session } = useStore(),
    a = data.applicants.find((a) => a.id === session!.id)!,
    results = evaluateApplicant(a, data.opportunities),
    overall = overallTier(results),
    goal = data.opportunities.find((j) => j.id === a.goalRole),
    path = goal ? recommendPath(skillGap(a, goal), data.courses) : null;
  const target =
    overall.scorePct >= 70 ? 100 : overall.scorePct >= 40 ? 70 : 40;
  async function explain() {
    setExplaining(true);
    setInsightError("");
    setInsight(null);
    const applicantId = a.id;
    try {
      const response = await request("/tier-insight", {});
      if (useStore.getState().session?.id === applicantId)
        setInsight({ ...response, applicantId });
    } catch (error) {
      setInsightError((error as Error).message);
    } finally {
      setExplaining(false);
    }
  }
  const eligibleCompanies = [
    ...new Set(
      results
        .filter((r) => r.eligible)
        .map(
          (r) =>
            data.companies.find(
              (c) =>
                c.id ===
                data.opportunities.find((j) => j.id === r.opportunityId)
                  ?.companyId,
            )?.name,
        ),
    ),
  ];
  return (
    <>
      <PageTitle
        eyebrow="YOUR MATCH READINESS"
        title="Your tier. Your next milestone."
        description="Overall tier reflects your best eligible skill matches, not XP or hiring probability."
      />
      <section
        className="panel tier-insight-panel"
        aria-label="AI skill guidance"
      >
        <h2>Understand your skill standing</h2>
        <p className="muted">
          Get a Gemini explanation of your calculated points, tier, and next
          steps. This sends your matching results and skill gaps to Google,
          without your name or contact details.
        </p>
        <button className="btn primary" disabled={explaining} onClick={explain}>
          {explaining
            ? "Explaining your results…"
            : "Explain my points and tier"}
        </button>
        <div aria-live="polite">
          {insightError && (
            <p className="form-error" role="alert">
              {insightError}
            </p>
          )}
          {insight &&
            insight.revision === data.revision &&
            insight.applicantId === a.id && (
              <>
                <p className="small-note">
                  AI suggestions. The calculated scores and eligibility rules on
                  this page remain authoritative.
                </p>
                <p className="tier-insight-text">{insight.text}</p>
              </>
            )}
          {insight && insight.revision !== data.revision && (
            <p className="small-note">
              Your profile or opportunities changed. Generate a fresh
              explanation.
            </p>
          )}
        </div>
      </section>
      {!overall.tier ? (
        <Empty
          title="Not yet eligible for any listed opportunity"
          text="No overall tier is assigned when no opportunity passes every compulsory rule."
        >
          <Link className="btn primary" to="/goal">
            Open beginner path <ArrowRight size={16} />
          </Link>
        </Empty>
      ) : (
        <div className="goal-banner">
          <div>
            <p className="eyebrow">YOUR CURRENT OVERALL TIER</p>
            <h2>
              {overall.tier} · {overall.scorePct.toFixed(1)}%
            </h2>
            <p>
              Mean skill-score percentage of your best {overall.count} eligible
              opportunities.
            </p>
          </div>
          <Layers3 size={45} />
        </div>
      )}
      <div className="tier-ladder">
        {[
          {
            tier: "Tier 3" as const,
            label: "Build the foundations",
            range: "Below 40%",
            text: "Start with relevant skills and review the explicit eligibility requirements.",
          },
          {
            tier: "Tier 2" as const,
            label: "Grow your strongest matches",
            range: "40% to below 70%",
            text: "Improve evidence and skill levels for opportunities you already qualify for.",
          },
          {
            tier: "Tier 1" as const,
            label: "Strong skill alignment",
            range: "70% and above",
            text: "Your best eligible matches have strong average skill scores. Each opportunity still applies its own gate.",
          },
        ].map((t) => (
          <section
            key={t.tier}
            className={
              "tier-card " + (overall.tier === t.tier ? "current" : "")
            }
          >
            <TierChip tier={t.tier} />
            <h2>{t.label}</h2>
            <p>{t.text}</p>
            <p style={{ marginTop: 15 }}>
              <strong>{t.range}</strong>
            </p>
            {overall.tier === t.tier && <small>Your current position</small>}
          </section>
        ))}
      </div>
      {overall.tier && (
        <section className="panel">
          <h2>How your tier is computed</h2>
          <p className="muted">
            Select up to three eligible opportunities with the highest scorePct.
            Average those percentages: ≥70 is Tier 1, ≥40 is Tier 2, otherwise
            Tier 3. Preference fit does not change this calculation.
          </p>
          <div className="progress-track">
            <span
              style={{
                width: Math.min(100, (overall.scorePct / target) * 100) + "%",
              }}
            />
          </div>
          <p className="small-note">
            {overall.tier === "Tier 1"
              ? "You have reached the highest overall tier."
              : `Need ${overall.nextPct.toFixed(1)} additional average percentage points for ${overall.tier === "Tier 3" ? "Tier 2" : "Tier 1"}.`}
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Included opportunity</th>
                  <th>Raw points</th>
                  <th>Score percentage</th>
                </tr>
              </thead>
              <tbody>
                {overall.topIds.map((id) => {
                  const j = data.opportunities.find((j) => j.id === id)!,
                    r = results.find((r) => r.opportunityId === id)!;
                  return (
                    <tr key={id}>
                      <td>
                        <Link className="text-btn" to={"/opportunity/" + id}>
                          {j.title}
                        </Link>
                      </td>
                      <td>
                        {r.score!.toFixed(1)} / {r.totalPoints}
                      </td>
                      <td>{r.scorePct!.toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="small-note">
            Companies represented in your eligible matches:{" "}
            {eligibleCompanies.join(", ")}.
          </p>
        </section>
      )}
      {path && path.steps.length > 0 && (
        <section className="panel" style={{ marginTop: 22 }}>
          <h2>Next actions for your goal</h2>
          {path.steps.slice(0, 3).map(({ course, gaps }) => (
            <div className="roadmap-step" key={course.id}>
              <div>
                <h3>{course.title}</h3>
                <p>
                  {course.duration} hours · {gaps.map((g) => g.name).join(", ")}
                </p>
              </div>
              <Link className="btn secondary" to="/goal">
                Open path
              </Link>
            </div>
          ))}
          <p className="small-note">
            These actions target your selected role. They may improve its score;
            the overall tier is recalculated from all eligible opportunities.
          </p>
        </section>
      )}
    </>
  );
}
