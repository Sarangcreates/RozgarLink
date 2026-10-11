import { afterEach, describe, expect, it, vi } from "vitest";
import { proxyApi } from "./proxy";
import { createApp } from "./app";
import handler from "../api/proxy";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe("Hosted API routing", () => {
  const frontend = "https://rozgar-link.vercel.app";
  it("restores a nested API path rewritten by Vercel", async () => {
    vi.stubEnv("BACKEND_URL", "https://backend.example.test");
    const fetchMock = vi
      .fn()
      .mockResolvedValue(Response.json({ session: null }));
    vi.stubGlobal("fetch", fetchMock);
    await handler.fetch(new Request(frontend + "/api/proxy?__route=auth/me"));
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      "https://backend.example.test/api/auth/me",
    );
  });
  it("reports a missing backend configuration as JSON", async () => {
    const response = await proxyApi(new Request(frontend + "/api/health"));
    expect(response.status).toBe(503);
    expect((await response.json()).error).toContain("not been configured");
  });
  it("forwards sign-in to the backend and preserves its secure session cookie", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json(
        { session: { role: "applicant", id: "a1" } },
        {
          headers: {
            "Set-Cookie":
              "rozgar_session=test; HttpOnly; Secure; Path=/; SameSite=Strict",
          },
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const body = JSON.stringify({
      role: "applicant",
      identifier: "test@example.test",
      password: "a-long-password",
    });
    const response = await proxyApi(
      new Request(frontend + "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: frontend },
        body,
      }),
      "https://backend.example.test",
    );
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      "https://backend.example.test/api/auth/login",
    );
    expect(new TextDecoder().decode(fetchMock.mock.calls[0][1].body)).toBe(
      body,
    );
    expect(response.headers.get("set-cookie")).toContain("HttpOnly; Secure");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it("rejects cross-origin mutations before contacting the backend", async () => {
    const response = await proxyApi(
      new Request(frontend + "/api/auth/login", {
        method: "POST",
        headers: { Origin: "https://other.example.test" },
      }),
      "https://backend.example.test",
    );
    expect(response.status).toBe(403);
  });
  it("handles a backend outage with a JSON error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const response = await proxyApi(
      new Request(frontend + "/api/health"),
      "https://backend.example.test",
    );
    expect(response.status).toBe(502);
    expect((await response.json()).error).toContain("Cannot connect");
  });
  it("permits the configured public origin while rejecting another origin", async () => {
    vi.stubEnv("APP_ORIGIN", frontend);
    const { app, repo } = createApp(":memory:");
    const server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server.on("listening", resolve));
    try {
      const port = (server.address() as { port: number }).port;
      const send = (origin: string) =>
        fetch(`http://127.0.0.1:${port}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Origin: origin },
          body: JSON.stringify({
            role: "applicant",
            identifier: "missing@example.test",
            password: "a-long-password",
          }),
        });
      expect((await send(frontend)).status).toBe(401);
      expect((await send("https://other.example.test")).status).toBe(403);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      repo.db.close();
    }
  });
});
