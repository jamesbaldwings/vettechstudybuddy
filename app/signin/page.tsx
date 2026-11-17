import { redirect } from "next/navigation";
import { currentLead, safeNext } from "@/lib/auth";
import SignInForm from "./SignInForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in" };

export default async function SignIn({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await currentLead()) redirect(safeNext(next));
  return <SignInForm next={safeNext(next)} />;
}
