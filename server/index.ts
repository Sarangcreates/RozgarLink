import express from "express";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { createApp } from "./app";
const root = fileURLToPath(new URL("../", import.meta.url));
if (existsSync(resolve(root, ".env"))) loadEnvFile(resolve(root, ".env"));
const path =
  process.env.DB_PATH || resolve(root, "server/data/rozgarlink.sqlite");
const { app, repo } = createApp(path);
if (!process.argv.includes("--dev")) {
  const dist = resolve(root, "dist");
  if (!existsSync(resolve(dist, "index.html"))) {
    console.error("Run npm run build before npm start.");
    process.exit(1);
  }
  app.use(express.static(dist));
  app.get("/{*path}", (_req, res) => res.sendFile(resolve(dist, "index.html")));
}
const port = Number(process.env.PORT || 3001);
const server = app.listen(port, process.env.HOST || "127.0.0.1", () =>
  console.log(
    `RozgarLink API ready at http://localhost:${port}${process.argv.includes("--dev") ? " · open http://localhost:5173" : ""}`,
  ),
);
for (const s of ["SIGINT", "SIGTERM"])
  process.on(s, () =>
    server.close(() => {
      repo.db.close();
      process.exit(0);
    }),
  );
