import { Link } from "react-router-dom";
import {
  ArrowRight,
  ShieldCheck,
  SlidersHorizontal,
  Route,
  Building2,
  UserRound,
  Check,
  Link2,
} from "lucide-react";
import { useStore } from "../store/useStore";
import { Logo, Footer } from "../components/Layout";
import MandalaBackdrop from "../components/MandalaBackdrop";
import WelcomeHeadline from "../components/WelcomeHeadline";
export default function Landing() {
  const { data } = useStore();
  return (
    <div className="landing">
      <header className="landing-header">
        <Logo />
        <nav>
          <a href="#how">How it works</a>
          <a href="#principles">Our principles</a>
          <Link to="/login/company">For companies</Link>
        </nav>
        <Link className="btn primary" to="/login/applicant">
          Get started <ArrowRight size={16} />
        </Link>
      </header>
      <main>
        <section className="landing-hero">
          <MandalaBackdrop />
          <div className="hero-copy">
            <span className="hero-pill">
              <span /> A CLEARER PATH TO OPPORTUNITY
            </span>
            <WelcomeHeadline />
            <p>
              Find jobs that fit your skills — fairly and transparently.
              Understand every match, build what’s missing, and move forward
              with confidence.
            </p>
            <div className="hero-buttons">
              <Link className="btn primary" to="/login/applicant">
                <UserRound size={18} />
                I’m an Applicant <ArrowRight size={17} />
              </Link>
              <Link className="btn secondary" to="/login/company">
                <Building2 size={18} />
                I’m a Company
              </Link>
            </div>
            <div className="hero-assurance">
              <ShieldCheck size={17} />
              <span>
                No hidden scoring. No external services. A local, fictional
                prototype.
              </span>
            </div>
          </div>
          <div className="hero-visual">
            <div className="floating-label">
              <Link2 size={16} />A match you can understand
            </div>
            <div className="hero-match-card">
              <div className="hero-card-head">
                <div className="company-logo">
                  CB
                </div>
                <div>
                  <small>{data.companies[0].name}</small>
                  <h3>{data.opportunities[0].title}</h3>
                </div>
                <ShieldCheck className="text-teal" />
              </div>
              <div className="hero-gate">
                <Check size={15} />
                <span>Eligibility checked before ranking</span>
              </div>
              <div className="hero-skill-list">
                {data.opportunities[0].scoredSkills.map((s) => (
                  <div key={s.name}>
                    <span>{s.name}</span>
                    <div className="mini-track">
                      <span
                        style={{
                          width:
                            (s.points /
                              data.opportunities[0].scoredSkills.reduce(
                                (n, s) => n + s.points,
                                0,
                              )) *
                              100 +
                            "%",
                        }}
                      />
                    </div>
                    <strong>{s.points} pts</strong>
                  </div>
                ))}
              </div>
              <div className="hero-card-footer">
                Transparent points. Practical next steps.
                <ArrowRight size={18} />
              </div>
            </div>
            <div className="floating-path">
              <Route size={26} />
              <div>
                <strong>Your next step, not a dead end.</strong>
                <p>Local learning paths for skill gaps.</p>
              </div>
            </div>
          </div>
        </section>
        <section className="landing-stat-strip">
          <div>
            <strong>{data.companies.length}</strong>
            <span>Fictional partner companies</span>
          </div>
          <div>
            <strong>{data.opportunities.length}</strong>
            <span>Opportunities to explore</span>
          </div>
          <div>
            <strong>{data.courses.length}</strong>
            <span>Local learning resources</span>
          </div>
          <div>
            <strong>Offline</strong>
            <span>Your prototype stays on your machine</span>
          </div>
        </section>
        <section id="how" className="landing-section">
          <p className="eyebrow">A SIMPLE WAY FORWARD</p>
          <h2>
            From what you know
            <br />
            to where you want to go.
          </h2>
          <div className="how-grid">
            {[
              {
                icon: UserRound,
                title: "Tell your story",
                text: "Build a profile with your qualifications, skills, evidence, and preferences.",
              },
              {
                icon: SlidersHorizontal,
                title: "Understand your matches",
                text: "See exact eligibility checks and the points behind every eligible opportunity.",
              },
              {
                icon: Route,
                title: "Build your next step",
                text: "Follow local learning paths and watch your opportunities change as you progress.",
              },
            ].map((x, i) => (
              <div className="how-card" key={x.title}>
                <span className="how-number">0{i + 1}</span>
                <x.icon size={25} />
                <h3>{x.title}</h3>
                <p>{x.text}</p>
              </div>
            ))}
          </div>
        </section>
        <section id="principles" className="principles-banner">
          <ShieldCheck size={44} />
          <div>
            <p className="eyebrow">TRANSPARENCY IS THE FOUNDATION</p>
            <h2>
              Eligibility is a rule.
              <br />
              Ranking is a score. We explain both.
            </h2>
            <p>
              Preferences never override compulsory requirements. Results
              support your decisions.
            </p>
          </div>
          <Link className="btn secondary" to="/login/applicant">
            Open your workspace <ArrowRight size={17} />
          </Link>
        </section>
      </main>
      <Footer />
    </div>
  );
}
