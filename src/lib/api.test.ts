import { afterEach, describe, expect, it, vi } from "vitest";
import { request } from "./api";

afterEach(() => vi.unstubAllGlobals());

describe("API response failures", () => {
  it("explains a text gateway error instead of exposing a JSON parser error", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response("The page could not be loaded", { status: 502 }),
        ),
    );
    await expect(request("/auth/login", {})).rejects.toMatchObject({
      status: 502,
      message: expect.stringContaining(
        "backend returned an unexpected response",
      ),
    });
  });
  it("rejects HTML returned with a successful status", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response("<html>App</html>", {
            headers: { "Content-Type": "text/html" },
          }),
        ),
    );
    await expect(request("/auth/login", {})).rejects.toMatchObject({
      status: 502,
    });
  });
  it("handles malformed JSON responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response("broken", {
            headers: { "Content-Type": "application/json" },
          }),
        ),
    );
    await expect(request("/state")).rejects.toMatchObject({ status: 502 });
  });
  it("explains network failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
    );
    await expect(request("/auth/login", {})).rejects.toMatchObject({
      status: 0,
      message: expect.stringContaining("Cannot connect"),
    });
  });
  it("keeps credential errors from the backend", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { error: "Email or password is incorrect." },
            { status: 401 },
          ),
        ),
    );
    await expect(request("/auth/login", {})).rejects.toMatchObject({
      status: 401,
      message: "Email or password is incorrect.",
    });
  });
});
