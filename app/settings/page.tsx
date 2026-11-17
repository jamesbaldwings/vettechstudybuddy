import { requireLead } from "@/lib/auth";
import Settings from "./Settings";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings", robots: { index: false } };

export default async function SettingsPage() {
  const l = await requireLead("/settings");
  return (
    <Settings
      email={l.email}
      firstName={l.first_name ?? ""}
      examDate={l.exam_date ?? ""}
      targetMonth={l.target_month ?? ""}
      checkIns={l.marketing_ok && !l.unsubscribed_at}
    />
  );
}
