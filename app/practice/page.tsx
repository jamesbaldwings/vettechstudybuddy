import Link from "next/link";
import { requireLead } from "@/lib/auth";
import { getReadiness } from "@/lib/readiness";
import { missedCount } from "@/lib/practice";
import { getAccess } from "@/lib/access";
import Practice from "./Practice";

export const dynamic = "force-dynamic";
export const metadata = { title: "Practice", robots: { index: false } };

export default async function PracticePage() {
  const lead = await requireLead("/practice");
  const [r, missed, access] = await Promise.all([getReadiness(lead.id), missedCount(lead.id), getAccess(lead.id)]);
  return (
    <>
      <p className="small">
        <Link href="/home">← Study home</Link>
      </p>
      <Practice
        domains={r.domains.map((d) => ({ id: d.id, name: d.name, pct: d.pct, total: d.total }))}
        missed={missed}
        freeLeft={access.freePracticeLeft}
      />
    </>
  );
}
