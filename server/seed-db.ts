import { openDatabase } from "./database";
import { resolve } from "node:path";
const repo = openDatabase(
  process.env.DB_PATH || resolve("server/data/rozgarlink.sqlite"),
);
console.log("Database is ready. Existing demo data is preserved.");
repo.db.close();
