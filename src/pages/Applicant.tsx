import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BriefcaseBusiness,
  ShieldCheck,
  Layers3,
  Bookmark,
  Target,
} from "lucide-react";
import { useStore } from "../store/useStore";
import { evaluateApplicant, overallTier, skillGap } from "../engine/matching";
import {
  Audit,
  Empty,
  JobCard,
  Modal,
  PageTitle,
  Stat,
  TierChip,
} from "../components/ui";
import type { MatchResult } from "../engine/types";
export function ApplicantDashboard() {
  const { data, session } = useStore(),
    a = data.applicants.find((a) => a.id === session!.id)!,
    results = evaluateApplicant(a, data.opportunities),
    eligible = results.filter((r) => r.eligible),
    overall = overallTier(results),
    goal = data.opportunities.find((j) => j.id === a.goalRole),
    navigate = useNavigate();
  const [audit, setAudit] = useState<MatchResult | null>(null);
  const goalCompany = data.companies.find((c) => c.id === a.goalCompany);
  return (
    <>
      <PageTitle
        eyebrow="YOUR OPPORTUNITY WORKSPACE"
        title={"Good to see you, " + a.name.split(" ")[0] + "."}
        description="Your skills are the starting point. Your next step is yours to choose."
      >
        <Link className="btn secondary" to="/profile">
          Update profile <ArrowRight size={15} />
        </Link>
      </PageTitle>
      {!a.onboarded && (
        <div className="notice" style={{ marginBottom: 22 }}>
          <ShieldCheck size={18} />
          <span>
            Start with your seeded profile, or personalise it in{" "}
            <Link className="text-btn" to="/profile">
              My profile
            </Link>
            . Choose a goal to open your skill picker.
          </span>
        </div>
      )}
      <div className="stats-grid">
        <Stat
          label="Eligible opportunities"
          value={eligible.length}
          icon={<BriefcaseBusiness />}
          detail={"Of " + data.opportunities.length + " listings"}
        />
        <Stat
          label="Overall tier"
          value={overall.tier || "Not yet eligible"}
          icon={<Layers3 />}
          detail={
            overall.count
              ? overall.scorePct.toFixed(1) +
                "% · best " +
                overall.count +
                " matches"
              : "Build your beginner path"
          }
        />
        <Stat
          label="Profile skills"
          value={a.skills.length}
          icon={<ShieldCheck />}
          detail={
            a.skills.filter((s) => s.evidence !== "self").length +
            " with supporting evidence"
          }
        />
        <Stat
          label="Saved opportunities"
          value={a.interestedJobIds.length}
          icon={<Bookmark />}
        />
      </div>
      <div className="goal-banner">
        <div>
          <p className="eyebrow">YOUR NEXT CHAPTER</p>
          <h2>{goal?.title || "Choose where you want to go."}</h2>
          <p>
            {goalCompany?.name || "Set a goal company and role."}
            {goal
              ? " · " + skillGap(a, goal).length + " skills to develop"
              : ""}
          </p>
        </div>
        <Link className="btn" to="/goal">
          <Target size={16} />
          Explore my path
        </Link>
      </div>
      <section className="panel" style={{ marginTop: 24 }}>
        <h2>My applications</h2>
        {!a.applications?.length && (
          <p>
            You haven't applied yet. Choose an eligible opportunity and press
            Apply.
          </p>
        )}
        {(a.applications || []).map((application) => {
          const job = data.opportunities.find(
            (j) => j.id === application.jobId,
          );
          const match = results.find(
            (r) => r.opportunityId === application.jobId,
          );
          return (
            <div className="gap-item" key={application.jobId}>
              <div>
                <Link to={"/opportunity/" + application.jobId}>
                  {job?.title || "Listing no longer available"}
                </Link>
                <p>
                  Submitted{" "}
                  {new Date(application.submittedAt).toLocaleDateString()} ·{" "}
                  {data.companies.find((c) => c.id === job?.companyId)?.name}
                </p>
                {match && !match.eligible && (
                  <p>
                    Current requirements no longer met. Your application remains
                    saved.
                  </p>
                )}
              </div>
              <div>
                <strong>Submitted</strong>
                {match && <TierChip tier={match.tier} />}
              </div>
            </div>
          );
        })}
      </section>
      <div className="section-heading matches-heading">
        <div>
          <h2>Your strongest matches</h2>
          <p>
            Eligibility first. Default rank combines skill score and preference
            fit.
          </p>
        </div>
        <Link className="text-btn" to="/jobs">
          See all opportunities <ArrowRight size={14} />
        </Link>
      </div>
      {eligible.length ? (
        <div className="job-grid">
          {eligible.slice(0, 4).map((r) => {
            const job = data.opportunities.find(
              (j) => j.id === r.opportunityId,
            )!;
            return (
              <JobCard
                key={job.id}
                job={job}
                result={r}
                onOpen={() => navigate("/opportunity/" + job.id)}
                onAudit={() => setAudit(r)}
                onPath={() => navigate("/goal?job=" + job.id)}
              />
            );
          })}
        </div>
      ) : (
        <div className="matches-empty">
          <Empty
            title="Not yet eligible for any listed opportunity"
            text="Every failed condition is explained. Start with a beginner learning path and review the required qualifications and locations."
          >
            <Link className="btn primary" to="/goal">
              Explore beginner path
            </Link>
          </Empty>
        </div>
      )}
      {audit && (
        <Modal title="Explain this match" wide onClose={() => setAudit(null)}>
          <Audit
            result={audit}
            job={data.opportunities.find((j) => j.id === audit.opportunityId)!}
          />
        </Modal>
      )}
    </>
  );
}
export function Jobs({ saved = false }: { saved?: boolean }) {
  const { data, session } = useStore(),
    a = data.applicants.find((a) => a.id === session!.id)!,
    results = evaluateApplicant(a, data.opportunities),
    navigate = useNavigate();
  const [tab, setTab] = useState("eligible"),
    [search, setSearch] = useState(""),
    [tier, setTier] = useState("All"),
    [location, setLocation] = useState("All"),
    [sort, setSort] = useState("default"),
    [minPay, setMinPay] = useState(""),
    [maxCommute, setMaxCommute] = useState(""),
    [audit, setAudit] = useState<MatchResult | null>(null);
  const source = results.filter(
    (r) => !saved || a.interestedJobIds.includes(r.opportunityId),
  );
  const filtered = source
    .filter((r) => {
      const j = data.opportunities.find((j) => j.id === r.opportunityId)!,
        c = data.companies.find((c) => c.id === j.companyId)!;
      return (
        r.eligible === (tab === "eligible") &&
        (tier === "All" || r.tier === tier) &&
        (location === "All" || j.location === location) &&
        (!minPay || (j.salary !== null && j.salary >= Number(minPay))) &&
        (!maxCommute ||
          (j.commuteMinutes !== null &&
            j.commuteMinutes <= Number(maxCommute))) &&
        [j.title, c.name, ...j.scoredSkills.map((s) => s.name)]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase())
      );
    })
    .sort((x, y) =>
      sort === "points"
        ? (y.score || 0) - (x.score || 0)
        : sort === "preference"
          ? (y.prefFit || 0) - (x.prefFit || 0)
          : 0,
    );
  return (
    <>
      <PageTitle
        eyebrow={saved ? "YOUR SHORTLIST" : "OPPORTUNITY EXPLORER"}
        title={
          saved
            ? "Keep your next steps close."
            : "Jobs that fit. Reasons that make sense."
        }
        description="Understand what you qualify for, how you rank, and what you can build next."
      />
      <div className="segmented">
        <button
          className={tab === "eligible" ? "active" : ""}
          onClick={() => {
            setTab("eligible");
            setTier("All");
          }}
        >
          Eligible matches ({source.filter((r) => r.eligible).length})
        </button>
        <button
          className={tab === "rejected" ? "active" : ""}
          onClick={() => {
            setTab("rejected");
            setTier("All");
          }}
        >
          Not eligible ({source.filter((r) => !r.eligible).length})
        </button>
      </div>
      <div className="notice">
        <ShieldCheck size={17} />
        <span>
          Preferences affect ranking only. Browsing filters can hide results but
          never change eligibility. Displayed rank is the engine’s default rank.
        </span>
      </div>
      <div className="filter-row">
        <input
          aria-label="Search opportunities"
          placeholder="Search role, company, or skill"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          aria-label="Location filter"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        >
          <option value="All">All locations</option>
          {[...new Set(data.opportunities.map((j) => j.location))].map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
        {tab === "eligible" && (
          <select
            aria-label="Tier filter"
            value={tier}
            onChange={(e) => setTier(e.target.value)}
          >
            {["All", "Tier 1", "Tier 2", "Tier 3"].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        )}
        <select
          aria-label="Sort results"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="default">Default rank</option>
          <option value="points">Skill points</option>
          <option value="preference">Preference fit</option>
        </select>
        <label>
          Minimum pay
          <input
            type="number"
            min="0"
            placeholder="Any"
            value={minPay}
            onChange={(e) => setMinPay(e.target.value)}
            style={{ width: 100 }}
          />
        </label>
        <label>
          Max commute
          <input
            type="number"
            min="0"
            placeholder="Any"
            value={maxCommute}
            onChange={(e) => setMaxCommute(e.target.value)}
            style={{ width: 100 }}
          />
        </label>
      </div>
      <p className="result-count">
        Showing {filtered.length}{" "}
        {tab === "eligible" ? "eligible" : "not-eligible"} opportunities.
      </p>
      {filtered.length ? (
        <div className="job-grid">
          {filtered.map((r) => {
            const j = data.opportunities.find((j) => j.id === r.opportunityId)!;
            return (
              <JobCard
                key={j.id}
                job={j}
                result={r}
                onOpen={() => navigate("/opportunity/" + j.id)}
                onAudit={() => setAudit(r)}
                onPath={() => navigate("/goal?job=" + j.id)}
              />
            );
          })}
        </div>
      ) : (
        <Empty
          title={
            saved
              ? "Your shortlist is waiting."
              : "No results for these filters."
          }
          text={
            saved
              ? "Bookmark an opportunity from Jobs for you to track its skill gaps here."
              : "Try another filter, or review the other eligibility tab."
          }
        />
      )}{" "}
      {audit && (
        <Modal title="Explain / audit" wide onClose={() => setAudit(null)}>
          <Audit
            result={audit}
            job={data.opportunities.find((j) => j.id === audit.opportunityId)!}
          />
        </Modal>
      )}
    </>
  );
}
