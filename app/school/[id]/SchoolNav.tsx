import Link from "next/link";

export default function SchoolNav({ id, name, current }: { id: string; name: string; current: string }) {
  const links = [
    [`/school/${id}`, "Dashboard"],
    [`/school/${id}/students`, "Students"],
    [`/school/${id}/seats`, "Seats"],
  ];
  return (
    <>
      <p className="small muted" style={{ margin: "0 0 4px" }}>
        {name}
      </p>
      <nav className="row small" style={{ marginBottom: 16 }}>
        {links.map(([href, label]) => (
          <Link key={href} href={href} className={`btn ${href === current ? "" : "secondary"}`} style={{ padding: "6px 12px" }}>
            {label}
          </Link>
        ))}
        <a href={`/api/school/${id}/report`} className="small">
          Download CSV
        </a>
        <Link href="/home" className="small" style={{ marginLeft: "auto" }}>
          My study home
        </Link>
      </nav>
    </>
  );
}
