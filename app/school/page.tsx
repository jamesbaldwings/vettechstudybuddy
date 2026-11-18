import Link from "next/link";
import { redirect } from "next/navigation";
import { requireLead } from "@/lib/auth";
import { schoolsFor } from "@/lib/school";

export const dynamic = "force-dynamic";
export const metadata = { title: "School dashboard", robots: { index: false } };

export default async function SchoolIndex() {
  const lead = await requireLead("/school");
  const schools = await schoolsFor(lead);
  if (schools.length === 1) redirect(`/school/${schools[0].id}`);
  return (
    <>
      <h1>School dashboard</h1>
      {schools.length ? (
        <section className="card">
          <ul>
            {schools.map((s) => (
              <li key={s.id}>
                <Link href={`/school/${s.id}`}>{s.name}</Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p>
          Your account isn&apos;t a school admin yet. If your school bought seats, use the admin link we emailed you. <Link href="/home">Back to studying</Link>
        </p>
      )}
    </>
  );
}
