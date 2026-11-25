import Quiz from "./Quiz";
import { turnstileSiteKey } from "@/lib/turnstile";
import { TUTOR_FREE_PER_WEEK } from "@/config";

export const dynamic = "force-dynamic";

export const metadata = { title: "Free VTNE diagnostic" };

export default function QuizPage() {
  return <Quiz siteKey={turnstileSiteKey()} freePerWeek={TUTOR_FREE_PER_WEEK} />;
}
