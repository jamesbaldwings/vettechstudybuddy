import { requireAdmin } from "@/lib/auth";
import AdminNav from "../AdminNav";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sara conversations", robots: { index: false } };

type Turn = { role: string; message: string | null; time_in_call_secs?: number };
type Convo = { conversation_id: string; start_time_unix_secs: number; call_duration_secs: number; message_count: number; status: string; call_successful?: string };

async function el<T>(path: string): Promise<T | null> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return null;
  const res = await fetch(`${process.env.ELEVENLABS_API_BASE || "https://api.elevenlabs.io"}${path}`, { headers: { "xi-api-key": key }, cache: "no-store" });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as T;
}

// Owner view of recent conversations with Sara, straight from ElevenLabs, for checking she is working.
export default async function SaraLog() {
  await requireAdmin();
  const agent = process.env.ELEVENLABS_AGENT_ID || "";
  let convos: Convo[] = [];
  let details: Record<string, { transcript: Turn[]; termination?: string; error?: string }> = {};
  let err = "";
  try {
    const list = await el<{ conversations: Convo[] }>(`/v1/convai/conversations?agent_id=${encodeURIComponent(agent)}&page_size=15`);
    convos = list?.conversations ?? [];
    const first = await Promise.all(
      convos.slice(0, 6).map((c) =>
        el<{ transcript: Turn[]; metadata?: { termination_reason?: string; error?: { message?: string } } }>(`/v1/convai/conversations/${c.conversation_id}`).then((d) => [
          c.conversation_id,
          { transcript: d?.transcript ?? [], termination: d?.metadata?.termination_reason, error: d?.metadata?.error?.message },
        ] as const),
      ),
    );
    details = Object.fromEntries(first);
  } catch (e) {
    err = String((e as Error).message);
  }
  return (
    <>
      <AdminNav current="/admin/sara" />
      <h1>Sara conversations</h1>
      <p className="small muted">The 15 most recent, newest first. The first 6 show the full transcript. Times are Central.</p>
      {err && <p className="error">{err}</p>}
      {convos.map((c) => {
        const d = details[c.conversation_id];
        return (
          <section key={c.conversation_id} className="card">
            <p className="small" style={{ marginTop: 0 }}>
              <strong>{new Date(c.start_time_unix_secs * 1000).toLocaleString("en-US", { timeZone: "America/Chicago" })}</strong> · {c.call_duration_secs}s ·{" "}
              {c.message_count} messages · {c.status}
              {d?.termination && ` · ended: ${d.termination}`}
              {d?.error && <span className="error"> · {d.error}</span>}
            </p>
            {d && (
              <ol className="small" style={{ margin: 0, paddingLeft: 18 }}>
                {d.transcript.map((t, i) => (
                  <li key={i}>
                    <strong>{t.role === "agent" ? "Sara" : "Student"}</strong>
                    {typeof t.time_in_call_secs === "number" && <span className="muted"> ({t.time_in_call_secs}s)</span>}: {t.message ?? <em className="muted">(no text)</em>}
                  </li>
                ))}
              </ol>
            )}
          </section>
        );
      })}
      {!convos.length && !err && <p className="small muted">No conversations yet.</p>}
    </>
  );
}
