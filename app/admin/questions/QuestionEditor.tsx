"use client";
import { useState } from "react";

interface Q {
  id: string;
  domain: string;
  stem: string;
  options: string[];
  answer: number;
  explanation: string;
  status: string;
}

export default function QuestionEditor({ q, domains }: { q: Q | null; domains: { id: string; name: string }[] }) {
  const [f, setF] = useState<Q>(q ?? { id: "", domain: domains[0].id, stem: "", options: ["", "", "", ""], answer: 0, explanation: "", status: "draft" });
  const [msg, setMsg] = useState("");
  const set = (k: keyof Q, v: unknown) => setF((x) => ({ ...x, [k]: v }));
  async function save(status?: string) {
    const body = { ...f, status: status ?? f.status };
    const r = await fetch("/api/admin/question", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json();
    if (!r.ok) return setMsg(j.error);
    const u = new URL(window.location.href);
    u.searchParams.delete("edit");
    window.location.href = u.toString();
  }
  return (
    <section className="card notice">
      <h3 style={{ marginTop: 0 }}>{q ? "Edit question" : "New question"}</h3>
      <div className="field">
        <label>Topic</label>
        <select value={f.domain} onChange={(e) => set("domain", e.target.value)}>
          {domains.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>Question</label>
        <textarea rows={3} value={f.stem} onChange={(e) => set("stem", e.target.value)} />
      </div>
      {f.options.map((o, i) => (
        <div key={i} className="row" style={{ marginBottom: 8 }}>
          <label className="choice" style={{ margin: 0 }}>
            <input type="radio" name="ans" checked={f.answer === i} onChange={() => set("answer", i)} /> {"ABCD"[i]}
          </label>
          <input style={{ flex: 1 }} value={o} onChange={(e) => set("options", f.options.map((x, j) => (j === i ? e.target.value : x)))} />
        </div>
      ))}
      <p className="small muted">Select the circle next to the correct answer.</p>
      <div className="field">
        <label>Explanation (why the answer is right, and why the tempting wrong one is wrong)</label>
        <textarea rows={4} value={f.explanation} onChange={(e) => set("explanation", e.target.value)} />
      </div>
      {msg && <p className="error">{msg}</p>}
      <div className="row">
        <button className="btn" onClick={() => save("reviewed")}>
          Save as reviewed (live)
        </button>
        <button className="btn secondary" onClick={() => save("draft")}>
          Save as draft
        </button>
        {q && (
          <button className="btn ghost" onClick={() => save("retired")}>
            Retire
          </button>
        )}
      </div>
    </section>
  );
}
