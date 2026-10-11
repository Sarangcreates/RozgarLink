import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createSeed } from "../src/data/seed";
import type { DataSet } from "../src/engine/types";
import {
  sampleApplicants,
  sampleCompanies,
  sampleOpportunities,
  sampleCourses,
} from "../src/data/sample-marketplace";
export function openDatabase(path: string) {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS entities (kind TEXT NOT NULL,id TEXT NOT NULL,payload TEXT NOT NULL CHECK(json_valid(payload)),PRIMARY KEY(kind,id));
    CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY,value INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY,role TEXT NOT NULL CHECK(role IN ('applicant','company')),entity_id TEXT NOT NULL,expires_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS accounts (email TEXT PRIMARY KEY, role TEXT NOT NULL, entity_id TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL);`);
  db.exec(
    "DELETE FROM sessions WHERE entity_id NOT IN (SELECT entity_id FROM accounts)",
  );
  const kinds = [
    "applicants",
    "companies",
    "opportunities",
    "reviews",
    "courses",
    "registry",
  ] as const;
  function save(data: DataSet) {
    db.exec("SAVEPOINT save_data");
    try {
      db.exec("DELETE FROM entities");
      const insert = db.prepare("INSERT INTO entities VALUES (?,?,?)");
      for (const kind of kinds)
        for (const item of data[kind])
          insert.run(
            kind,
            "id" in item ? item.id : item.certId,
            JSON.stringify(item),
          );
      db.prepare(
        "INSERT INTO metadata VALUES ('revision',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
      ).run(data.revision);
      db.exec("RELEASE save_data");
    } catch (e) {
      db.exec("ROLLBACK TO save_data; RELEASE save_data");
      throw e;
    }
  }
  function read(): DataSet {
    const result: Record<string, unknown> = {
      revision: Number(
        db.prepare("SELECT value FROM metadata WHERE key='revision'").get()
          ?.value || 1,
      ),
    };
    for (const kind of kinds)
      result[kind] = db
        .prepare("SELECT payload FROM entities WHERE kind=? ORDER BY rowid")
        .all(kind)
        .map((r) => JSON.parse(String(r.payload)));
    return result as unknown as DataSet;
  }
  if (!db.prepare("SELECT value FROM metadata WHERE key='revision'").get())
    save(createSeed());
  if (
    !db
      .prepare("SELECT value FROM metadata WHERE key='sample_marketplace_v1'")
      .get()
  ) {
    db.exec("SAVEPOINT add_sample_marketplace");
    try {
      const data = read();
      const additions = {
        applicants: sampleApplicants,
        companies: sampleCompanies,
        opportunities: sampleOpportunities,
        courses: sampleCourses,
      };
      let changed = false;
      for (const kind of Object.keys(additions) as (keyof typeof additions)[]) {
        const existing = new Set(data[kind].map((item) => item.id));
        for (const item of additions[kind]) {
          if (!existing.has(item.id)) {
            // All additions belong to the matching entity collection.
            (data[kind] as { id: string }[]).push(structuredClone(item));
            changed = true;
          }
        }
      }
      if (changed) {
        data.revision += 1;
        save(data);
      }
      db.prepare(
        "INSERT INTO metadata VALUES ('sample_marketplace_v1',1)",
      ).run();
      db.exec("RELEASE add_sample_marketplace");
    } catch (error) {
      db.exec(
        "ROLLBACK TO add_sample_marketplace; RELEASE add_sample_marketplace",
      );
      throw error;
    }
  }
  return { db, read, save };
}
