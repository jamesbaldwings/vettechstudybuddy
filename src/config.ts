// Brand and buddy settings. Change these in one place.
export const BRAND_NAME = "Vet Tech Study Buddy"; // placeholder until the final name is chosen
export const BUDDY_NAME = "Scout";
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
