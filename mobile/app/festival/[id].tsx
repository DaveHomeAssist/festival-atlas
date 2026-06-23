import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Pill, SeasonBadge } from "@/components/Badge";
import { MonogramMark } from "@/components/MonogramMark";
import { getSessions } from "@/data/seed";
import { addSessionsToCalendar } from "@/lib/calendar";
import {
  directionsUrl,
  flightsUrl,
  groundUrl,
  lodgingUrl,
  officialSellerUrl,
} from "@/lib/links";
import { todayIso } from "@/lib/season";
import { useStore } from "@/store/store";
import { colors, radius, space, tierColor } from "@/theme/tokens";

export default function FestivalDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const store = useStore();
  const festival = store.festivals.find((f) => f.id === id);
  const [attendedFlash, setAttendedFlash] = useState(false);

  if (!festival) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingText}>Festival not found.</Text>
      </View>
    );
  }

  const meta = store.metaFor(festival.id);
  const sessions = getSessions(festival.id);
  const onRoute = store.isOnRoute(festival.id);
  const shortlisted = store.isShortlisted(festival.id);
  const visited = store.isVisited(festival.id);

  const open = (url: string) => Linking.openURL(url).catch(() => undefined);

  async function onAddToCalendar() {
    try {
      const count = await addSessionsToCalendar(festival!, sessions);
      Alert.alert(
        "Added to calendar",
        `${count} session${count === 1 ? "" : "s"} added. Verify dates before booking.`
      );
    } catch (err) {
      Alert.alert("Calendar unavailable", (err as Error).message);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: festival.searchMeta.localName }} />

      <View style={styles.header}>
        <MonogramMark festival={festival} size={56} />
        <View style={styles.headerBody}>
          <Text style={styles.name}>{festival.name}</Text>
          <Text style={styles.sub}>
            {festival.genre} · {festival.city}
          </Text>
        </View>
        <View style={[styles.tier, { backgroundColor: tierColor[festival.tier] }]}>
          <Text style={styles.tierText}>{festival.tier}</Text>
        </View>
      </View>

      <View style={styles.badges}>
        <SeasonBadge status={meta.seasonStatus} label={meta.seasonLabel} />
        <Pill label={meta.dateRangeLabel} tint={colors.teal} />
        {meta.planningStatus !== "Scout" ? (
          <Pill label={meta.planningStatus} tint={colors.navy} filled />
        ) : null}
      </View>

      <View style={styles.actionRow}>
        <Action
          label={onRoute ? "On route ✓" : "Add to route"}
          active={onRoute}
          onPress={() =>
            onRoute
              ? store.removeFromRoute(festival.id)
              : store.addToRoute(festival.id)
          }
        />
        <Action
          label={shortlisted ? "★ Shortlisted" : "☆ Shortlist"}
          active={shortlisted}
          onPress={() => store.toggleShortlist(festival.id)}
        />
        <Action
          label={visited ? "Attended ✓" : "Mark attended"}
          active={visited}
          onPress={() => {
            if (visited) {
              store.unmarkAttended(festival.id);
            } else {
              store.markAttended(festival.id, { visitDate: todayIso() });
              setAttendedFlash(true);
              setTimeout(() => setAttendedFlash(false), 1800);
            }
          }}
        />
      </View>
      {attendedFlash ? (
        <Text style={styles.flash}>Logged to your proof wall.</Text>
      ) : null}

      <Text style={styles.body}>{festival.note}</Text>

      <Card title="Tickets">
        <Text style={styles.cardBody}>{festival.ticketApproach}</Text>
        <Pressable style={styles.linkBtn} onPress={() => open(officialSellerUrl(festival))}>
          <Text style={styles.linkBtnText}>Open official seller ↗</Text>
        </Pressable>
        <Text style={styles.caution}>
          Verify dates and prices with the official source before booking.
        </Text>
      </Card>

      <Card title="Getting there">
        <Text style={styles.cardBody}>{festival.transitNote}</Text>
        <View style={styles.linkGrid}>
          <MiniLink label={`✈ ${festival.booking.airportCode || "Flights"}`} onPress={() => open(flightsUrl(festival.booking))} />
          <MiniLink label="🛏 Lodging" onPress={() => open(lodgingUrl(festival.booking))} />
          <MiniLink label="🚌 Ground" onPress={() => open(groundUrl(festival.booking))} />
          <MiniLink label="📍 Directions" onPress={() => open(directionsUrl(festival))} />
        </View>
      </Card>

      {sessions.length ? (
        <Card title={`Sessions · ${meta.dateRangeLabel}`}>
          {sessions.map((s, i) => (
            <View key={`${s.date}-${i}`} style={styles.session}>
              <Text style={styles.sessionDate}>
                {s.weekday} {s.date.slice(5)}
              </Text>
              <Text style={styles.sessionLabel}>
                {s.label}
                {s.headliner ? ` · ${s.headliner}` : ""}
              </Text>
            </View>
          ))}
          <Pressable style={styles.calendarBtn} onPress={onAddToCalendar}>
            <Text style={styles.calendarBtnText}>＋ Add sessions to calendar</Text>
          </Pressable>
        </Card>
      ) : null}

      <Card title="Source">
        <Text style={styles.cardBody}>
          {festival.sourceLabel || "Source"}
          {festival.lastReviewed ? ` · reviewed ${festival.lastReviewed}` : ""}
        </Text>
        {meta.sourceNote ? (
          <Text style={[styles.cardBody, styles.sourceNote]}>{meta.sourceNote}</Text>
        ) : null}
        {meta.dataStatus.startsWith("needs") ? (
          <Pill label={meta.dataLabel} tint={colors.red} />
        ) : (
          <Pill label={meta.dataLabel} tint={colors.now} />
        )}
      </Card>

      <Pressable style={styles.close} onPress={() => router.back()}>
        <Text style={styles.closeText}>Close</Text>
      </Pressable>
    </ScrollView>
  );
}

