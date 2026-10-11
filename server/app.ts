import express from "express";
import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import type { Session, Action, DataSet, Applicant } from "../src/engine/types";
import { applyAction } from "../src/lib/actions";
import { evaluateApplicant } from "../src/engine/matching";
import { openDatabase } from "./database";
export function createApp(path: string) {
  const hostedOrigin = process.env.APP_ORIGIN
    ? new URL(process.env.APP_ORIGIN).origin
    : undefined;
  const repo = openDatabase(path),
    app = express();
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    res.set({
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "same-origin",
    });
    if (req.path.startsWith("/api")) res.set("Cache-Control", "no-store");
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      if (!req.is("application/json"))
        return res.status(415).json({ error: "Send application/json." });
      if (req.headers["sec-fetch-site"] === "cross-site")
        return res.status(403).json({ error: "Cross-site mutation rejected." });
      if (req.headers.origin) {
        try {
          if (
            new URL(req.headers.origin).origin !== hostedOrigin &&
            (!["localhost", "127.0.0.1"].includes(
              new URL(req.headers.origin).hostname,
            ) ||
              !["5173", "3001", ""].includes(new URL(req.headers.origin).port))
          )
            return res
              .status(403)
              .json({ error: "This website is not an allowed app origin." });
        } catch {
          return res.status(403).json({ error: "Invalid origin." });
        }
      }
    }
    next();
  });
  app.use(express.json({ limit: "128kb" }));
  const digest = (token: string) =>
    createHash("sha256").update(token).digest("hex");
  function session(req: express.Request): Session | null {
    const token = (req.headers.cookie || "")
      .split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("rozgar_session="))
      ?.slice(15);
    if (!token) return null;
    const row = repo.db
      .prepare(
        "SELECT role,entity_id FROM sessions WHERE token_hash=? AND expires_at>?",
      )
      .get(digest(token), Date.now());
    return row
      ? { role: row.role as Session["role"], id: String(row.entity_id) }
      : null;
  }
  const attempts = new Map<string, { count: number; until: number }>();
  let queue = Promise.resolve();
  app.get("/api/health", (_req, res) =>
    res.json({ ok: true, database: "SQLite" }),
  );
  function visible(data: DataSet, actor: Session | null): DataSet {
    const own = data.applicants.find((a) => a.id === actor?.id);
    return {
      ...data,
      applicants:
        actor?.role === "applicant"
          ? data.applicants.filter((a) => a.id === actor.id)
          : actor?.role === "company"
            ? data.applicants
                .filter((a) => a.discoverable === true)
                .map((a) => ({
                  ...a,
                  email: "",
                  phone: "",
                  certificates: a.certificates.map((c) => ({
                    ...c,
                    title: "",
                    issuer: "",
                    certId: "",
                    issueDate: "",
                    reason: "",
                  })),
                  checkIns: [],
                  progress: [],
                  interestedJobIds: [],
                  completedCourseIds: [],
                }))
            : [],
      registry: own
        ? data.registry.filter((r) => r.applicantName === own.name)
        : [],
    };
  }
  function establish(res: express.Response, role: Session["role"], id: string) {
    const token = randomBytes(32).toString("hex");
    repo.db
      .prepare("INSERT INTO sessions VALUES (?,?,?,?)")
      .run(digest(token), role, id, Date.now() + 86400000);
    res.cookie("rozgar_session", token, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.COOKIE_SECURE === "true",
      path: "/",
      maxAge: 86400000,
    });
    res.json({ session: { role, id } });
  }
  function rateLimit(req: express.Request, res: express.Response): boolean {
    const now = Date.now(),
      ip = req.ip || "local";
    for (const [key, value] of attempts)
      if (value.until < now) attempts.delete(key);
    const rate = attempts.get(ip) || { count: 0, until: now + 60000 };
    attempts.set(ip, rate);
    if (++rate.count > 20) {
      res.status(429).json({ error: "Too many attempts. Wait one minute." });
      return true;
    }
    return false;
  }
  app.get("/api/state", (req, res) =>
    res.json({ data: visible(repo.read(), session(req)) }),
  );
  app.post("/api/auth/register", (req, res) => {
    if (rateLimit(req, res)) return;
    queue = queue
      .then(() => {
        const { role, name, email, password, discoverable } = req.body || {};
        if (
          !["applicant", "company"].includes(role) ||
          typeof name !== "string" ||
          !name.trim() ||
          name.length > 80 ||
          typeof email !== "string" ||
          email.length > 254 ||
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
          typeof password !== "string" ||
          password.length < 10 ||
          password.length > 128
        )
          return res.status(400).json({
            error:
              "Enter a name, valid email, and a password of 10-128 characters.",
          });
        const normalized = email.trim().toLowerCase();
        if (
          repo.db
            .prepare("SELECT email FROM accounts WHERE email=?")
            .get(normalized)
        )
          return res
            .status(409)
            .json({ error: "This email already has an account." });
        const id = randomBytes(16).toString("hex"),
          salt = randomBytes(16).toString("hex");
        const hash =
          salt + ":" + scryptSync(password, salt, 64).toString("hex");
        const data = repo.read();
        if (role === "company")
          data.companies.push({
            id,
            name: name.trim(),
            email: normalized,
            sector: "",
            about: "",
            color: "#4f46e5",
            initials: name.trim().slice(0, 2).toUpperCase(),
          });
        else
          data.applicants.push({
            id,
            name: name.trim(),
            email: normalized,
            phone: "",
            status: "job-seeker",
            degree: "10th",
            college: "",
            year: new Date().getFullYear(),
            location: "",
            hobbies: [],
            preferences: { commute: null, minPay: null, jobType: null },
            goalCompany: "",
            goalRole: "",
            targetWeeks: 12,
            experienceYears: 0,
            skills: [],
            certificates: [],
            interestedJobIds: [],
            completedCourseIds: [],
            checkIns: [],
            progress: [],
            onboarded: false,
            discoverable: discoverable === true,
          } satisfies Applicant);
        data.revision++;
        // Keep identity and profile creation atomic, including nested repository save.
        repo.db.exec("SAVEPOINT register_account");
        try {
          repo.db
            .prepare("INSERT INTO accounts VALUES (?,?,?,?)")
            .run(normalized, role, id, hash);
          repo.save(data);
          repo.db.exec("RELEASE register_account");
        } catch (error) {
          repo.db.exec(
            "ROLLBACK TO register_account; RELEASE register_account",
          );
          throw error;
        }
        establish(res, role, id);
      })
      .then(() => {})
      .catch((error) => {
        console.error(error);
        if (!res.headersSent)
          res
            .status(500)
            .json({ error: "Account creation failed. Please retry." });
      });
  });
  app.get("/api/auth/me", (req, res) => res.json({ session: session(req) }));
  app.post("/api/auth/login", (req, res) => {
    if (rateLimit(req, res)) return;
    const { role, identifier, password } = req.body || {};
    if (
      !["applicant", "company"].includes(role) ||
      typeof identifier !== "string" ||
      typeof password !== "string" ||
      password.length > 128
    )
      return res.status(400).json({ error: "Enter your email and password." });
    const account = repo.db
      .prepare("SELECT * FROM accounts WHERE email=? AND role=?")
      .get(identifier.trim().toLowerCase(), role);
    const [salt, hash] = String(
      account?.password_hash || "0000000000000000:" + "00".repeat(64),
    ).split(":");
    const actual = scryptSync(password, salt, 64);
    if (!timingSafeEqual(actual, Buffer.from(hash, "hex")) || !account)
      return res.status(401).json({ error: "Email or password is incorrect." });
    establish(res, role, String(account.entity_id));
  });

  app.post("/api/auth/logout", (req, res) => {
    const token = (req.headers.cookie || "")
      .split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("rozgar_session="))
      ?.slice(15);
    if (token)
      repo.db
        .prepare("DELETE FROM sessions WHERE token_hash=?")
        .run(digest(token));
    res.clearCookie("rozgar_session", { path: "/" });
    res.json({ ok: true });
  });
  app.post("/api/actions", (req, res) => {
    const actor = session(req);
    if (!actor) return res.status(401).json({ error: "Sign in to continue." });
    queue = queue
      .then(async () => {
        const data = repo.read();
        if (req.body.revision !== data.revision) {
          res.status(409).json({
            error: "Another demo session updated the data. Refresh and retry.",
            data: visible(data, actor),
          });
          return;
        }
        try {
          const updated = await applyAction(
            data,
            actor,
            req.body.action as Action,
          );
          repo.save(updated);
          res.json({ data: visible(updated, actor) });
        } catch (e) {
          res.status(400).json({
            error: e instanceof Error ? e.message : "Invalid action.",
          });
        }
      })
      .catch((e) => {
        console.error(e);
        if (!res.headersSent)
          res
            .status(500)
            .json({ error: "The local database could not be updated." });
      });
  });
  app.get("/api/evaluate/:id", (req, res) => {
    const actor = session(req);
    if (!actor || actor.role !== "applicant" || actor.id !== req.params.id)
      return res
        .status(403)
        .json({ error: "You can only evaluate your own profile." });
    const d = repo.read(),
      a = d.applicants.find((a) => a.id === req.params.id);
    if (!a) return res.status(404).json({ error: "Applicant not found." });
    res.json({ results: evaluateApplicant(a, d.opportunities) });
  });
  app.use("/api", (_req, res) =>
    res.status(404).json({ error: "Endpoint not found." }),
  );
  app.use(
    (
      error: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      console.error(error);
      res
        .status(400)
        .json({ error: "Invalid request. Check JSON and field sizes." });
    },
  );
  return { app, repo };
}
