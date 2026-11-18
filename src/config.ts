// Brand and buddy settings. Change these in one place.
export const BRAND_NAME = "Vet Tech Study Buddy"; // placeholder until the final name is chosen
export const BUDDY_NAME = "Sara";
export const FOUNDER_LINE =
  "Every question is written and reviewed by a veterinary technician with 20 years in the field.";

// Days after the exam date to ask how it went. AAVSB posts scores in the MyAAVSB portal within about three days.
export const OUTCOME_CHECK_DAYS_AFTER = 4;
export const OUTCOME_REMINDER_DAYS_AFTER_FIRST = 7;
// If the student hasn't booked a date, ask again this many days after sign-up.
export const DATE_CHECK_DAYS_AFTER_SIGNUP = 14;

export const TRADEMARK_NOTE =
  "Not affiliated with or endorsed by the AAVSB. VTNE® is a registered trademark of the American Association of Veterinary State Boards.";

export function appUrl(): string {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

// Voice study sessions with Sara (ElevenLabs agent). Each session is capped at 10 minutes on the agent itself.
export const VOICE_SESSIONS_PER_DAY = Number(process.env.VOICE_SESSIONS_PER_DAY || 6); // abuse guard; minutes are the real limit
export const VOICE_SESSION_MINUTES = 10;

// ===== Plans =====
export type PlanId = "exam_pass" | "final_stretch" | "retake_pass" | "extra_voice";
export interface Plan {
  id: PlanId;
  name: string;
  priceCents: number;
  foundingPriceCents?: number;
  accessDays: number; // 0 = no study access (voice add-on)
  voiceMinutes: number;
  blurb: string;
  features: string[];
}
export const PLANS: Record<PlanId, Plan> = {
  exam_pass: {
    id: "exam_pass",
    name: "Exam Pass",
    priceCents: 9900,
    foundingPriceCents: 6900,
    accessDays: 90,
    voiceMinutes: 300,
    blurb: "Everything you need to get ready, for 90 days.",
    features: [
      "Full question bank with explanations",
      "Timed full-length practice exams",
      "Unlimited text chat with Sara",
      "5 hours of voice study with Sara",
      "Readiness score and a plan that adjusts",
      "Pass guarantee",
    ],
  },
  final_stretch: {
    id: "final_stretch",
    name: "Final Stretch",
    priceCents: 4900,
    accessDays: 30,
    voiceMinutes: 100,
    blurb: "Starting late? 30 days of focused prep.",
    features: ["Everything in the Exam Pass for 30 days", "100 voice minutes with Sara"],
  },
  retake_pass: {
    id: "retake_pass",
    name: "Retake Pass",
    priceCents: 5900,
    accessDays: 60,
    voiceMinutes: 200,
    blurb: "Didn't pass? Let's build on your score report.",
    features: ["Everything in the Exam Pass for 60 days", "200 voice minutes with Sara", "Plan built around your weakest areas"],
  },
  extra_voice: {
    id: "extra_voice",
    name: "Extra voice time",
    priceCents: 900,
    accessDays: 0,
    voiceMinutes: 60,
    blurb: "60 more minutes with Sara.",
    features: ["60 voice minutes, no expiry"],
  },
};
export const FOUNDING_LIMIT = Number(process.env.FOUNDING_LIMIT || 100);
// Days a bought pass can wait before it must be started.
export const ACTIVATE_WITHIN_DAYS = 365;
// Free accounts: voice minutes on sign-up and practice questions per day.
export const FREE_VOICE_MINUTES = 10;
export const FREE_DAILY_PRACTICE = Number(process.env.FREE_DAILY_PRACTICE || 10);
// Practice exam pacing: the VTNE gives about 72 seconds per question.
export const EXAM_SECONDS_PER_QUESTION = 72;
export const EXAM_MAX_QUESTIONS = 150;
export const SESSION_COOKIE = "vtsb_session";
export const ADMIN_COOKIE = "vtsb_admin";

export const money = (cents: number) => `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`;
// "Ask Sara why": focused text chats about one question.
export const WHY_FREE_PER_DAY = Number(process.env.WHY_FREE_PER_DAY || 3);
export const WHY_PASS_PER_DAY = Number(process.env.WHY_PASS_PER_DAY || 40);
export const WHY_MAX_STUDENT_TURNS = 8;
export const WHY_IDLE_SECONDS = 180;
