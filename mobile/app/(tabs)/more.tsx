import React, { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Constants from "expo-constants";
import { seasonSummary } from "@/store/selectors";
import { useStore } from "@/store/store";
import { colors, radius, space } from "@/theme/tokens";

export default function MoreScreen() {
  const { festivals, metaFor, exportBackup, importBackup, resetData, visits, journal } =
    useStore();
  const [lastAction, setLastAction] = useState<string>("");

  const summary = useMemo(
    () => seasonSummary(festivals, metaFor),
    [festivals, metaFor]
  );

  const needsReview = festivals
    .map((f) => ({ f, meta: metaFor(f.id) }))
    .filter(
      ({ meta }) =>
        meta.dataStatus === "needs-review" || meta.dataStatus === "needs-recheck"
    );

  async function onExport() {
    const payload = await exportBackup();
    const keys = Object.keys(payload).length;
    setLastAction(
      `Exported ${keys} data key${keys === 1 ? "" : "s"} (${visits.length} visits, ${journal.length} sets). On device, this hands to the OS share sheet.`
    );
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
});
