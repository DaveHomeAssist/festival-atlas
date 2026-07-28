/**
 * Sharing (MOBILE_APP_SPEC §5.5 — delivers the web `tripShare` flag) and the
 * backup export hand-off. Trip text goes through the OS share sheet; structured
 * payloads are written to a temp file and shared as an attachment.
 */
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Share } from "react-native";
import type { ActiveTrip, Festival } from "@/data/types";

/** Human-readable trip summary via the native share sheet. */
export async function shareTripSummary(
  trip: ActiveTrip,
  stops: Festival[],
  dateLabelFor: (id: string) => string
): Promise<void> {
  const lines = stops.map(
    (f, i) => `${i + 1}. ${f.name} — ${f.city} (${dateLabelFor(f.id)})`
  );
  const message = [
    `🎪 ${trip.title}`,
    "",
    ...lines,
    "",
    trip.notes ? `Notes: ${trip.notes}` : "",
    "Planned with Festival Atlas — verify official sources before booking.",
  ]
    .filter(Boolean)
    .join("\n");

  await Share.share({ title: trip.title, message });
}

/**
 * Writes a JSON payload to a cache file and opens the share sheet so the user
 * can save/send it. Used for trip export and full data backup.
 */
export async function shareJsonPayload(
  filename: string,
  payload: unknown
): Promise<boolean> {
  const available = await Sharing.isAvailableAsync();
  const uri = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(uri, JSON.stringify(payload, null, 2), {
    encoding: FileSystem.EncodingType.UTF8,
  });
  if (!available) return false;
  await Sharing.shareAsync(uri, {
    mimeType: "application/json",
    dialogTitle: filename,
    UTI: "public.json",
  });
  return true;
}
