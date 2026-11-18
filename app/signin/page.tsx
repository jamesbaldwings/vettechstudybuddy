import { redirect } from "next/navigation";
import { currentLead, safeNext } from "@/lib/auth";
import SignInForm from "./SignInForm";
import { turnstileSiteKey } from "@/lib/turnstile";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in" };

export default async function SignIn({ searchParams }: { searchParams: Promise<{ next?: string; mode?: string }> }) {
  const { next, mode } = await searchParams;
  if (await currentLead()) redirect(safeNext(next));
  const m = mode === "create" || mode === "forgot" ? mode : "signin";
  return <SignInForm next={safeNext(next)} initialMode={m} siteKey={turnstileSiteKey()} />;
}
