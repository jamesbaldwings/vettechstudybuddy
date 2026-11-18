import Link from "next/link";
import { currentLead } from "@/lib/auth";
import { foundingSpotsLeft } from "@/lib/access";
import { stripeEnabled } from "@/lib/stripe";
import { BUDDY_NAME, money, PLANS } from "@/config";
import BuyButton from "./BuyButton";
import { Buddy } from "@/components/Buddy";

export const dynamic = "force-dynamic";
export const metadata = { title: "Passes and pricing" };

export default async function Pricing() {
  const [lead, spots] = await Promise.all([currentLead(), foundingSpotsLeft()]);
  const open = stripeEnabled();
  const ep = PLANS.exam_pass;
  const founding = spots > 0;
  const passes = [PLANS.final_stretch, PLANS.retake_pass];

  return (
    <>
      <Buddy>
        <p>
          Start free. When you&apos;re ready to study hard, grab a pass. Your days don&apos;t start until you press Start, so buy now and
          begin when it suits you.
        </p>
      </Buddy>

      <section className="card plan featured">
        <div className="spread">
          <h2 style={{ margin: 0 }}>{ep.name}</h2>
          {founding && <span className="badge">Founding price · {spots} left</span>}
        </div>
        <div className="price">
          {money(founding ? ep.foundingPriceCents! : ep.priceCents)}
          {founding && <s>{money(ep.priceCents)}</s>}
        </div>
        <p className="muted">{ep.blurb}</p>
        <ul>
          {ep.features.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
        <BuyButton plan="exam_pass" signedIn={!!lead} open={open} label="Get the Exam Pass" />
        <p className="small muted" style={{ marginTop: 10 }}>
          Pass guarantee: if you use your pass, take two full practice exams, and don&apos;t pass the VTNE, we&apos;ll give you a free
          Retake Pass. <Link href="/refunds">Details</Link>
        </p>
      </section>

      <section className="plans">
        {passes.map((p) => (
          <div key={p.id} className="card plan">
            <h3 style={{ margin: 0 }}>{p.name}</h3>
            <div className="price">{money(p.priceCents)}</div>
            <p className="muted small">{p.blurb}</p>
            <ul>
              {p.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <BuyButton plan={p.id} signedIn={!!lead} open={open} label={`Get ${p.name}`} secondary />
          </div>
        ))}
      </section>

      <section className="card">
        <div className="spread">
          <div>
            <h3 style={{ margin: 0 }}>Extra voice time</h3>
            <p className="muted small" style={{ margin: 0 }}>
              {PLANS.extra_voice.voiceMinutes} more minutes with {BUDDY_NAME} for {money(PLANS.extra_voice.priceCents)}. Never expires.
            </p>
          </div>
          <BuyButton plan="extra_voice" signedIn={!!lead} open={open} label="Add 60 minutes" secondary />
        </div>
      </section>

      <section className="card">
        <h3>Free, always</h3>
        <p className="muted" style={{ margin: 0 }}>
          The diagnostic, your study plan, check-in emails before and after your VTNE, 10 practice questions a day, 3 &quot;why&quot;
          chats a day, and 10 minutes of voice study with {BUDDY_NAME}.
        </p>
      </section>

      <p className="center small muted">
        Is your school interested in seats for a class? Email <a href="mailto:hello@vettechstudybuddy.com">hello@vettechstudybuddy.com</a>.
      </p>
    </>
  );
}
