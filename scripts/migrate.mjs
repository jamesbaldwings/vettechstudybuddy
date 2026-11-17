import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}
const here = path.dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(path.join(here, "..", "db", "schema.sql"), "utf8");
const seed = JSON.parse(readFileSync(path.join(here, "..", "db", "seed-questions.json"), "utf8"));
const local = url.includes("localhost") || url.includes("127.0.0.1");
const client = new pg.Client({ connectionString: url, ssl: local ? false : { rejectUnauthorized: false } });
await client.connect();
await client.query(sql);
// Seed the reviewed diagnostic questions into the bank. Existing rows are never overwritten,
// so edits made in the admin question editor are kept.
let added = 0;
for (const q of seed) {
  const r = await client.query(
    `INSERT INTO questions (id, domain, stem, options, answer, explanation, status, source)
     VALUES ($1, $2, $3, $4, $5, $6, 'reviewed', 'diagnostic') ON CONFLICT (id) DO NOTHING`,
    [q.id, q.domain, q.stem, JSON.stringify(q.options), q.answer, q.explanation],
  );
  added += r.rowCount;
}
await client.end();
console.log(`Database schema is up to date.${added ? ` Seeded ${added} questions.` : ""}`);
