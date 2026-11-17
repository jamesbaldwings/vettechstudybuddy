import Link from "next/link";
import { requireLead } from "@/lib/auth";
import { getAccess } from "@/lib/access";
import VoiceBuddy from "@/components/VoiceBuddy";
import TextChat from "@/components/TextChat";
import { BUDDY_NAME } from "@/config";

export const dynamic = "force-dynamic";
export const metadata = { title: `Study with ${BUDDY_NAME}`, robots: { index: false } };

export default async function SaraPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const lead = await requireLead("/sara");
  const { mode } = await searchParams;
  const access = await getAccess(lead.id);
  const voice = <VoiceBuddy initialMinutes={access.voiceMinutes} />;
  const text = access.activePass ? (
    <TextChat />
  ) : (
    <section className="card">
      <h2>Chat with {BUDDY_NAME}</h2>
      <p className="muted">Text chat comes with any pass. Ask questions anytime, as many as you like.</p>
      <Link href="/pricing" className="btn secondary">
        See passes
      </Link>
    </section>
  );
  return (
    <>
      <p className="small">
        <Link href="/home">← Study home</Link>
      </p>
      {mode === "text" ? (
        <>
          {text}
          {voice}
        </>
      ) : (
        <>
          {voice}
          {text}
        </>
      )}
    </>
  );
}
