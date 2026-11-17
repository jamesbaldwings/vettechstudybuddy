import Verify from "./Verify";

export const metadata = { title: "Signing in", robots: { index: false } };

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  return <Verify token={t || ""} />;
}
