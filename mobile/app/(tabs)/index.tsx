import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FestivalCard } from "@/components/FestivalCard";
import { happeningSoon, nextTargets, seasonSummary } from "@/store/selectors";
import { useStore } from "@/store/store";
import { colors, radius, space } from "@/theme/tokens";

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const store = useStore();
  const {
    festivals,
    metaFor,
    isVisited,
    isOnRoute,
    isShortlisted,
    toggleShortlist,
    trip,
    visits,
  } = store;

  const summary = useMemo(
    () => seasonSummary(festivals, metaFor),
    [festivals, metaFor]
  );
  const attendedCount = visits.filter((v) => v.visited).length;
  const total = festivals.length;

  const routeFestivals = trip.parkIds
    .map((id) => festivals.find((f) => f.id === id))
    .filter(Boolean) as typeof festivals;
  const soon = happeningSoon(festivals, metaFor, isVisited);
  const nextUp = routeFestivals.length
    ? routeFestivals
    : soon.length
      ? soon
      : nextTargets(festivals, metaFor, isVisited, isOnRoute);

  const nextUpTitle = routeFestivals.length
    ? "Current route"
    : soon.length
      ? "Happening soon"
      : "Priority shortlist";

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
    >
      <Text style={styles.kicker}>MUSIC FESTIVAL FIELD GUIDE</Text>
      <Text style={styles.headline}>Build the run. Catch the sets.</Text>
      <Text style={styles.sub}>
        Festival Atlas tracks what you attended, what still matters, and how the
        next route fits together.
      </Text>

      <View style={styles.stats}>
        <Stat value={attendedCount} label="Attended" />
        <Stat value={trip.parkIds.length} label="On route" />
        <Stat value={summary.happeningNow + summary.happeningSoon} label="Soon" />
      </View>

      <View style={styles.progressBand}>
        <Text style={styles.progressLabel}>CIRCUIT PROGRESS</Text>
        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              { width: `${total ? (attendedCount / total) * 100 : 0}%` },
            ]}
          />
        </View>
        <Text style={styles.progressCount}>
          {attendedCount} / {total}
        </Text>
      </View>

      <Text style={styles.sectionLabel}>{nextUpTitle.toUpperCase()}</Text>
      {nextUp.map((festival) => (
        <FestivalCard
          key={festival.id}
          festival={festival}
          meta={metaFor(festival.id)}
          shortlisted={isShortlisted(festival.id)}
          onToggleShortlist={() => toggleShortlist(festival.id)}
          onPress={() => router.push(`/festival/${festival.id}`)}
        />
      ))}

      <Text style={styles.footer}>
        Guide seed reviewed {summary.lastReviewed || "TBD"} ·{" "}
        {summary.needsReview} source recheck
        {summary.needsReview === 1 ? "" : "s"} queued · Verify official sources
        before booking.
      </Text>
    </ScrollView>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy },
  content: { padding: space.lg, paddingBottom: 40 },
  kicker: {
    color: colors.creamDim,
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: "700",
  },
  headline: {
    color: colors.cream,
    fontSize: 36,
    fontWeight: "900",
    letterSpacing: -1,
    marginTop: 8,
  },
  sub: { color: colors.creamDim, fontSize: 15, marginTop: 10, lineHeight: 21 },
  stats: { flexDirection: "row", gap: 10, marginTop: 22 },
  stat: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 14,
  },
  statValue: { color: colors.cream, fontSize: 26, fontWeight: "900" },
  statLabel: { color: colors.creamDim, fontSize: 9, letterSpacing: 1.4, marginTop: 6 },
  progressBand: {
    marginTop: 18,
    marginBottom: 24,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: radius.lg,
    padding: 16,
    gap: 10,
  },
  progressLabel: { color: colors.creamDim, fontSize: 10, letterSpacing: 1.6, fontWeight: "700" },
  track: {
    height: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 999, backgroundColor: colors.gold },
  progressCount: { color: colors.cream, fontSize: 12, fontWeight: "700" },
  sectionLabel: {
    color: colors.gold,
    fontSize: 11,
    letterSpacing: 1.6,
    fontWeight: "800",
    marginBottom: 12,
  },
  footer: {
    color: colors.creamDim,
    fontSize: 11,
    letterSpacing: 0.4,
    marginTop: 8,
    lineHeight: 17,
  },
});
