import pg, { Pool } from "pg";

// Return DATE columns as plain YYYY-MM-DD strings instead of timezone-shifted Date objects.
pg.types.setTypeParser(1082, (v: string) => v);

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

function makePool() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const local = url.includes("localhost") || url.includes("127.0.0.1");
  return new Pool({ connectionString: url, max: 5, ssl: local ? false : { rejectUnauthorized: false } });
}

export function db(): Pool {
  if (!global.__pgPool) global.__pgPool = makePool();
  return global.__pgPool;
}
