import { useState } from "react";
import { useStore } from "../store/useStore";
import { scoreApplicant } from "../engine/matching";

export default function ApplyButton({ jobId }: { jobId: string }) {
  const { data, session, act, busy } = useStore();
  const [error, setError] = useState("");
  const applicant = data.applicants.find((a) => a.id === session?.id);
  const job = data.opportunities.find((j) => j.id === jobId);
  if (session?.role !== "applicant" || !applicant || !job) return null;
  const applied = applicant.applications?.some(
    (application) => application.jobId === jobId,
  );
  const eligible = scoreApplicant(applicant, job).eligible;
  return (
    <div style={{ marginTop: 16 }}>
      <button
        className="btn primary"
        disabled={busy || applied || !eligible}
        onClick={async () => {
          setError("");
          try {
            await act({ type: "apply", jobId });
          } catch (error) {
            setError((error as Error).message);
          }
        }}
      >
        {applied ? "Application submitted" : "Apply for this job"}
      </button>
      <p className="small-note" role={applied ? "status" : undefined}>
        {applied
          ? "Saved. You can track this application in your overview."
          : eligible
            ? "Applying shares your matching profile with this company. Contact details stay private."
            : "Meet all compulsory requirements to apply. See the eligibility explanation."}
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
