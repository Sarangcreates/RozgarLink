import { useState } from "react";
import { Star } from "lucide-react";
import { useStore } from "../store/useStore";
export default function Reviews({ jobId }: { jobId: string }) {
  const { data, act, busy } = useStore();
  const reviews = data.reviews.filter((r) => r.jobId === jobId),
    average = reviews.length
      ? reviews.reduce((n, r) => n + r.rating, 0) / reviews.length
      : 0;
  const [open, setOpen] = useState(false),
    [error, setError] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      values = Object.fromEntries(new FormData(form));
    setError("");
    try {
      await act({
        type: "review",
        review: {
          id: "",
          jobId,
          rating: Number(values.rating),
          title: String(values.title),
          text: String(values.text),
          pros: String(values.pros),
          cons: String(values.cons),
          role: String(values.role),
          duration: String(values.duration),
          date: "",
          author: "",
        },
      });
      form.reset();
      setOpen(false);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <section className="panel">
      <div className="section-heading" style={{ marginTop: 0 }}>
        <div>
          <h2>Reviews & experiences</h2>
          <p>Fictional demo reviews · {reviews.length} reviews</p>
        </div>
        <button className="btn secondary" onClick={() => setOpen(!open)}>
          Add review
        </button>
      </div>
      <div className="rating-summary">
        <div>
          <strong>{reviews.length ? average.toFixed(1) : "—"}</strong>
          <div className="stars">★★★★★</div>
          <p className="small-note">Average rating</p>
        </div>
        <div>
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = reviews.filter((r) => r.rating === stars).length;
            return (
              <div className="rating-bar" key={stars}>
                <span>{stars} ★</span>
                <div className="mini-track">
                  <span
                    style={{
                      width:
                        (reviews.length ? (count / reviews.length) * 100 : 0) +
                        "%",
                    }}
                  />
                </div>
                <span>{count}</span>
              </div>
            );
          })}
        </div>
      </div>
      {open && (
        <form className="review-form" onSubmit={submit}>
          <div className="form-grid">
            <label>
              Rating
              <select name="rating" required>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option value={n} key={n}>
                    {n} stars
                  </option>
                ))}
              </select>
            </label>
            <label>
              Review title
              <input name="title" required maxLength={120} />
            </label>
            <label>
              Role
              <input
                name="role"
                defaultValue="Demo participant"
                required
                maxLength={80}
              />
            </label>
            <label>
              Duration
              <input
                name="duration"
                defaultValue="Demo experience"
                required
                maxLength={80}
              />
            </label>
            <label>
              Pros
              <input name="pros" required maxLength={500} />
            </label>
            <label>
              Cons
              <input name="cons" required maxLength={500} />
            </label>
          </div>
          <label>
            Your experience
            <textarea name="text" required maxLength={1500} />
          </label>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <button className="btn primary" disabled={busy}>
            Publish fictional review <Star size={15} />
          </button>
        </form>
      )}
      <div className="review-list">
        {reviews.map((r) => (
          <article className="review-card" key={r.id}>
            <div className="review-meta">
              <span className="stars">
                {"★".repeat(r.rating)}
                {"☆".repeat(5 - r.rating)}
              </span>
              <span>{r.date}</span>
            </div>
            <h3>{r.title}</h3>
            <p>{r.text}</p>
            <p>
              <strong>Pros:</strong> {r.pros}
            </p>
            <p>
              <strong>Cons:</strong> {r.cons}
            </p>
            <p>
              {r.author} · {r.role} · {r.duration}
            </p>
          </article>
        ))}
      </div>
      {!reviews.length && (
        <p className="small-note">
          No reviews yet. Add the first fictional experience.
        </p>
      )}
    </section>
  );
}
