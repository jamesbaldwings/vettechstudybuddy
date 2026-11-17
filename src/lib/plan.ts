import { DomainScore, rankWeakDomains } from "@/lib/scoring";
import { addDays, daysBetween, lastDayOfMonth, prettyDate } from "@/lib/dates";

export interface PlanWeek {
  label: string;
  focus: string[];
  tasks: string[];
}

export interface StudyPlan {
  headline: string;
  daysLeft: number | null;
  approximate: boolean;
  weeks: PlanWeek[];
  anxietyTip: string;
}

export function buildPlan(opts: {
  domainScores: DomainScore[];
  examDate: string | null;
  targetMonth: string | null;
  today: string;
  confidence: number | null;
}): StudyPlan {
  const ranked = rankWeakDomains(opts.domainScores);
  const examish = opts.examDate ?? (opts.targetMonth ? addDays(opts.targetMonth, 14) : null);
  const approximate = !opts.examDate;
  const daysLeft = examish ? daysBetween(opts.today, examish) : null;

  const anxietyTip =
    (opts.confidence ?? 3) <= 2
      ? "Feeling nervous is the most common thing I hear, and it's beatable. The fix is familiarity: we'll do full-length, timed practice exams so test day feels like something you've already done."
      : "Confidence is great. Let's back it with proof: a couple of full-length, timed practice exams before test day so nothing surprises you.";

  if (daysLeft === null) {
    return {
      headline: "Pick a target date and I'll map out every week for you.",
      daysLeft: null,
      approximate: true,
      weeks: defaultWeeks(ranked, 8),
      anxietyTip,
    };
  }

  if (daysLeft <= 0) {
    return {
      headline: "Your exam date has passed. Tell me how it went and I'll help with what's next.",
      daysLeft,
      approximate,
      weeks: [],
      anxietyTip,
    };
  }

  if (daysLeft <= 10) {
    const top = ranked.slice(0, 2).map((d) => d.name);
    return {
      headline: `${daysLeft} day${daysLeft === 1 ? "" : "s"} to go. Here's how to use them.`,
      daysLeft,
      approximate,
      weeks: [
        {
          label: "Your final stretch",
          focus: top,
          tasks: [
            `Spend your next two study days on ${top.join(" and ")}. They carry the most points you're likely to miss.`,
            "Take one full-length timed practice exam, then review every miss.",
            "Light review only in the last two days. Sleep beats cramming.",
            "Night before: pack your ID, confirm your test center, and stop studying by dinner.",
          ],
        },
      ],
      anxietyTip,
    };
  }

  const weeks = Math.max(2, Math.floor(daysLeft / 7));
  const plan = defaultWeeks(ranked, weeks);
  return {
    headline: `${weeks} week${weeks === 1 ? "" : "s"} until ${approximate ? "your target month" : prettyDate(examish!)}. Here's your plan.`,
    daysLeft,
    approximate,
    weeks: plan,
    anxietyTip,
  };
}

function defaultWeeks(ranked: ReturnType<typeof rankWeakDomains>, weeks: number): PlanWeek[] {
  const out: PlanWeek[] = [];
  const studyWeeks = weeks >= 3 ? weeks - 2 : weeks - 1;
  const perWeek = studyWeeks >= 5 ? 2 : 3;
  let idx = 0;
  for (let w = 0; w < studyWeeks; w++) {
    const focus: string[] = [];
    for (let k = 0; k < perWeek; k++) {
      focus.push(ranked[idx % ranked.length].name);
      idx++;
    }
    out.push({
      label: `Week ${w + 1}`,
      focus,
      tasks: [
        "About 10 hours this week, spread across most days. Short and steady beats one long session.",
        `Practice questions in ${focus.join(", ")}. Read every explanation, even on the ones you get right.`,
        "End the week by redoing everything you missed.",
      ],
    });
  }
  if (weeks >= 3) {
    out.push({
      label: `Week ${weeks - 1}`,
      focus: ["Mixed review"],
      tasks: [
        "Take a full-length timed practice exam early in the week.",
        "Spend the rest of the week on whatever it shows is weakest.",
      ],
    });
  }
  out.push({
    label: `Week ${weeks}: exam week`,
    focus: ["Taper"],
    tasks: [
      "One last timed practice set early in the week, then light review.",
      "No new material in the last two days.",
      "Rest the day before. Pack your ID and confirm your test center.",
    ],
  });
  return out;
}

export function examLabel(examDate: string | null, targetMonth: string | null): string {
  if (examDate) return prettyDate(examDate);
  if (targetMonth) return `sometime in ${new Date(targetMonth + "T12:00:00Z").toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })}`;
  return "not set";
}

export function outcomeCheckDate(examDate: string | null, targetMonth: string | null, daysAfter: number): string | null {
  if (examDate) return addDays(examDate, daysAfter);
  if (targetMonth) return addDays(lastDayOfMonth(targetMonth), daysAfter);
  return null;
}
