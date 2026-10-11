import { useEffect, lazy, Suspense, type ReactNode } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useParams,
} from "react-router-dom";
import { useStore } from "./store/useStore";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import { Layout } from "./components/Layout";
import { CompanyDashboard, OpportunityEditor } from "./pages/Company";
import OpportunityPage from "./pages/Opportunity";
import Profile from "./pages/Profile";
import { ApplicantDashboard, Jobs } from "./pages/Applicant";
import Goal from "./pages/Goal";
import TierPage from "./pages/Tier";
const Progress = lazy(() => import("./pages/Progress"));
function Role({
  role,
  children,
}: {
  role: "company" | "applicant";
  children: ReactNode;
}) {
  const session = useStore((s) => s.session);
  return session?.role === role ? (
    <>{children}</>
  ) : (
    <Navigate
      to={session?.role === "company" ? "/company" : "/applicant"}
      replace
    />
  );
}
function LoginRoute() {
  const { role } = useParams();
  return <Login key={role} />;
}
function EditorRoute() {
  const { id } = useParams();
  return <OpportunityEditor key={id || "new"} />;
}
export default function App() {
  const connect = useStore((s) => s.connect);
  useEffect(() => {
    connect();
  }, [connect]);
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login/:role" element={<LoginRoute />} />
        <Route element={<Layout />}>
          <Route
            path="/company"
            element={
              <Role role="company">
                <CompanyDashboard />
              </Role>
            }
          />
          <Route
            path="/company/new"
            element={
              <Role role="company">
                <EditorRoute />
              </Role>
            }
          />
          <Route
            path="/company/edit/:id"
            element={
              <Role role="company">
                <EditorRoute />
              </Role>
            }
          />
          <Route
            path="/applicant"
            element={
              <Role role="applicant">
                <ApplicantDashboard />
              </Role>
            }
          />
          <Route
            path="/profile"
            element={
              <Role role="applicant">
                <Profile />
              </Role>
            }
          />
          <Route
            path="/jobs"
            element={
              <Role role="applicant">
                <Jobs />
              </Role>
            }
          />
          <Route
            path="/saved"
            element={
              <Role role="applicant">
                <Jobs saved />
              </Role>
            }
          />
          <Route
            path="/goal"
            element={
              <Role role="applicant">
                <Goal />
              </Role>
            }
          />
          <Route
            path="/tier"
            element={
              <Role role="applicant">
                <TierPage />
              </Role>
            }
          />
          <Route
            path="/progress"
            element={
              <Role role="applicant">
                <Suspense
                  fallback={<div className="panel">Loading progress…</div>}
                >
                  <Progress />
                </Suspense>
              </Role>
            }
          />
          <Route path="/demo" element={<Navigate to="/" replace />} />
          <Route path="/opportunity/:id" element={<OpportunityPage />} />
          <Route
            path="*"
            element={
              <div className="panel">
                <h1>Page not found</h1>
                <p>Choose a feature from the workspace navigation.</p>
              </div>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
