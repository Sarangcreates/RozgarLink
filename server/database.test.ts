import { expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDatabase } from "./database";

it("adds sample entities once to a legacy database without replacing saved profiles or accounts", () => {
  const dir = mkdtempSync(join(tmpdir(), "rozgar-migration-"));
  const path = join(dir, "data.sqlite");
  let repo = openDatabase(path);
  try {
    const legacy = repo.read();
    legacy.applicants = legacy.applicants.filter((a) => !a.sample);
    legacy.companies = legacy.companies.filter(
      (c) => !c.id.startsWith("sample-"),
    );
    legacy.opportunities = legacy.opportunities.filter(
      (j) => !j.id.startsWith("sample-"),
    );
    legacy.courses = legacy.courses.filter((c) => !c.id.startsWith("sample-"));
    legacy.applicants[0].name = "Preserve my edited profile";
    repo.save(legacy);
    repo.db
      .prepare("INSERT INTO accounts VALUES (?,?,?,?)")
      .run(
        "saved@example.test",
        "applicant",
        legacy.applicants[0].id,
        "existing-password-hash",
      );
    repo.db.exec("DELETE FROM metadata WHERE key='sample_marketplace_v1'");
    repo.db.close();
    repo = openDatabase(path);
    const migrated = repo.read();
    expect(migrated.applicants).toHaveLength(44);
    expect(migrated.opportunities).toHaveLength(21);
    expect(migrated.applicants[0].name).toBe("Preserve my edited profile");
    expect(
      repo.db.prepare("SELECT password_hash FROM accounts").get()
        ?.password_hash,
    ).toBe("existing-password-hash");
    expect(migrated.revision).toBe(legacy.revision + 1);
    migrated.applicants.find((a) => a.sample)!.name = "Edited demo profile";
    repo.save(migrated);
    repo.db.close();
    repo = openDatabase(path);
    expect(repo.read()).toEqual(migrated);
  } finally {
    repo.db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
