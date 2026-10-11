import { afterEach, describe, expect, it, vi } from "vitest";
import { appOrigins, allowedAppOrigin } from "./origins";
import { createApp } from "./app";

afterEach(() => vi.unstubAllEnvs());
describe("App origin handling", () => {
  it("accepts the canonical frontend with no hosting configuration", () => {
    vi.stubEnv("APP_ORIGIN", "");
    vi.stubEnv("APP_ORIGINS", "");
    expect(
      allowedAppOrigin(
        "https://rozgarlink.onrender.com",
        "http://localhost:3001",
        appOrigins(),
      ),
    ).toBe(true);
    expect(
      allowedAppOrigin(
        "https://rozgar-link.vercel.app",
        "http://localhost:3001",
        appOrigins(),
      ),
    ).toBe(true);
    expect(
      allowedAppOrigin(
        "http://localhost:4173",
        "http://localhost:3001",
        appOrigins(),
      ),
    ).toBe(true);
  });
  it("supports custom and preview origins alongside the original setting", () => {
    vi.stubEnv("APP_ORIGIN", "https://custom.example.test/login");
    vi.stubEnv(
      "APP_ORIGINS",
      " https://preview.example.test, https://second.example.test/ ",
    );
    const origins = appOrigins();
    for (const origin of [
      "https://custom.example.test",
      "https://preview.example.test",
      "https://second.example.test",
    ])
      expect(allowedAppOrigin(origin, "http://localhost:3001", origins)).toBe(
        true,
      );
  });
  it("accepts the Render-assigned HTTPS URL and the local port used by Render", () => {
    vi.stubEnv("RENDER_EXTERNAL_URL", "https://rozgar-test.onrender.com");
    const origins = appOrigins();
    expect(
      allowedAppOrigin(
        "https://rozgar-test.onrender.com",
        "http://localhost:10000",
        origins,
      ),
    ).toBe(true);
    expect(
      allowedAppOrigin(
        "http://localhost:10000",
        "http://127.0.0.1:3001",
        origins,
      ),
    ).toBe(true);
    expect(
      allowedAppOrigin(
        "https://unrelated.onrender.com",
        "http://localhost:10000",
        origins,
      ),
    ).toBe(false);
  });
  it("allows both portals behind Render HTTPS forwarding without enabling unrelated Render sites", async () => {
    const origin = "https://rozgar-test.onrender.com";
    vi.stubEnv("RENDER_EXTERNAL_URL", origin);
    vi.stubEnv("RENDER", "true");
    const { app, repo } = createApp(":memory:");
    const server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server.on("listening", resolve));
    try {
      const port = (server.address() as { port: number }).port;
      const send = (path: string, website: string, body: unknown) =>
        fetch(`http://127.0.0.1:${port}/api${path}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Origin: website,
            "X-Forwarded-Proto": "https",
          },
          body: JSON.stringify(body),
        });
      for (const role of ["applicant", "company"]) {
        const email = `${role}@render-test.example`;
        const register = await send("/auth/register", origin, {
          role,
          name: "Render Portal Test",
          email,
          password: "render-test-password",
        });
        expect(register.status).toBe(200);
        expect(register.headers.get("set-cookie")).toContain("Secure");
        const credentials = {
          role,
          identifier: email,
          password: "render-test-password",
        };
        expect((await send("/auth/login", origin, credentials)).status).toBe(
          200,
        );
        expect(
          (await send("/auth/login", "https://other.onrender.com", credentials))
            .status,
        ).toBe(403);
      }
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      repo.db.close();
    }
  });
  it("accepts a direct same-origin app on the server's assigned port", () => {
    expect(
      allowedAppOrigin(
        "http://localhost:8765",
        "http://localhost:8765",
        appOrigins(),
      ),
    ).toBe(true);
  });
  it("rejects unrelated, deceptive, opaque, or malformed origins", () => {
    const origins = appOrigins();
    for (const origin of [
      "https://evil.example.test",
      "https://rozgar-link.vercel.app.evil.example.test",
      "null",
      "broken",
      "https://rozgar-link.vercel.app/extra",
      "file:///",
    ])
      expect(allowedAppOrigin(origin, "http://localhost:3001", origins)).toBe(
        false,
      );
  });
  it("registers and signs in through the public frontend origin, while blocking foreign sites", async () => {
    vi.stubEnv("APP_ORIGIN", "");
    vi.stubEnv("APP_ORIGINS", "");
    const { app, repo } = createApp(":memory:");
    const server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server.on("listening", resolve));
    try {
      const port = (server.address() as { port: number }).port;
      const send = (path: string, origin: string, body: unknown) =>
        fetch(`http://127.0.0.1:${port}/api${path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Origin: origin },
          body: JSON.stringify(body),
        });
      const frontend = "https://rozgar-link.vercel.app";
      const registration = await send("/auth/register", frontend, {
        role: "applicant",
        name: "Origin Test",
        email: "origin@example.test",
        password: "origin-test-password",
      });
      expect(registration.status).toBe(200);
      const login = {
        role: "applicant",
        identifier: "origin@example.test",
        password: "origin-test-password",
      };
      expect((await send("/auth/login", frontend, login)).status).toBe(200);
      expect(
        (await send("/auth/login", "https://untrusted.example.test", login))
          .status,
      ).toBe(403);
      expect(
        (await send("/auth/login", `http://127.0.0.1:${port}`, login)).status,
      ).toBe(200);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      repo.db.close();
    }
  });
});
