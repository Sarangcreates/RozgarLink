import { useEffect, useRef, type ReactNode } from "react";
import {
  X,
  ShieldCheck,
  AlertCircle,
  ArrowUpRight,
  Bookmark,
  ChevronDown,
  CheckCircle2,
} from "lucide-react";
import type { MatchResult, Opportunity, Tier } from "../engine/types";
import { explain } from "../engine/matching";
import { useStore } from "../store/useStore";
export const money = (n: number | null) =>
  n === null ? "Not specified" : "₹" + n.toLocaleString("en-IN");
export const pct = (n: number | null) =>
  n === null ? "—" : n.toFixed(1) + "%";
export function TierChip({ tier }: { tier: Tier | null }) {
  return (
    <span
      className={"chip " + (tier ? `tier-${tier.slice(-1)}` : "ineligible")}
    >
      {tier || "Not Eligible"}
    </span>
  );
}
export function PageTitle({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {description && <p className="muted">{description}</p>}
      </div>
      {children}
    </div>
  );
}
export function Stat({
  label,
  value,
  icon,
  detail,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  detail?: string;
}) {
  return (
    <div className="stat">
      <div className="stat-top">
        <span>{label}</span>
        {icon}
      </div>
      <strong
        className={
          typeof value === "string" && value.length > 12
            ? "stat-value-text"
            : undefined
        }
      >
        {value}
      </strong>
      {detail && <small>{detail}</small>}
    </div>
  );
}
export function Empty({
  title,
  text,
  children,
}: {
  title: string;
  text: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <AlertCircle size={32} />
      <h2>{title}</h2>
      <p>{text}</p>
      {children}
    </div>
  );
}
export function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current!;
    d.showModal();
    return () => d.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={"modal " + (wide ? "wide" : "")}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-heading">
        <h2>{title}</h2>
        <button
          className="icon-btn"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Audit({
  result,
  job,
}: {
  result: MatchResult;
  job: Opportunity;
}) {
  return (
    <div className="audit">
      <div className="notice">
        <ShieldCheck size={18} />
        <span>
          Deterministic eligibility first. Only eligible results receive points
          and tiers.
        </span>
      </div>
      <h3>Eligibility rules</h3>
      {[...result.passed, ...result.failed].map((r, i) => (
        <div key={i} className={"rule " + (r.passed ? "passed" : "failed")}>
          {r.passed ? <CheckCircle2 size={17} /> : <AlertCircle size={17} />}
          <div>
            <strong>{r.label}</strong>
            <p>{r.reason}</p>
          </div>
        </div>
      ))}
      {result.eligible && (
        <>
          <h3>Skill points breakdown</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Company skill</th>
                  <th>Your match</th>
                  <th>Strength</th>
                  <th>Level factor</th>
                  <th>Points</th>
                </tr>
              </thead>
              <tbody>
                {result.breakdown.map((s) => (
                  <tr key={s.name}>
                    <td>
                      {s.name} <small>max {s.companyPoints}</small>
                    </td>
                    <td>{s.matchedAlias || "No match"}</td>
                    <td>{pct(s.matchStrength * 100)}</td>
                    <td>{s.level ? `${s.level}/5 × ${s.levelFactor}` : "0"}</td>
                    <td>{s.points.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3>Preference fit</h3>
          {result.preferenceBreakdown.map((p) => (
            <p key={p.name} className="preference-line">
              <strong>
                {p.name}: {p.points}/{p.max}
              </strong>{" "}
              {p.reason}
            </p>
          ))}
          <div className="explanations">
            {explain(result, job).map((s) => (
              <p key={s}>{s}</p>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
export function JobCard({
  job,
  result,
  onOpen,
  onAudit,
  onPath,
}: {
  job: Opportunity;
  result: MatchResult;
  onOpen: () => void;
  onAudit: () => void;
  onPath?: () => void;
}) {
  const { data, session, act, notify, busy } = useStore(),
    company = data.companies.find((c) => c.id === job.companyId)!;
  const applicant = data.applicants.find((a) => a.id === session?.id),
    saved = applicant?.interestedJobIds.includes(job.id);
  return (
    <article className={"job-card " + (!result.eligible ? "rejected" : "")}>
      <div className="job-card-top">
        <div
          className="company-logo"
          style={{ background: company.color + "16", color: company.color }}
        >
          {company.initials}
        </div>
        <div>
          <p className="company-name">{company.name}</p>
          <button className="job-title" onClick={onOpen}>
            {job.title}
            <ArrowUpRight size={15} />
          </button>
        </div>
        <button
          disabled={busy}
          className={"icon-btn bookmark " + (saved ? "saved" : "")}
          aria-label={saved ? "Remove bookmark" : "Bookmark opportunity"}
          onClick={() =>
            act({ type: "bookmark", jobId: job.id }).catch((e) =>
              notify(e.message),
            )
          }
        >
          <Bookmark size={19} fill={saved ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="job-meta">
        <span>{job.location}</span>
        <span>{job.jobType}</span>
        <span>{money(job.salary)} / month</span>
      </div>
      <p className="job-description">{job.description}</p>
      <div className="tag-row">
        {job.eligibility.compulsorySkills.map((s) => (
          <span className="skill-tag" key={s.name}>
            {s.name} <span className="tag-lock">required</span>
          </span>
        ))}
      </div>
      {result.eligible ? (
        <div className="job-score">
          <div>
            <small>Skill points</small>
            <strong>
              {result.score!.toFixed(1)}
              <span> / {result.totalPoints}</span>
            </strong>
          </div>
          <TierChip tier={result.tier} />
          <div className="rank-label">
            Rank #{result.rank}
            <small>Fit {result.rankScore!.toFixed(1)}</small>
          </div>
        </div>
      ) : (
        <div className="rejection-reasons">
          <TierChip tier={null} />
          {result.failed.map((f) => (
            <p key={f.label}>{f.reason}</p>
          ))}
        </div>
      )}
      <div className="job-card-bottom">
        <button className="text-btn" onClick={onAudit}>
          {result.eligible ? "Why this rank?" : "Explain eligibility"}
          <ChevronDown size={14} />
        </button>
        <button className="text-btn" onClick={onPath || onOpen}>
          {result.eligible ? "View opportunity" : "Build my path"}
          <ArrowUpRight size={14} />
        </button>
      </div>
    </article>
  );
}
