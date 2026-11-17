import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { DOMAINS } from "@/data/questions";

// Add or edit a question. Only "reviewed" questions reach students.
export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "no" }, { status: 401 });
  const b = await req.json().catch(() => null);
  const options = Array.isArray(b?.options) ? b.options.map((o: unknown) => String(o ?? "").trim()) : [];
  const answer = Number(b?.answer);
  const status = ["draft", "reviewed", "retired"].includes(b?.status) ? b.status : "draft";
  if (!DOMAINS.some((d) => d.id === b?.domain)) return NextResponse.json({ error: "Pick a topic." }, { status: 400 });
  if (!String(b?.stem ?? "").trim()) return NextResponse.json({ error: "The question needs text." }, { status: 400 });
  if (options.length !== 4 || options.some((o: string) => !o)) return NextResponse.json({ error: "Fill in all four options." }, { status: 400 });
  if (![0, 1, 2, 3].includes(answer)) return NextResponse.json({ error: "Pick the correct answer." }, { status: 400 });
  if (!String(b?.explanation ?? "").trim()) return NextResponse.json({ error: "Add an explanation." }, { status: 400 });
  const id = /^[a-z0-9_-]{1,40}$/i.test(b?.id ?? "") ? b.id : `q${Date.now().toString(36)}`;
  await db().query(
    `INSERT INTO questions (id, domain, stem, options, answer, explanation, status, source) VALUES ($1,$2,$3,$4,$5,$6,$7,'admin')
     ON CONFLICT (id) DO UPDATE SET domain = $2, stem = $3, options = $4, answer = $5, explanation = $6, status = $7, updated_at = now()`,
    [id, b.domain, String(b.stem).trim(), JSON.stringify(options), answer, String(b.explanation).trim(), status],
  );
  return NextResponse.json({ ok: true, id });
}
