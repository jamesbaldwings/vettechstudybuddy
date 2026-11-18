import Quiz from "./Quiz";
import { turnstileSiteKey } from "@/lib/turnstile";

export const dynamic = "force-dynamic";

export const metadata = { title: "Free VTNE diagnostic" };

export default function QuizPage() {
  return <Quiz siteKey={turnstileSiteKey()} />;
}
