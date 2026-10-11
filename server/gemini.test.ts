import { afterEach, describe, expect, it, vi } from "vitest";
import { createSeed } from "../src/data/seed";
import { explainTier, tierContext } from "./gemini";
import { evaluateApplicant, overallTier } from "../src/engine/matching";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe("Gemini explanations", () => {
  it("sends calculated results without account or other applicant details", () => {
    const data = createSeed();
    const applicant = data.applicants[0];
    const context = tierContext(applicant, data);
    const serialized = JSON.stringify(context);
    for (const profile of data.applicants) {
      expect(serialized).not.toContain(profile.name);
      if (profile.email) expect(serialized).not.toContain(profile.email);
      if (profile.phone) expect(serialized).not.toContain(profile.phone);
      for (const certificate of profile.certificates)
        if (certificate.certId)
          expect(serialized).not.toContain(certificate.certId);
    }
    const overall = overallTier(
      evaluateApplicant(applicant, data.opportunities),
    );
    expect(context.overall.tier).toBe(overall.tier);
    expect(context.overall.scorePct).toBe(overall.scorePct);
  });
  it("keeps offline calculations usable when no key is configured", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const data = createSeed();
    await expect(explainTier(data.applicants[0], data)).rejects.toMatchObject({
      status: 503,
    });
    expect(
      evaluateApplicant(data.applicants[0], data.opportunities),
    ).toHaveLength(data.opportunities.length);
  });
  it("uses a server-only key and never mutates the profile or calculated scores", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-only-key");
    vi.stubEnv("GEMINI_MODEL", "gemini-flash-latest");
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        Response.json({
          candidates: [
            {
              content: {
                parts: [
                  { text: "Private reasoning", thought: true },
                  { text: "Suggestions based on your supplied scores." },
                ],
              },
            },
          ],
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const data = createSeed();
    const before = JSON.stringify(data);
    const text = await explainTier(data.applicants[0], data);
    expect(text).toBe("Suggestions based on your supplied scores.");
    expect(JSON.stringify(data)).toBe(before);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain("/gemini-flash-latest:generateContent");
    expect(options.headers["X-goog-api-key"]).toBe("test-only-key");
    expect(options.body).not.toContain("test-only-key");
    expect(JSON.parse(options.body).contents[0].parts[0].text).toBe(
      JSON.stringify(tierContext(data.applicants[0], data)),
    );
  });
  it("explains provider quotas without exposing raw provider errors", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-only-key");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response("sensitive provider detail", { status: 429 }),
        ),
    );
    const data = createSeed();
    await expect(explainTier(data.applicants[0], data)).rejects.toMatchObject({
      status: 429,
      message: "AI usage limit reached. Try again later.",
    });
  });
  it("handles empty or blocked model responses", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-only-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ candidates: [] })),
    );
    const data = createSeed();
    await expect(explainTier(data.applicants[0], data)).rejects.toMatchObject({
      status: 502,
    });
  });
});
