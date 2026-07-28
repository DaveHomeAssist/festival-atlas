import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import Constants from "expo-constants";
import {
  cancelAllReminders,
  requestNotificationPermission,
  syncReminders,
  type ReminderTarget,
} from "@/lib/notifications";
import { shareJsonPayload } from "@/lib/share";
import { KEYS } from "@/store/keys";
import { readJson, writeJson } from "@/store/storage";
import { seasonSummary } from "@/store/selectors";
import { useStore } from "@/store/store";
import { colors, radius, space } from "@/theme/tokens";

export default function MoreScreen() {
  const {
    festivals,
    metaFor,
    exportBackup,
    importBackup,
    resetData,
    visits,
    journal,
    shortlist,
    trip,
  } = useStore();
  const [lastAction, setLastAction] = useState<string>("");
  const [remindersOn, setRemindersOn] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void readJson<boolean>(KEYS.notificationsEnabled, false).then(setRemindersOn);
  }, []);

  const summary = useMemo(
    () => seasonSummary(festivals, metaFor),
    [festivals, metaFor]
  );

  // Reminder targets = shortlisted + routed festivals with a future start date.
  const reminderTargets = useMemo<ReminderTarget[]>(() => {
    const ids = new Set([...shortlist, ...trip.parkIds]);
    return [...ids]
      .map((id) => {
        const festival = festivals.find((f) => f.id === id);
        const meta = metaFor(id);
        return festival && meta.dateStart
          ? { festivalId: id, name: festival.name, startIso: meta.dateStart }
          : null;
      })
      .filter(Boolean) as ReminderTarget[];
  }, [shortlist, trip.parkIds, festivals, metaFor]);

  async function onToggleReminders(next: boolean) {
    setBusy(true);
    try {
      if (next) {
        const granted = await requestNotificationPermission();
        if (!granted) {
          Alert.alert("Notifications off", "Permission was not granted.");
          return;
        }
        const count = await syncReminders(reminderTargets);
        setRemindersOn(true);
        await writeJson(KEYS.notificationsEnabled, true);
        setLastAction(
          `Scheduled ${count} reminder${count === 1 ? "" : "s"} across ${reminderTargets.length} festival${reminderTargets.length === 1 ? "" : "s"}.`
        );
      } else {
        await cancelAllReminders();
        setRemindersOn(false);
        await writeJson(KEYS.notificationsEnabled, false);
        setLastAction("Reminders cancelled.");
      }
    } catch (err) {
      Alert.alert("Reminder error", (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onResyncReminders() {
    setBusy(true);
    try {
      const count = await syncReminders(reminderTargets);
      setLastAction(`Re-synced ${count} reminder${count === 1 ? "" : "s"}.`);
    } catch (err) {
      Alert.alert("Reminder error", (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const needsReview = festivals
    .map((f) => ({ f, meta: metaFor(f.id) }))
    .filter(
      ({ meta }) =>
        meta.dataStatus === "needs-review" || meta.dataStatus === "needs-recheck"
    );

  async function onExport() {
    try {
      const payload = await exportBackup();
      const keys = Object.keys(payload).length;
      const shared = await shareJsonPayload("festival-atlas-backup.json", {
        kind: "festival-atlas-backup",
        version: 1,
        exportedAt: new Date().toISOString(),
        data: payload,
      });
      setLastAction(
        shared
          ? `Exported ${keys} data key${keys === 1 ? "" : "s"} (${visits.length} visits, ${journal.length} sets) to the share sheet.`
          : `Backup written, but sharing is unavailable on this device.`
      );
    } catch (err) {
      Alert.alert("Export failed", (err as Error).message);
    }
  }

  function onReset() {
    Alert.alert(
      "Reset local data?",
      "This clears visits, route, shortlist, and journal on this device. The seeded festival guide stays.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            await resetData();
            setLastAction("Local data reset to seed.");
          },
        },
      ]
    );
  }

  async function onImportDemo() {
    // Demonstrates the round-trip; on device this reads a picked backup file.
    const payload = await exportBackup();
    const count = await importBackup(payload);
    setLastAction(`Re-imported ${count} key${count === 1 ? "" : "s"} from backup.`);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Section title="Guide freshness">
        <Row label="Festivals" value={String(summary.total)} />
        <Row label="Happening now / soon" value={`${summary.happeningNow} / ${summary.happeningSoon}`} />
        <Row label="Upcoming" value={String(summary.upcoming)} />
        <Row label="Source rechecks queued" value={String(summary.needsReview)} />
        <Row label="Seed reviewed" value={summary.lastReviewed || "TBD"} />
      </Section>

      <Section title="Reminders">
        <View style={styles.toggleRow}>
          <View style={styles.toggleCopy}>
            <Text style={styles.toggleLabel}>Date-approaching reminders</Text>
            <Text style={styles.muted}>
              Local notifications 7 and 1 days before shortlisted or routed
              festivals. {reminderTargets.length} festival
              {reminderTargets.length === 1 ? "" : "s"} eligible.
            </Text>
          </View>
          <Switch value={remindersOn} onValueChange={onToggleReminders} disabled={busy} />
        </View>
        {remindersOn ? (
          <Pressable style={styles.resync} onPress={onResyncReminders} disabled={busy}>
            <Text style={styles.resyncText}>Re-sync from current shortlist + route</Text>
          </Pressable>
        ) : null}
      </Section>

      <Section title="Source audit queue">
        {needsReview.length === 0 ? (
          <Text style={styles.muted}>Every seeded source is current.</Text>
        ) : (
          needsReview.slice(0, 12).map(({ f, meta }) => (
            <View key={f.id} style={styles.auditRow}>
              <Text style={styles.auditName} numberOfLines={1}>
                {f.name}
              </Text>
              <Text style={styles.auditFlag}>{meta.dataLabel}</Text>
            </View>
          ))
        )}
      </Section>

      <Section title="Local data">
        <Text style={styles.muted}>
          All your data lives on this device under the FA: keys — the same shape
          the web app uses, so backups round-trip between them.
        </Text>
        <View style={styles.actions}>
          <Btn label="Export backup" onPress={onExport} />
          <Btn label="Restore (round-trip)" onPress={onImportDemo} />
          <Btn label="Reset to seed" tint={colors.red} onPress={onReset} />
        </View>
        {lastAction ? <Text style={styles.action}>{lastAction}</Text> : null}
      </Section>

      <Section title="About">
        <Text style={styles.muted}>
          Festival Atlas · local-first, no account. Dates and prices are
          source-backed but not authoritative — verify the official source
          before booking.
        </Text>
        <Text style={styles.version}>
          v{Constants.expoConfig?.version ?? "0.1.0"} · seed {summary.lastReviewed || "TBD"}
        </Text>
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
      {children}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function Btn({
  label,
  onPress,
  tint = colors.navy,
}: {
  label: string;
  onPress: () => void;
  tint?: string;
}) {
  return (
    <Pressable style={[styles.btn, { backgroundColor: tint }]} onPress={onPress}>
      <Text style={styles.btnText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surfaceMuted },
  content: { padding: space.md, paddingBottom: 40 },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 11,
    letterSpacing: 1.6,
    fontWeight: "800",
    color: colors.textMuted,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowLabel: { fontSize: 14, color: colors.textSecondary },
  rowValue: { fontSize: 14, fontWeight: "800", color: colors.textPrimary },
  auditRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 7,
    gap: 12,
  },
  auditName: { flex: 1, fontSize: 14, color: colors.textPrimary },
  auditFlag: { fontSize: 12, color: colors.red, fontWeight: "700" },
  muted: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14 },
  btn: { borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 10 },
  btnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 13 },
  action: { marginTop: 12, fontSize: 13, color: colors.teal, fontWeight: "600" },
  version: { marginTop: 12, fontSize: 12, color: colors.textMuted },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  toggleCopy: { flex: 1 },
  toggleLabel: { fontSize: 15, fontWeight: "700", color: colors.textPrimary, marginBottom: 4 },
  resync: {
    marginTop: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingVertical: 10,
    alignItems: "center",
  },
  resyncText: { fontSize: 13, fontWeight: "700", color: colors.textPrimary },
});
