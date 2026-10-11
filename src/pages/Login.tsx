import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { useStore } from "../store/useStore";
import { Logo, Footer } from "../components/Layout";
import MandalaBackdrop from "../components/MandalaBackdrop";
import CirclePatternBackdrop from "../components/CirclePatternBackdrop";
export default function Login() {
  const { role: param } = useParams(),
    role = param === "company" ? "company" : "applicant";
  const { login, register } = useStore(),
    navigate = useNavigate();
  const fromWelcome = useLocation().state?.fromWelcome === true;
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (fromWelcome) {
      window.scrollTo(0, 0);
      heading.current?.focus({ preventScroll: true });
    }
  }, [fromWelcome]);
  const [creating, setCreating] = useState(false),
    [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [discoverable, setDiscoverable] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (creating) await register(role, name, email, password, discoverable);
      else await login(role, email, password);
      navigate(
        role === "company" ? "/company" : creating ? "/profile" : "/applicant",
      );
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={`login-page${fromWelcome ? " login-entering" : ""}`}>
      <header className="landing-header">
        <Logo />
        <Link to="/" className="text-btn">
          <ArrowLeft size={16} />
          Back to home
        </Link>
      </header>
      <main className="login-main">
        <CirclePatternBackdrop />
        <MandalaBackdrop />
        <div className="login-intro">
          <span className="hero-pill">
            <ShieldCheck size={15} />
            LOCAL PROTOTYPE
          </span>
          <h1 className="welcome-headline" ref={heading} tabIndex={-1}>
            {role === "company"
              ? "Build your team."
              : "Your next chapter starts with you."}
          </h1>
          <p>
            Create your own account, save your work, and explore explained
            skills matching.
          </p>
          <div className="notice">
            Accounts and changes are stored on this machine. Certificate checks
            and learning completion remain simulated. Sample opportunities are
            fictional.
          </div>
        </div>
        <div className="login-card">
          <h2>
            {role === "company" ? "Company" : "Applicant"}{" "}
            {creating ? "registration" : "sign in"}
          </h2>
          <form onSubmit={submit}>
            {creating && (
              <label>
                {role === "company" ? "Company name" : "Your name"}
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                  required
                />
              </label>
            )}
            <label>
              Email address
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={creating ? 10 : 1}
                maxLength={128}
                autoComplete={creating ? "new-password" : "current-password"}
                required
              />
            </label>
            {creating && (
              <p className="muted">
                Use at least 10 characters. This prototype has no password
                recovery yet.
              </p>
            )}
            {creating && role === "applicant" && (
              <label>
                <input
                  type="checkbox"
                  checked={discoverable}
                  onChange={(e) => setDiscoverable(e.target.checked)}
                />
                Share my matching profile with registered companies. Contact
                details and private progress stay hidden.
              </label>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="btn primary full" disabled={busy}>
              {busy ? "Please wait?" : creating ? "Create account" : "Sign in"}
              <ArrowRight size={17} />
            </button>
          </form>
          <button
            className="text-btn"
            disabled={busy}
            onClick={() => {
              setCreating(!creating);
              setError("");
            }}
          >
            {creating
              ? "Already have an account? Sign in"
              : "New here? Create an account"}
          </button>
          <p className="login-switch">
            <Link
              to={role === "company" ? "/login/applicant" : "/login/company"}
            >
              {role === "company" ? "Applicant" : "Company"} portal
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
