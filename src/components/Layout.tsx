import { useEffect } from "react";
import { Link, NavLink, Outlet, useNavigate, Navigate } from "react-router-dom";
import {
  Link2,
  LayoutDashboard,
  BriefcaseBusiness,
  UserRound,
  Target,
  Layers3,
  TrendingUp,
  LogOut,
  Sun,
  Moon,
  ShieldCheck,
  Database,
  WifiOff,
  X,
  Bookmark,
  ArrowRightLeft,
  type LucideIcon,
} from "lucide-react";
import { useStore } from "../store/useStore";
export const disclaimer =
  "Results are decision support. Criteria used are those stated by each opportunity.";
export function Logo() {
  return (
    <Link to="/" className="brand">
      <span className="brand-icon">
        <Link2 size={25} />
      </span>
      <span>
        Rozgar<span>Link</span>
        <small>SKILLS MEET OPPORTUNITY</small>
      </span>
    </Link>
  );
}
export function Footer() {
  return (
    <footer>
      <ShieldCheck size={14} />
      <span>{disclaimer}</span>
      <small>Local prototype ? sample data</small>
    </footer>
  );
}
export function Layout() {
  const {
      data,
      session,
      ready,
      theme,
      setTheme,
      mode,
      message,
      notify,
      changes,
      clearChanges,
      logout,
      refresh,
    } = useStore(),
    navigate = useNavigate();
  useEffect(() => {
    const timer = setInterval(() => refresh(), 3000);
    return () => clearInterval(timer);
  }, [refresh]);
  if (!ready)
    return (
      <div className="initial-loading">
        Loading your local opportunity workspace…
      </div>
    );
  if (!session) return <Navigate to="/login/applicant" replace />;
  const company = session.role === "company",
    person = company
      ? data.companies.find((c) => c.id === session.id)
      : data.applicants.find((a) => a.id === session.id);
  const links: [string, string, LucideIcon][] = company
    ? [
        ["/company", "Overview", LayoutDashboard],
        ["/company/new", "Post opportunity", BriefcaseBusiness],
      ]
    : [
        ["/applicant", "Overview", LayoutDashboard],
        ["/jobs", "Jobs for you", BriefcaseBusiness],
        ["/profile", "My profile", UserRound],
        ["/goal", "My learning path", Target],
        ["/saved", "Saved opportunities", Bookmark],
        ["/tier", "My tier", Layers3],
        ["/progress", "Progress & check-in", TrendingUp],
      ];
  return (
    <div className={"app-shell " + theme}>
      <aside className="sidebar">
        <Logo />
        <div className="portal-label">
          {company ? "COMPANY WORKSPACE" : "APPLICANT WORKSPACE"}
        </div>
        <nav aria-label="Portal navigation">
          {links.map(([to, label, Icon]) => (
            <NavLink
              key={to}
              title={label}
              aria-label={label}
              to={to}
              end={to === "/company" || to === "/applicant"}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              <Icon size={19} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="transparency-note">
            <ShieldCheck size={22} />
            <strong>Fair by design.</strong>
            <p>Explicit rules. Explained scores. Your next step, made clear.</p>
          </div>
          <button
            className="sidebar-switch"
            onClick={async () => {
              try {
                await logout();
                navigate(company ? "/login/applicant" : "/login/company");
              } catch (e) {
                notify((e as Error).message);
              }
            }}
          >
            <ArrowRightLeft size={16} />
            Switch portal
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="workspace-header">
          <div className="breadcrumb">
            Workspace <span>/</span> {company ? "Company" : "Applicant"}
          </div>
          <div className="header-actions">
            <span
              className={
                "storage-status " + (mode === "local" ? "warning" : "")
              }
            >
              {mode === "sqlite" ? (
                <Database size={13} />
              ) : (
                <WifiOff size={13} />
              )}{" "}
              {mode === "sqlite" ? "Local SQLite" : "Browser fallback"}
            </span>
            <button
              className="icon-btn"
              onClick={setTheme}
              aria-label={
                "Switch to " + (theme === "light" ? "dark" : "light") + " mode"
              }
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <div className="user-avatar">{person?.name[0]}</div>
            <span className="header-name">{person?.name}</span>
            <button
              className="icon-btn"
              aria-label="Sign out"
              onClick={() =>
                logout()
                  .then(() => navigate("/"))
                  .catch((e) => notify(e.message))
              }
            >
              <LogOut size={17} />
            </button>
          </div>
        </header>
        <main className="workspace-main">
          {changes.length > 0 && (
            <section className="diff-panel" aria-label="What changed">
              <div>
                <strong>What changed</strong>
                <button
                  className="icon-btn"
                  aria-label="Dismiss changes"
                  onClick={clearChanges}
                >
                  <X size={16} />
                </button>
              </div>
              {changes.map((c, i) => (
                <p key={i}>{c}</p>
              ))}
            </section>
          )}
          <Outlet />
        </main>
        <Footer />
      </div>
      {message && (
        <div className="toast" role="status">
          {message}
          <button aria-label="Dismiss notification" onClick={() => notify("")}>
            <X size={17} />
          </button>
        </div>
      )}
    </div>
  );
}