function Action({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.action, active && styles.actionActive]}
    >
      <Text style={[styles.actionText, active && styles.actionTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title.toUpperCase()}</Text>
      {children}
    </View>
  );
}

function MiniLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.miniLink} onPress={onPress}>
      <Text style={styles.miniLinkText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surfaceMuted },
  content: { padding: space.md, paddingBottom: 40 },
  missing: { flex: 1, alignItems: "center", justifyContent: "center" },
  missingText: { color: colors.textSecondary },
  header: { flexDirection: "row", gap: 12, alignItems: "center" },
  headerBody: { flex: 1, minWidth: 0 },
  name: { fontSize: 20, fontWeight: "900", color: colors.textPrimary },
  sub: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  tier: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  tierText: { color: "#FFFFFF", fontWeight: "900", fontSize: 15 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 16 },
  action: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingVertical: 10,
    alignItems: "center",
  },
  actionActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  actionText: { fontSize: 12, fontWeight: "800", color: colors.textSecondary },
  actionTextActive: { color: colors.cream },
  flash: { color: colors.now, fontWeight: "700", marginTop: 8, fontSize: 13 },
  body: { fontSize: 15, color: colors.textPrimary, lineHeight: 22, marginTop: 16 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginTop: 14,
  },
  cardTitle: {
    fontSize: 11,
    letterSpacing: 1.6,
    fontWeight: "800",
    color: colors.textMuted,
    marginBottom: 10,
  },
  cardBody: { fontSize: 14, color: colors.textPrimary, lineHeight: 20 },
  sourceNote: { marginTop: 8, color: colors.textSecondary },
  linkBtn: {
    backgroundColor: colors.red,
    borderRadius: radius.md,
    paddingVertical: 11,
    alignItems: "center",
    marginTop: 12,
  },
  linkBtnText: { color: "#FFFFFF", fontWeight: "800" },
  caution: { fontSize: 12, color: colors.textMuted, marginTop: 10, fontStyle: "italic" },
  linkGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  miniLink: {
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  miniLinkText: { fontSize: 13, fontWeight: "700", color: colors.textPrimary },
  session: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 5,
    alignItems: "baseline",
  },
  sessionDate: { width: 64, fontSize: 12, fontWeight: "800", color: colors.teal },
  sessionLabel: { flex: 1, fontSize: 13, color: colors.textSecondary },
  calendarBtn: {
    marginTop: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingVertical: 10,
    alignItems: "center",
  },
  calendarBtnText: { fontSize: 13, fontWeight: "800", color: colors.textPrimary },
  close: {
    marginTop: 20,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingVertical: 12,
    alignItems: "center",
  },
  closeText: { fontWeight: "800", color: colors.textSecondary },
});
