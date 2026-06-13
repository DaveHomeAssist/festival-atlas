/**
 * Storage keys, mirroring the web app's FA: namespace 1:1 so a web-app backup
 * imports without transformation (MOBILE_APP_SPEC §3.3, §9).
 */
export const NAMESPACE = "FA";

export const KEYS = {
  visits: "visits",
  activeTrip: "activeTrip",
  planningNotes: "planningNotes",
  entityScratchpads: "entityScratchpads",
  shortlistFestivalIds: "shortlistFestivalIds",
  festivalJournalEntries: "festivalJournalEntries",
  festivalJournalHistory: "festivalJournalHistory",
  festivalCustomSchedule: "festivalCustomSchedule",
  setkeeperDraft: "setkeeperDraft",
  theme: "theme",
  context: "context",
  sharedTripImports: "sharedTripImports",
} as const;

export type StorageKey = (typeof KEYS)[keyof typeof KEYS];

export function namespaced(key: string): string {
  return `${NAMESPACE}:${key}`;
}
