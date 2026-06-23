/**
 * Device-calendar integration (MOBILE_APP_SPEC §5.4 — replaces the web .ics
 * export). Adds a festival's sessions to the user's default calendar.
 */
import * as Calendar from "expo-calendar";
import { Platform } from "react-native";
import type { Festival, Session } from "@/data/types";

export async function requestCalendarPermission(): Promise<boolean> {
  const { granted } = await Calendar.requestCalendarPermissionsAsync();
  return granted;
}

async function getWritableCalendarId(): Promise<string | null> {
  if (Platform.OS === "ios") {
    const def = await Calendar.getDefaultCalendarAsync().catch(() => null);
    if (def?.id) return def.id;
  }
  const calendars = await Calendar.getCalendarsAsync(
    Calendar.EntityTypes.EVENT
  );
  const writable = calendars.find((c) => c.allowsModifications);
  return writable?.id ?? null;
}

/** Creates an all-day event per session day. Returns the count created. */
export async function addSessionsToCalendar(
  festival: Festival,
  sessions: Session[]
): Promise<number> {
  const granted = await requestCalendarPermission();
  if (!granted) throw new Error("Calendar permission denied");

  const calendarId = await getWritableCalendarId();
  if (!calendarId) throw new Error("No writable calendar found");

  let created = 0;
  for (const session of sessions) {
    if (!session.date) continue;
    const [y, m, d] = session.date.split("-").map(Number);
    const start = new Date(y, m - 1, d, 12, 0, 0);
    const end = new Date(y, m - 1, d, 23, 0, 0);
    await Calendar.createEventAsync(calendarId, {
      title: `${festival.name} — ${session.label}`,
      notes: festival.officialUrl
        ? `Official: ${festival.officialUrl}\nVerify dates before booking.`
        : "Verify dates with the official source before booking.",
      location: festival.city,
      startDate: start,
      endDate: end,
      allDay: true,
    });
    created += 1;
  }
  return created;
}
