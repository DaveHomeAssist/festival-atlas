/**
 * Generated monogram marks (parity with the web app's logos.js): derive a short
 * initialism from the festival name and pair it with the brand color. No stored
 * brand art — a v1 decision in MOBILE_APP_SPEC §14.
 */
import type { Festival } from "@/data/types";

const STOPWORDS = new Set([
  "the", "of", "and", "at", "music", "festival", "fest", "arts", "valley", "a",
]);

export function monogram(festival: Pick<Festival, "name" | "searchMeta">): string {
  const source = festival.searchMeta?.localName || festival.name;
  const words = source
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !STOPWORDS.has(w.toLowerCase()));

  if (!words.length) {
    return source.slice(0, 2).toUpperCase();
  }
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return (words[0][0] + words[1][0]).toUpperCase();
}
