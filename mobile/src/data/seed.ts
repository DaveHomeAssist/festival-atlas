/** Bundled canonical seed (generated from the web app — see scripts/generate-seed.cjs). */
import festivalsJson from "./festivals.json";
import scheduleJson from "./schedule.json";
import type { Festival, Session } from "./types";

export const FESTIVALS = festivalsJson as Festival[];
export const SCHEDULE = scheduleJson as Record<string, Session[]>;

const BY_ID: Record<string, Festival> = Object.fromEntries(
  FESTIVALS.map((f) => [f.id, f])
);

export function getFestival(id: string): Festival | undefined {
  return BY_ID[id];
}

export function getSessions(id: string): Session[] {
  return SCHEDULE[id] ?? [];
}
