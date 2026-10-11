import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Server } from "node:http";
import { createApp } from "./app";
import { openDatabase } from "./database";
describe("Local prototype API", () => {
  const dir = mkdtempSync(join(tmpdir(), "rozgar-prototype-")),
    path = join(dir, "test.sqlite"),
    { app, repo } = createApp(path);
  let server: Server,
    base: string,
    cookie = "",
    applicantId = "",
    secondCookie = "",
    companyCookie = "";
  beforeAll(async () => {
    server = app.listen(0, "127.0.0.1");
    await new Promise<void>((r) => server.on("listening", r));
    base = "http://127.0.0.1:" + (server.address() as { port: number }).port;
  });
  afterAll(async () => {
    await new Promise<void>((r) => server.close(() => r()));
    repo.db.close();
    rmSync(dir, { recursive: true, force: true });
  });
  async function req(
    route: string,
    body?: unknown,
    session = cookie,
    headers: Record<string, string> = {},
  ) {
    const res = await fetch(base + "/api" + route, {
      headers: {
        "Content-Type": "application/json",
        ...(session ? { Cookie: session } : {}),
        ...headers,
      },
      ...(body === undefined
        ? {}
        : { method: "POST", body: JSON.stringify(body) }),
    });
    return { res, data: await res.json() };
  }
  const credentials = {
    role: "applicant",
    name: "Prototype Applicant",
    email: "new@example.test",
    password: "a-long-password",
    discoverable: true,
  };
  it("public reads contain no applicant or certificate registry data", async () => {
    const { data } = await req("/state");
    expect(data.data.applicants).toEqual([]);
    expect(data.data.registry).toEqual([]);
    expect(data.data.opportunities).toHaveLength(21);
  });
  it("rejects weak passwords and the old universal OTP", async () => {
    expect(
      (await req("/auth/register", { ...credentials, password: "short" })).res
        .status,
    ).toBe(400);
    expect(
      (
        await req("/auth/login", {
          role: "applicant",
          identifier: "a3@demo.test",
          otp: "123456",
        })
      ).res.status,
    ).toBe(400);
  });
  it("creates an account with hashed password and HttpOnly session", async () => {
    const r = await req("/auth/register", credentials);
    expect(r.res.status).toBe(200);
    expect(r.res.headers.get("set-cookie")).toContain("HttpOnly");
    cookie = r.res.headers.get("set-cookie")!.split(";")[0];
    applicantId = r.data.session.id;
    const record = repo.db
      .prepare("SELECT password_hash FROM accounts WHERE email=?")
      .get(credentials.email);
    expect(record?.password_hash).not.toContain(credentials.password);
    expect(
      (await req("/state")).data.data.applicants.map(
        (a: { id: string }) => a.id,
      ),
    ).toEqual([applicantId]);
  });
  it("rejects duplicate registration and incorrect passwords", async () => {
    expect((await req("/auth/register", credentials)).res.status).toBe(409);
    expect(
      (
        await req("/auth/login", {
          role: "applicant",
          identifier: credentials.email,
          password: "incorrect",
        })
      ).res.status,
    ).toBe(401);
  });
  it("persists profile actions and rejects stale writes", async () => {
    const state = (await req("/state")).data.data;
    const saved = await req("/actions", {
      revision: state.revision,
      action: { type: "bookmark", jobId: "j1" },
    });
    expect(saved.res.status).toBe(200);
    expect(saved.data.data.applicants[0].interestedJobIds).toContain("j1");
    expect(
      (
        await req("/actions", {
          revision: state.revision,
          action: { type: "bookmark", jobId: "j2" },
        })
      ).res.status,
    ).toBe(409);
    const reopened = openDatabase(path);
    expect(
      reopened.read().applicants.find((a) => a.id === applicantId)
        ?.interestedJobIds,
    ).toContain("j1");
    reopened.db.close();
  });
  it("isolates different applicants and their evaluation results", async () => {
    const second = await req("/auth/register", {
      ...credentials,
      name: "Second",
      email: "second@example.test",
      discoverable: false,
    });
    secondCookie = second.res.headers.get("set-cookie")!.split(";")[0];
    expect(
      (await req("/state", undefined, secondCookie)).data.data.applicants[0].id,
    ).not.toBe(applicantId);
    expect(
      (await req("/evaluate/" + applicantId, undefined, secondCookie)).res
        .status,
    ).toBe(403);
    expect((await req("/evaluate/" + applicantId)).res.status).toBe(200);
  });
  it("companies see only opted-in profiles with private fields removed", async () => {
    const company = await req("/auth/register", {
      ...credentials,
      role: "company",
      email: "company@example.test",
    });
    companyCookie = company.res.headers.get("set-cookie")!.split(";")[0];
    const profiles = (await req("/state", undefined, companyCookie)).data.data
      .applicants;
    expect(profiles.filter((p: { sample?: boolean }) => p.sample)).toHaveLength(
      36,
    );
    const realProfiles = profiles.filter(
      (p: { sample?: boolean }) => !p.sample,
    );
    expect(realProfiles).toHaveLength(1);
    expect(realProfiles[0].id).toBe(applicantId);
    for (const profile of profiles) {
      expect(profile.email).toBe("");
      expect(profile.phone).toBe("");
      expect(profile.progress).toEqual([]);
    }
  });
  it("blocks unauthorized writes, reset and cross-origin mutations", async () => {
    expect((await req("/actions", {}, "")).res.status).toBe(401);
    expect((await req("/demo/reset", {})).res.status).toBe(404);
    expect(
      (
        await req("/auth/logout", {}, cookie, {
          Origin: "https://evil.example",
        })
      ).res.status,
    ).toBe(403);
    const d = repo.read();
    expect(
      (
        await req("/actions", {
          revision: d.revision,
          action: { type: "opportunity", opportunity: d.opportunities[0] },
        })
      ).res.status,
    ).toBe(400);
  });
  it("limits AI explanations to the signed-in applicant and leaves database records unchanged", async () => {
    expect((await req("/tier-insight", {}, "")).res.status).toBe(403);
    expect((await req("/tier-insight", {}, companyCookie)).res.status).toBe(
      403,
    );
    vi.stubEnv("GEMINI_API_KEY", "test-only-key");
    const originalFetch = globalThis.fetch;
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input, init) => {
        if (
          String(input).startsWith("https://generativelanguage.googleapis.com/")
        )
          return Promise.resolve(
            Response.json({
              candidates: [
                {
                  content: {
                    parts: [
                      { text: "Suggestions based on your matching results." },
                    ],
                  },
                },
              ],
            }),
          );
        return originalFetch(input, init);
      });
    try {
      const before = repo.read();
      const response = await req("/tier-insight", { applicantId: "a1" });
      expect(response.res.status).toBe(200);
      expect(response.data.revision).toBe(before.revision);
      expect(response.data.text).toContain("Suggestions");
      expect(repo.read()).toEqual(before);
      const call = spy.mock.calls.find(([url]) =>
        String(url).startsWith("https://generativelanguage.googleapis.com/"),
      )!;
      const context = JSON.parse(
        JSON.parse(String(call[1]?.body)).contents[0].parts[0].text,
      );
      const own = before.applicants.find((a) => a.id === applicantId)!;
      expect(context.overall.count).toBe(0);
      expect(JSON.stringify(context)).not.toContain(own.email);
    } finally {
      spy.mockRestore();
      vi.unstubAllEnvs();
    }
  });
  it("logs out, then signs back in using the account password", async () => {
    expect((await req("/auth/logout", {})).res.status).toBe(200);
    expect((await req("/auth/me")).data.session).toBeNull();
    const login = await req(
      "/auth/login",
      {
        role: "applicant",
        identifier: credentials.email,
        password: credentials.password,
      },
      "",
    );
    expect(login.res.status).toBe(200);
    expect(login.data.session.id).toBe(applicantId);
  });
});
