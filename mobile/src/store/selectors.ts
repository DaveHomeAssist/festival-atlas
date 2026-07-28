/** Pure derivations over the seed + per-festival meta (parity with app.js summaries). */
import type { Festival, FestivalGuideMeta, SeasonStatus } from "@/data/types";

export interface SeasonSummary {
  total: number;
  happeningNow: number;
  happeningSoon: number;
  upcoming: number;
  past: number;
  datesTbd: number;
  needsReview: number;
  lastReviewed: string;
}

type MetaFn = (id: string) => FestivalGuideMeta;

export function seasonSummary(festivals: Festival[], metaFor: MetaFn): SeasonSummary {
  return festivals.reduce<SeasonSummary>(
    (summary, festival) => {
      const meta = metaFor(festival.id);
      summary.total += 1;
      if (meta.seasonStatus === "happening-now") summary.happeningNow += 1;
      if (meta.seasonStatus === "happening-soon") summary.happeningSoon += 1;
      if (meta.seasonStatus === "upcoming") summary.upcoming += 1;
      if (meta.seasonStatus === "past") summary.past += 1;
      if (meta.seasonStatus === "dates-tbd") summary.datesTbd += 1;
      if (meta.dataStatus === "needs-review" || meta.dataStatus === "needs-recheck")
        summary.needsReview += 1;
      if (
        !summary.lastReviewed ||
        (meta.lastReviewed && meta.lastReviewed < summary.lastReviewed)
      ) {
        summary.lastReviewed = meta.lastReviewed;
      }
      return summary;
    },
    {
      total: 0,
      happeningNow: 0,
      happeningSoon: 0,
      upcoming: 0,
      past: 0,
      datesTbd: 0,
      needsReview: 0,
      lastReviewed: "",
    }
  );
}

const SOON: SeasonStatus[] = ["happening-now", "happening-soon"];

export function happeningSoon(
  festivals: Festival[],
  metaFor: MetaFn,
  isVisited: (id: string) => boolean,
  limit = 4
): Festival[] {
  return festivals
    .map((f) => ({ f, meta: metaFor(f.id) }))
    .filter(
      ({ f, meta }) =>
        !isVisited(f.id) && SOON.includes(meta.seasonStatus) && meta.dateStart
    )
    .sort((a, b) => a.meta.dateStart.localeCompare(b.meta.dateStart))
    .slice(0, limit)
    .map(({ f }) => f);
}

const TIER_RANK: Record<string, number> = { S: 0, A: 1, B: 2 };

export function nextTargets(
  festivals: Festival[],
  metaFor: MetaFn,
  isVisited: (id: string) => boolean,
  isOnRoute: (id: string) => boolean,
  limit = 4
): Festival[] {
  return festivals
    .filter((f) => !isVisited(f.id) && !isOnRoute(f.id))
    .map((f) => ({ f, meta: metaFor(f.id) }))
    .filter(({ meta }) => meta.seasonStatus !== "past")
    .sort((a, b) => {
      const tier = (TIER_RANK[a.f.tier] ?? 3) - (TIER_RANK[b.f.tier] ?? 3);
      if (tier !== 0) return tier;
      const aStart = a.meta.dateStart || "9999";
      const bStart = b.meta.dateStart || "9999";
      return aStart.localeCompare(bStart);
    })
    .slice(0, limit)
    .map(({ f }) => f);
}
