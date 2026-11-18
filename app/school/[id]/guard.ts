import { notFound, redirect } from "next/navigation";
import { currentLead } from "@/lib/auth";
import { canManage, getSchool } from "@/lib/school";

export async function requireSchool(id: string, path: string) {
  const lead = await currentLead();
  if (!lead) redirect(`/signin?next=${encodeURIComponent(path)}`);
  const school = await getSchool(id);
  if (!school || !(await canManage(lead, id))) notFound();
  return { lead, school };
}
