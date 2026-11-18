import Link from "next/link";

const LINKS = [
  ["/admin", "Overview"],
  ["/admin/sales", "Sales"],
  ["/admin/students", "Students"],
  ["/admin/questions", "Questions"],
  ["/admin/reports", "Reports"],
];

export default function AdminNav({ current }: { current: string }) {
  return (
    <nav className="row small" style={{ marginBottom: 16 }}>
      {LINKS.map(([href, label]) => (
        <Link key={href} href={href} className={`btn ${href === current ? "" : "secondary"}`} style={{ padding: "6px 12px" }}>
          {label}
        </Link>
      ))}
      <Link href="/home" className="small" style={{ marginLeft: "auto" }}>
        Student view
      </Link>
    </nav>
  );
}
