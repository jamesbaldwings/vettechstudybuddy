import { currentLead } from "@/lib/auth";
import { canManage, getSchool } from "@/lib/school";
import { csvFor, schoolStudents } from "@/lib/schoolReports";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await currentLead();
  if (!(await canManage(lead, id))) return new Response("Not allowed", { status: 403 });
  const school = await getSchool(id);
  const csv = csvFor((await schoolStudents(id)).filter((r) => r.status !== "removed"));
  const name = (school?.name ?? "school").replace(/[^A-Za-z0-9]+/g, "-").toLowerCase();
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${name}-students-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
