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
const client = new pg.Client({ connectionString: url, ssl: url.includes("localhost") || url.includes("127.0.0.1") ? false : { rejectUnauthorized: false } });
await client.connect();
await client.query(sql);
await client.end();
console.log("Database schema is up to date.");
