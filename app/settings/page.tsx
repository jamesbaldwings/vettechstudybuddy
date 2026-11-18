import { requireLead } from "@/lib/auth";
import Settings from "./Settings";
import PasswordForm from "./PasswordForm";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings", robots: { index: false } };

export default async function SettingsPage() {
  const l = await requireLead("/settings");
  const hasPassword = !!(await db().query<{ h: string | null }>(`SELECT password_hash h FROM leads WHERE id = $1`, [l.id])).rows[0]?.h;
  return (
    <>
    <Settings
      email={l.email}
      firstName={l.first_name ?? ""}
      examDate={l.exam_date ?? ""}
      targetMonth={l.target_month ?? ""}
      checkIns={l.marketing_ok && !l.unsubscribed_at}
    />
    <PasswordForm hasPassword={hasPassword} />
    </>
  );
}
