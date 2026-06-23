/**
 * Local push reminders (MOBILE_APP_SPEC §6). All scheduling is on-device — no
 * server, no account. We schedule date-approaching reminders for the festivals
 * the user cares about (shortlist + route).
 */
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export interface ReminderTarget {
  festivalId: string;
  name: string;
  startIso: string; // yyyy-mm-dd of the festival's first day
}

// Foreground presentation: show the banner even while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  const settings = await Notifications.getPermissionsAsync();
  let granted =
    settings.granted ||
    settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  if (!granted) {
    const req = await Notifications.requestPermissionsAsync();
    granted = req.granted;
  }
  if (granted && Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("reminders", {
      name: "Festival reminders",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  return granted;
}

/** Reminder offsets (days before the festival starts) and the local hour to fire. */
const OFFSET_DAYS = [7, 1];
const FIRE_HOUR = 9;

function triggerDate(startIso: string, daysBefore: number): Date | null {
  const [y, m, d] = startIso.split("-").map(Number);
  const date = new Date(y, m - 1, d, FIRE_HOUR, 0, 0, 0);
  date.setDate(date.getDate() - daysBefore);
  return date.getTime() > Date.now() ? date : null;
}

/**
 * Cancels all previously scheduled reminders and re-schedules from scratch for
 * the supplied targets. Idempotent — safe to call whenever shortlist/route changes.
 */
export async function syncReminders(targets: ReminderTarget[]): Promise<number> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  let scheduled = 0;
  for (const target of targets) {
    for (const daysBefore of OFFSET_DAYS) {
      const when = triggerDate(target.startIso, daysBefore);
      if (!when) continue;
      await Notifications.scheduleNotificationAsync({
        content: {
          title:
            daysBefore === 1
              ? `${target.name} is tomorrow`
              : `${target.name} in ${daysBefore} days`,
          body: "Check tickets and travel — verify the official source before booking.",
          data: { festivalId: target.festivalId },
        },
        trigger:
          Platform.OS === "android"
            ? { channelId: "reminders", date: when }
            : { date: when },
      });
      scheduled += 1;
    }
  }
  return scheduled;
}

export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
