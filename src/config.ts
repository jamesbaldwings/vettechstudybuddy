// Brand and buddy settings. Change these in one place.
export const BRAND_NAME = "Vet Tech Study Buddy"; // placeholder until the final name is chosen
export const BUDDY_NAME = "Sara";
export const FOUNDER_LINE =
  "Every question is reviewed and approved by veterinary technicians and instructors before it reaches you.";

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
export type PlanId = "exam_pass" | "final_stretch" | "retake_pass" | "extra_voice" | "semester_pass";
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
      "Unlimited practice, with an explanation for every question",
      "Ask Sara why on any question, as much as you need",
      "Timed practice exams weighted like the VTNE",
      "5 hours of voice study with Sara",
      "Readiness score that counts understanding, not lucky guesses",
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
    features: ["Everything in the Exam Pass, for 30 days", "100 voice minutes with Sara"],
  },
  retake_pass: {
    id: "retake_pass",
    name: "Retake Pass",
    priceCents: 5900,
    accessDays: 60,
    voiceMinutes: 200,
    blurb: "Didn't pass? Let's build on your score report.",
    features: ["Everything in the Exam Pass, for 60 days", "200 voice minutes with Sara", "Practice aimed at your weakest areas"],
  },
  semester_pass: {
    id: "semester_pass",
    name: "Semester Pass",
    priceCents: Number(process.env.SEMESTER_PASS_CENTS || 2900),
    accessDays: Number(process.env.SEMESTER_PASS_DAYS || 150),
    voiceMinutes: Number(process.env.SEMESTER_PASS_VOICE_MINUTES || 60),
    blurb: "Unlimited Tutor Mode for your whole semester.",
    features: [
      "Unlimited Tutor Mode in any vet tech course",
      "Text tutoring, plus voice minutes to talk it through",
      "Recaps and practice questions saved for every session",
      "Starts the day you buy it",
    ],
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

export const money = (cents: number) => `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`;
// "Ask Sara why": focused text chats about one question.
export const WHY_FREE_PER_DAY = Number(process.env.WHY_FREE_PER_DAY || 3);
export const WHY_PASS_PER_DAY = Number(process.env.WHY_PASS_PER_DAY || 40);
export const WHY_MAX_STUDENT_TURNS = 8;
export const WHY_IDLE_SECONDS = 180;

// ===== Schools =====
// License packages (usually invoiced) and add-on seats sold in blocks of 10.
export const SCHOOL_PACKAGES = [
  { seats: 25, priceCents: 150000 },
  { seats: 50, priceCents: 250000 },
  { seats: 100, priceCents: 450000 },
];
export const SCHOOL_SEAT_BLOCK = 10;
// Per-seat price by order size (seats in this order).
export const SCHOOL_SEAT_TIERS = [
  { min: 100, centsPerSeat: 4500 },
  { min: 50, centsPerSeat: 5000 },
  { min: 30, centsPerSeat: 6000 },
  { min: 10, centsPerSeat: 6500 },
];
export const schoolSeatPrice = (seats: number) =>
  (SCHOOL_SEAT_TIERS.find((t) => seats >= t.min) ?? SCHOOL_SEAT_TIERS[SCHOOL_SEAT_TIERS.length - 1]).centsPerSeat;

// Plans that only unlock Tutor Mode (not VTNE practice exams or the VTNE pass features).
export const TUTOR_ONLY_PLANS: PlanId[] = ["semester_pass"];
// Plans that start the day they're bought instead of waiting for Start.
export const STARTS_AT_PURCHASE: PlanId[] = ["semester_pass", "extra_voice"];

// ===== Tutor Mode =====
// Free accounts get a few tutor sessions a week (weeks start Monday, Central time).
export const TUTOR_FREE_PER_WEEK = Number(process.env.TUTOR_FREE_PER_WEEK || 3);
// A start that repeats an unused session from the last few minutes gets that session back instead of a new one.
export const TUTOR_START_REUSE_MINUTES = 10;
export const TUTOR_MATERIAL_MAX = 6000; // characters of pasted notes
export const TUTOR_REOPEN_HOURS = 4; // an unfinished session can be picked back up this long after its last message
// "You've mastered N topics": shown as a gentle path toward the VTNE.
export const TUTOR_ON_TRACK_TOPICS = Number(process.env.TUTOR_ON_TRACK_TOPICS || 40);
// Early-warning flag for schools: this many failed checks in 14 days, with fewer passed than failed.
export const TUTOR_FLAG_FAILED_CHECKS = 4;

export type VtneDomain = "pharm" | "surgery" | "dentistry" | "lab" | "nursing" | "imaging" | "anesthesia" | "ecc" | "pain" | "communication";
// Vet tech course subjects. Each maps to the VTNE domain it feeds, so Tutor Mode struggles show up in the VTNE plan.
export const SUBJECTS: { id: string; name: string; domain: VtneDomain }[] = [
  { id: "anatomy_physiology", name: "Anatomy & Physiology", domain: "nursing" },
  { id: "pharmacology", name: "Pharmacology", domain: "pharm" },
  { id: "vet_math", name: "Dosage Calculations & Vet Math", domain: "pharm" },
  { id: "anesthesia", name: "Anesthesia", domain: "anesthesia" },
  { id: "surgical_nursing", name: "Surgical Nursing", domain: "surgery" },
  { id: "clinical_pathology", name: "Clinical Pathology & Lab", domain: "lab" },
  { id: "parasitology", name: "Parasitology", domain: "lab" },
  { id: "microbiology", name: "Microbiology", domain: "lab" },
  { id: "imaging", name: "Diagnostic Imaging", domain: "imaging" },
  { id: "dentistry", name: "Dentistry", domain: "dentistry" },
  { id: "animal_nursing", name: "Animal Nursing & Care", domain: "nursing" },
  { id: "nutrition", name: "Nutrition", domain: "nursing" },
  { id: "large_animal", name: "Large Animal Nursing", domain: "nursing" },
  { id: "lab_animal_exotics", name: "Lab Animals & Exotics", domain: "nursing" },
  { id: "ecc", name: "Emergency & Critical Care", domain: "ecc" },
  { id: "pain", name: "Pain Management", domain: "pain" },
  { id: "behavior", name: "Animal Behavior", domain: "communication" },
  { id: "communication", name: "Client Communication & Practice", domain: "communication" },
];
export const subjectById = (id: string) => SUBJECTS.find((s) => s.id === id) ?? null;
