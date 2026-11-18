import ResetForm from "./ResetForm";

export const metadata = { title: "Set a new password", robots: { index: false } };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  return <ResetForm token={t || ""} />;
}
