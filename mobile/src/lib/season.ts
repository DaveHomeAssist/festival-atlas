/**
 * Season-status + date-range helpers, ported verbatim from the web app's
 * app.js (getFestivalGuideMeta / formatRawDateRange) so mobile and web agree.
 */
import type {
  DateRange,
  Festival,
  FestivalGuideMeta,
  Session,
  SeasonStatus,
} from "@/data/types";

const HAPPENING_SOON_DAYS = 21;
const GUIDE_REVIEW_WINDOW_DAYS = 45;

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function todayIso(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseIso(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function daysBetween(fromIso: string, toIso: string): number {
  const from = parseIso(fromIso).getTime();
  const to = parseIso(toIso).getTime();
  return Math.round((to - from) / 86400000);
}

function formatDateOnly(
  iso: string,
  opts: { month: "short"; day: "numeric"; year?: "numeric" } = {
    month: "short",
    day: "numeric",
    year: "numeric",
  }
): string {
  const [y, m, d] = iso.split("-");
  const month = MONTHS_SHORT[Number(m) - 1];
  const day = String(Number(d));
  return opts.year ? `${month} ${day}, ${y}` : `${month} ${day}`;
}

export function formatRawDateRange(range: {
  start: string;
  end: string;
}): string {
  if (!range || !range.start) return "Dates TBD";
  if (range.start === range.end) return formatDateOnly(range.start);

  const s = range.start.split("-");
  const e = range.end.split("-");
  if (s[0] === e[0] && s[1] === e[1]) {
    return `${formatDateOnly(range.start, { month: "short", day: "numeric" })} - ${Number(e[2])}, ${e[0]}`;
  }
  if (s[0] === e[0]) {
    return `${formatDateOnly(range.start, { month: "short", day: "numeric" })} - ${formatDateOnly(range.end, { month: "short", day: "numeric" })}, ${e[0]}`;
  }
  return `${formatDateOnly(range.start)} - ${formatDateOnly(range.end)}`;
}

export function getDateRange(sessions: Session[]): DateRange {
  const dates = sessions
    .map((s) => s.date)
    .filter(Boolean)
    .sort();

  if (!dates.length) {
    return { start: "", end: "", count: 0, years: [], label: "Dates TBD" };
  }

  const years: string[] = [];
  dates.forEach((date) => {
    const year = date.slice(0, 4);
    if (!years.includes(year)) years.push(year);
  });

  const start = dates[0];
  const end = dates[dates.length - 1];
  return {
    start,
    end,
    count: dates.length,
    years,
    label: formatRawDateRange({ start, end }),
  };
}

export interface GuideMetaContext {
  isVisited: boolean;
  isOnRoute: boolean;
  now?: Date;
}

export function getGuideMeta(
  festival: Festival,
  sessions: Session[],
  ctx: GuideMetaContext
): FestivalGuideMeta {
  const range = getDateRange(sessions);
  const today = todayIso(ctx.now);
  const daysUntilStart = range.start ? daysBetween(today, range.start) : null;

  let seasonStatus: SeasonStatus = "dates-tbd";
  let seasonLabel = "Dates TBD";
  if (range.start && range.end) {
    if (range.end < today) {
      seasonStatus = "past";
      seasonLabel = "Past";
    } else if (range.start <= today && range.end >= today) {
      seasonStatus = "happening-now";
      seasonLabel = "Happening now";
    } else if (daysUntilStart !== null && daysUntilStart <= HAPPENING_SOON_DAYS) {
      seasonStatus = "happening-soon";
      seasonLabel = "Happening soon";
    } else {
      seasonStatus = "upcoming";
      seasonLabel = "Upcoming";
    }
  }

  const reviewAgeDays = festival.lastReviewed
    ? daysBetween(festival.lastReviewed, today)
    : null;
  const has2026 = range.years.includes("2026");
  const sourceIsFresh =
    reviewAgeDays === null || reviewAgeDays <= GUIDE_REVIEW_WINDOW_DAYS;
  const hasNextConfirmed = Boolean(range.start && range.start > today);

  let dataStatus = "source-linked";
  let dataLabel = "Source linked";
  if (!festival.officialUrl) {
    dataStatus = "needs-review";
    dataLabel = "Needs source";
  } else if (!range.count) {
    dataStatus = "needs-review";
    dataLabel = "Needs dates";
  } else if (festival.dateConfidence === "outreach-review") {
    dataStatus = "needs-review";
    dataLabel = "Review ops source";
  } else if (!has2026 && hasNextConfirmed && sourceIsFresh) {
    dataStatus = "next-confirmed";
    dataLabel = "Next date confirmed";
  } else if (!has2026) {
    dataStatus = "needs-review";
    dataLabel = "Needs 2026 review";
  } else if (reviewAgeDays !== null && reviewAgeDays > GUIDE_REVIEW_WINDOW_DAYS) {
    dataStatus = "needs-recheck";
    dataLabel = "Recheck source";
  }

  let planningStatus = "Scout";
  if (ctx.isVisited) planningStatus = "Attended";
  else if (ctx.isOnRoute) planningStatus = "On route";
  else if (seasonStatus === "happening-now" || seasonStatus === "happening-soon")
    planningStatus = "Needs decision";
  else if (dataStatus === "needs-review" || dataStatus === "needs-recheck")
    planningStatus = "Needs review";

  return {
    dateStart: range.start,
    dateEnd: range.end,
    dateCount: range.count,
    dateRangeLabel: range.label,
    seasonStatus,
    seasonLabel,
    dataStatus,
    dataLabel,
    planningStatus,
    officialUrl: festival.officialUrl || "",
    lastReviewed: festival.lastReviewed || "",
    reviewAgeDays,
    sourceNote: festival.sourceNote || "",
    dateConfidence:
      festival.dateConfidence ||
      (dataStatus === "next-confirmed" ? "next-confirmed" : "official"),
  };
}
