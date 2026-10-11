import { useState } from "react";
import { Plus, Trash2, ShieldCheck, Target, Save, Award } from "lucide-react";
import { useStore } from "../store/useStore";
import {
  qualifications,
  type Applicant,
  type Certificate,
  type Skill,
} from "../engine/types";
import {
  canonicalSkill,
  compulsorySimilarity,
  normalizeSkill,
} from "../engine/skills";
import { scoreApplicant } from "../engine/matching";
import { Modal, PageTitle, TierChip } from "../components/ui";
export default function Profile() {
  const { data, session, act, busy } = useStore(),
    a = data.applicants.find((a) => a.id === session!.id)!;
  const [draft, setDraft] = useState<Applicant>(() => structuredClone(a)),
    [skillsOpen, setSkillsOpen] = useState(false),
    [freeSkill, setFreeSkill] = useState(""),
    [error, setError] = useState(""),
    [certOpen, setCertOpen] = useState(false),
    [certError, setCertError] = useState("");
  const goal = data.opportunities.find((j) => j.id === draft.goalRole),
    goalJobs = data.opportunities.filter(
      (j) => j.companyId === draft.goalCompany,
    );
  const required = goal
    ? [
        ...new Map(
          [...goal.eligibility.compulsorySkills, ...goal.scoredSkills].map(
            (s) => [normalizeSkill(s.name), s.name],
          ),
        ).values(),
      ]
    : [];
  const preview = goal ? scoreApplicant(draft, goal) : null;
  function field<K extends keyof Applicant>(key: K, value: Applicant[K]) {
    setDraft((p) => ({ ...p, [key]: value }));
  }
  async function save() {
    setError("");
    try {
      await act({ type: "profile", applicant: { ...draft, onboarded: true } });
      setDraft(
        structuredClone(
          useStore.getState().data.applicants.find((p) => p.id === a.id)!,
        ),
      );
      setSkillsOpen(false);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function toggleSkill(name: string) {
    const existing = draft.skills.find(
      (s) => compulsorySimilarity(s.name, name) === 1,
    );
    field(
      "skills",
      existing
        ? draft.skills.filter((s) => s !== existing)
        : [...draft.skills, { name, level: 3, evidence: "self" }],
    );
  }
  function level(name: string, value: number) {
    field(
      "skills",
      draft.skills.map((s) =>
        s.name === name
          ? {
              ...s,
              level: value as Skill["level"],
              evidence: "self",
              certificateId: undefined,
            }
          : s,
      ),
    );
  }
  async function certificate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCertError("");
    const f = Object.fromEntries(new FormData(e.currentTarget));
    try {
      await act({
        type: "certificate",
        certificate: {
          id: "",
          applicantId: a.id,
          title: String(f.title),
          type: f.type as Certificate["type"],
          issuer: String(f.issuer),
          certId: String(f.certId).toUpperCase(),
          issueDate: String(f.issueDate),
          status: "Unverified",
          reason: "",
          skillsClaimed: String(f.skills || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        },
      });
      setDraft(
        structuredClone(
          useStore.getState().data.applicants.find((p) => p.id === a.id)!,
        ),
      );
      setCertOpen(false);
    } catch (e) {
      setCertError((e as Error).message);
    }
  }
  const registry = data.registry.find((r) => r.applicantName === a.name);
  return (
    <div className="profile-page">
      <div className="panel">
        <label>
          <input
            type="checkbox"
            checked={draft.discoverable === true}
            onChange={(e) => field("discoverable", e.target.checked)}
          />
          Share my matching profile with registered companies
        </label>
        <p className="small-note">
          Contact details and private progress stay hidden. Save your profile to
          apply this choice.
        </p>
      </div>
      <PageTitle
        eyebrow="YOUR PROFILE"
        title="Tell your story."
        description="Your profile powers every eligibility check and recommendation."
      >
        <button className="btn primary" disabled={busy} onClick={save}>
          <Save size={15} />
          Save profile
        </button>
      </PageTitle>
      <div className="onboarding-steps">
        <span className="active">1 · About you</span>
        <span>2 · Your goal</span>
        <span>3 · Skills & evidence</span>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="two-columns">
        <div>
          <section className="panel">
            <h2>About you</h2>
            <div className="form-grid">
              <label>
                Full name
                <input
                  maxLength={80}
                  value={draft.name}
                  onChange={(e) => field("name", e.target.value)}
                />
              </label>
              <label>
                Status
                <select
                  value={draft.status}
                  onChange={(e) =>
                    field("status", e.target.value as Applicant["status"])
                  }
                >
                  {["student", "graduate", "working", "job-seeker"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={draft.email}
                  onChange={(e) => field("email", e.target.value)}
                />
              </label>
              <label>
                Phone number
                <input
                  inputMode="numeric"
                  maxLength={10}
                  value={draft.phone}
                  onChange={(e) => field("phone", e.target.value)}
                />
              </label>
              <label>
                Qualification
                <select
                  value={draft.degree}
                  onChange={(e) =>
                    field("degree", e.target.value as Applicant["degree"])
                  }
                >
                  {qualifications.map((q) => (
                    <option key={q}>{q}</option>
                  ))}
                </select>
              </label>
              <label>
                Applicant location
                <input
                  maxLength={80}
                  value={draft.location}
                  onChange={(e) => field("location", e.target.value)}
                />
              </label>
              <label>
                College / institute
                <input
                  value={draft.college}
                  onChange={(e) => field("college", e.target.value)}
                  maxLength={120}
                />
              </label>
              <label>
                Graduation year
                <input
                  type="number"
                  min="1950"
                  max="2100"
                  value={draft.year}
                  onChange={(e) => field("year", Number(e.target.value))}
                />
              </label>
              <label>
                Experience (years)
                <input
                  type="number"
                  min="0"
                  max="60"
                  step=".5"
                  value={draft.experienceYears}
                  onChange={(e) =>
                    field("experienceYears", Number(e.target.value))
                  }
                />
              </label>
              <label>
                Hobbies (comma-separated)
                <input
                  value={draft.hobbies.join(", ")}
                  onChange={(e) =>
                    field(
                      "hobbies",
                      e.target.value.split(",").map((s) => s.trim()),
                    )
                  }
                />
              </label>
            </div>
            <h3>Preferences — ranking only</h3>
            <div className="form-grid">
              <label>
                Maximum commute (minutes; blank = unknown)
                <input
                  type="number"
                  min="0"
                  value={draft.preferences.commute ?? ""}
                  onChange={(e) =>
                    field("preferences", {
                      ...draft.preferences,
                      commute:
                        e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
              </label>
              <label>
                Minimum monthly pay (₹; blank = unknown)
                <input
                  type="number"
                  min="0"
                  value={draft.preferences.minPay ?? ""}
                  onChange={(e) =>
                    field("preferences", {
                      ...draft.preferences,
                      minPay:
                        e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
              </label>
              <label>
                Preferred job type
                <select
                  value={draft.preferences.jobType || ""}
                  onChange={(e) =>
                    field("preferences", {
                      ...draft.preferences,
                      jobType: e.target.value || null,
                    })
                  }
                >
                  <option value="">No preference / unknown</option>
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
            <p className="small-note">
              Draft preview recomputes instantly. Save profile commits your
              changes and shows their impact across all opportunities.
            </p>
          </section>
          <section className="panel" style={{ marginTop: 20 }}>
            <h2>
              <Target size={18} style={{ display: "inline", marginRight: 8 }} />
              Your goal
            </h2>
            <div className="form-grid">
              <label>
                Goal company
                <select
                  value={draft.goalCompany}
                  onChange={(e) => {
                    const companyId = e.target.value,
                      first = data.opportunities.find(
                        (j) => j.companyId === companyId,
                      );
                    setDraft((p) => ({
                      ...p,
                      goalCompany: companyId,
                      goalRole: first?.id || "",
                    }));
                    setSkillsOpen(true);
                  }}
                >
                  {data.companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Goal role
                <select
                  value={draft.goalRole}
                  onChange={(e) => {
                    field("goalRole", e.target.value);
                    setSkillsOpen(true);
                  }}
                >
                  {goalJobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Target timeline (weeks)
                <input
                  type="number"
                  min="1"
                  max="104"
                  value={draft.targetWeeks}
                  onChange={(e) => field("targetWeeks", Number(e.target.value))}
                />
              </label>
            </div>
            <button
              className="btn secondary"
              onClick={() => setSkillsOpen(true)}
            >
              Choose goal skills <Plus size={15} />
            </button>
          </section>
        </div>
        <div>
          <section className="panel">
            <h2>Your skills</h2>
            <p className="muted">
              All evidence types count. Non-self evidence carries a trust badge.
              Editing a level manually makes that entry self-reported.
            </p>
            {draft.skills.map((s) => (
              <div className="skill-entry" key={s.name}>
                <strong>{s.name}</strong>
                <label style={{ margin: 0 }}>
                  Level
                  <select
                    aria-label={s.name + " level"}
                    value={s.level}
                    onChange={(e) => level(s.name, Number(e.target.value))}
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  </select>
                </label>
                {s.evidence !== "self" && (
                  <span className="trust-badge">
                    <ShieldCheck size={11} />
                    {s.evidence}
                  </span>
                )}
                <button
                  className="icon-btn"
                  aria-label={"Remove " + s.name}
                  onClick={() =>
                    field(
                      "skills",
                      draft.skills.filter((x) => x !== s),
                    )
                  }
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
            <div className="inline-fields" style={{ marginTop: 20 }}>
              <label>
                Add a skill
                <input
                  value={freeSkill}
                  maxLength={60}
                  placeholder="ReactJS, Excel…"
                  onChange={(e) => setFreeSkill(e.target.value)}
                />
                {freeSkill.trim() && (
                  <small>
                    Recognised as: {canonicalSkill(freeSkill)}. Confirm with
                    Add.
                  </small>
                )}
              </label>
              <button
                className="btn secondary"
                onClick={() => {
                  if (
                    freeSkill.trim() &&
                    !draft.skills.some(
                      (s) =>
                        normalizeSkill(s.name) === normalizeSkill(freeSkill),
                    )
                  ) {
                    field("skills", [
                      ...draft.skills,
                      { name: freeSkill.trim(), level: 3, evidence: "self" },
                    ]);
                    setFreeSkill("");
                  }
                }}
              >
                Add
              </button>
            </div>
            {preview && (
              <div className="notice">
                <ShieldCheck size={18} />
                <div>
                  <strong>Live draft preview: {goal?.title}</strong>
                  <p style={{ marginTop: 7 }}>
                    {preview.eligible
                      ? `${preview.score!.toFixed(1)} / ${preview.totalPoints} points`
                      : `${preview.failed.length} compulsory conditions not met`}
                  </p>
                  <div style={{ marginTop: 8 }}>
                    <TierChip tier={preview.tier} />
                  </div>
                </div>
              </div>
            )}
          </section>
          <section className="panel" style={{ marginTop: 20 }}>
            <div className="section-heading" style={{ marginTop: 0 }}>
              <h2>Certificates</h2>
              <button className="text-btn" onClick={() => setCertOpen(true)}>
                <Plus size={14} />
                Add
              </button>
            </div>
            <div className="notice">
              <Award size={18} />
              <span>
                Demo verification against a simulated registry; real systems
                would use an issuer API. Local SHA-256 checks are not real
                issuer verification.
              </span>
            </div>
            {a.certificates.map((c) => (
              <div className="certificate-card" key={c.id}>
                <div>
                  <strong>{c.title}</strong>
                  <span
                    className={
                      "chip " +
                      (c.status === "Verified"
                        ? "tier-1"
                        : c.status === "Invalid"
                          ? "ineligible"
                          : "tier-3")
                    }
                  >
                    {c.status}
                  </span>
                </div>
                <p>
                  {c.issuer} · {c.certId}
                </p>
                <p>{c.reason}</p>
                <p>
                  Supported skills:{" "}
                  {c.skillsClaimed.join(", ") || "none confirmed"}
                </p>
              </div>
            ))}
            {!a.certificates.length && (
              <p className="small-note">No certificates added yet.</p>
            )}
          </section>
        </div>
      </div>
      {skillsOpen && (
        <Modal
          title="Skills for your goal"
          onClose={() => setSkillsOpen(false)}
        >
          <p className="muted">
            {goal?.title || "Choose a goal role"} · tick skills you have and set
            your level.
          </p>
          {["Compulsory", "Points-based"].map((group) => (
            <section key={group} style={{ marginTop: 20 }}>
              <h3 style={{ fontSize: 12, fontWeight: 650 }}>{group}</h3>
              {required
                .filter((name) =>
                  group === "Compulsory"
                    ? goal?.eligibility.compulsorySkills.some(
                        (s) => normalizeSkill(s.name) === normalizeSkill(name),
                      )
                    : !goal?.eligibility.compulsorySkills.some(
                        (s) => normalizeSkill(s.name) === normalizeSkill(name),
                      ),
                )
                .map((name) => {
                  const s = draft.skills.find(
                    (s) => compulsorySimilarity(s.name, name) === 1,
                  );
                  return (
                    <div className="skill-entry" key={name}>
                      <label
                        className="checkbox-label"
                        style={{ margin: 0, flex: 1 }}
                      >
                        <input
                          type="checkbox"
                          checked={!!s}
                          onChange={() => toggleSkill(name)}
                        />
                        {name}
                      </label>
                      {s && (
                        <select
                          aria-label={name + " level"}
                          style={{ width: 90 }}
                          value={s.level}
                          onChange={(e) =>
                            level(s.name, Number(e.target.value))
                          }
                        >
                          {[1, 2, 3, 4, 5].map((n) => (
                            <option value={n} key={n}>
                              Level {n}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  );
                })}
            </section>
          ))}
          {preview && (
            <div className="notice" style={{ marginTop: 20 }}>
              <ShieldCheck size={18} />
              <span>
                {preview.eligible
                  ? `Eligible · ${preview.score!.toFixed(1)} / ${preview.totalPoints} points · ${preview.tier}`
                  : preview.failed.map((f) => f.reason).join(" ")}
              </span>
            </div>
          )}
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <div className="form-actions">
            <button className="btn primary" disabled={busy} onClick={save}>
              Save profile & skills
            </button>
          </div>
        </Modal>
      )}
      {certOpen && (
        <Modal
          title="Add certificate evidence"
          onClose={() => setCertOpen(false)}
        >
          <form onSubmit={certificate}>
            <div className="notice">
              <ShieldCheck size={18} />
              <span>
                Certificate verification uses a fictional local registry. File
                selection is a placeholder; no document is uploaded.
              </span>
            </div>
            {registry && (
              <p className="small-note">
                Try this local registry entry:{" "}
                <strong>{registry.certId}</strong> · {registry.title} ·{" "}
                {registry.issuer}
              </p>
            )}
            <div className="form-grid" style={{ marginTop: 20 }}>
              <label>
                Title
                <input
                  name="title"
                  maxLength={120}
                  required
                  defaultValue={registry?.title}
                />
              </label>
              <label>
                Type
                <select name="type">
                  <option value="course">Course</option>
                  <option value="project">Project</option>
                  <option value="degree">Degree</option>
                </select>
              </label>
              <label>
                Issuer
                <input
                  name="issuer"
                  maxLength={120}
                  required
                  defaultValue={registry?.issuer}
                />
              </label>
              <label>
                Certificate ID
                <input
                  name="certId"
                  maxLength={80}
                  required
                  placeholder="RL-2026-001"
                  defaultValue={registry?.certId}
                />
              </label>
              <label>
                Issue date
                <input
                  name="issueDate"
                  type="date"
                  required
                  defaultValue="2026-09-01"
                />
              </label>
              <label>
                Claimed skills (comma-separated)
                <input
                  name="skills"
                  defaultValue={registry?.skillsClaimed.join(", ")}
                />
              </label>
            </div>
            <label>
              File placeholder (not uploaded)
              <input type="file" accept=".pdf,.png,.jpg" />
            </label>
            {certError && (
              <p role="alert" className="form-error">
                {certError}
              </p>
            )}
            <button className="btn primary" disabled={busy}>
              Check simulated registry
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
