import { expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "./app";
import { openDatabase } from "./database";

it("persists applications and shares a private applicant only with the receiving company", async () => {
  const dir = mkdtempSync(join(tmpdir(), "rozgar-applications-"));
  const path = join(dir, "data.sqlite");
  const { app, repo } = createApp(path);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.on("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}/api`;
  async function request(route: string, cookie = "", body?: unknown) {
    const response = await fetch(base + route, {
      headers: { "Content-Type": "application/json", Cookie: cookie },
      ...(body === undefined
        ? {}
        : { method: "POST", body: JSON.stringify(body) }),
    });
    return { response, data: await response.json() };
  }
  async function register(role: string, email: string) {
    const result = await request("/auth/register", "", {
      role,
      name: "Application Test",
      email,
      password: "long-test-password",
      discoverable: false,
    });
    expect(result.response.status).toBe(200);
    return {
      cookie: result.response.headers.get("set-cookie")!.split(";")[0],
      id: result.data.session.id,
    };
  }
  try {
    const owner = await register("company", "owner@example.test");
    const other = await register("company", "other@example.test");
    const actor = await register("applicant", "candidate@example.test");
    const data = repo.read();
    const profile = data.applicants.find((a) => a.id === actor.id)!;
    const job = {
      ...structuredClone(data.opportunities[0]),
      id: "application-test-job",
      companyId: owner.id,
    };
    const qualified = data.applicants[0];
    Object.assign(profile, {
      degree: qualified.degree,
      location: qualified.location,
      experienceYears: qualified.experienceYears,
      skills: qualified.skills,
    });
    data.opportunities.push(job);
    repo.save(data);
    const submit = await request("/actions", actor.cookie, {
      revision: data.revision,
      action: { type: "apply", jobId: job.id },
    });
    expect(submit.response.status).toBe(200);
    const ownerState = (await request("/state", owner.cookie)).data.data;
    const received = ownerState.applicants.find(
      (a: { id: string }) => a.id === actor.id,
    );
    expect(received.applications).toHaveLength(1);
    expect(received.email).toBe("");
    expect(received.phone).toBe("");
    const otherState = (await request("/state", other.cookie)).data.data;
    expect(
      otherState.applicants.some((a: { id: string }) => a.id === actor.id),
    ).toBe(false);
    const duplicate = await request("/actions", actor.cookie, {
      revision: repo.read().revision,
      action: { type: "apply", jobId: job.id },
    });
    expect(duplicate.response.status).toBe(400);
    profile.discoverable = true;
    const current = repo.read();
    current.applicants.find((a) => a.id === actor.id)!.discoverable = true;
    repo.save(current);
    const shared = (
      await request("/state", other.cookie)
    ).data.data.applicants.find((a: { id: string }) => a.id === actor.id);
    expect(shared.applications).toEqual([]);
    const reopened = openDatabase(path);
    try {
      expect(
        reopened.read().applicants.find((a) => a.id === actor.id)!.applications,
      ).toHaveLength(1);
    } finally {
      reopened.db.close();
    }
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    repo.db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
