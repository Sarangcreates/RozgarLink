import { backup, DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvFile } from "node:process";

const root = fileURLToPath(new URL("../", import.meta.url));
if (existsSync(resolve(root, ".env"))) loadEnvFile(resolve(root, ".env"));
const source =
  process.env.DB_PATH || resolve(root, "server/data/rozgarlink.sqlite");
if (!existsSync(source))
  throw new Error(
    "The database does not exist. Start the app before backing it up.",
  );
const directory = resolve(root, "server/data/backups");
mkdirSync(directory, { recursive: true });
const destination = resolve(
  directory,
  `rozgarlink-${new Date().toISOString().replaceAll(":", "-")}.sqlite`,
);
const db = new DatabaseSync(source, { readOnly: true });
try {
  await backup(db, destination);
} finally {
  db.close();
}
const saved = new DatabaseSync(destination, { readOnly: true });
try {
  const check = saved.prepare("PRAGMA integrity_check").get();
  if (check.integrity_check !== "ok")
    throw new Error("Backup integrity check failed.");
} finally {
  saved.close();
}
console.log(`Database backup saved and verified: ${destination}`);
