import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { MonogramMark } from "@/components/MonogramMark";
import type { Festival } from "@/data/types";
import { estimateDriveHours, haversineMiles } from "@/lib/geo";
import { shareJsonPayload, shareTripSummary } from "@/lib/share";
import { useStore } from "@/store/store";
import { colors, radius, space } from "@/theme/tokens";

export default function RouteScreen() {
  const router = useRouter();
  const {
    festivals,
    trip,
    metaFor,
    removeFromRoute,
    reorderRoute,
    setTripNotes,
  } = useStore();

  const stops = useMemo(
    () =>
      trip.parkIds
        .map((id) => festivals.find((f) => f.id === id))
        .filter(Boolean) as Festival[],
    [trip.parkIds, festivals]
  );

  function move(index: number, dir: -1 | 1) {
    const next = [...trip.parkIds];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    reorderRoute(next);
  }

  const totalMiles = useMemo(() => {
    let sum = 0;
    for (let i = 1; i < stops.length; i += 1) {
      sum += haversineMiles(stops[i - 1].coordinates, stops[i].coordinates);
    }
    return sum;
  }, [stops]);

  async function onShareSummary() {
    try {
      await shareTripSummary(trip, stops, (id) => metaFor(id).dateRangeLabel);
    } catch (err) {
      Alert.alert("Share failed", (err as Error).message);
    }
  }

  async function onExportTrip() {
    try {
      const payload = {
        kind: "festival-atlas-trip",
        version: 1,
        trip,
        stops: stops.map((f) => ({ id: f.id, name: f.name, city: f.city })),
      };
      const shared = await shareJsonPayload("festival-atlas-trip.json", payload);
      if (!shared) Alert.alert("Saved", "Trip file written; sharing is unavailable on this device.");
    } catch (err) {
      Alert.alert("Export failed", (err as Error).message);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{trip.title}</Text>
      <Text style={styles.subtitle}>
        {stops.length} stop{stops.length === 1 ? "" : "s"}
        {totalMiles > 0 ? ` · ~${totalMiles.toLocaleString()} mi` : ""}
      </Text>

      {stops.length > 0 ? (
        <View style={styles.shareRow}>
          <Pressable style={styles.shareBtn} onPress={onShareSummary}>
            <Text style={styles.shareText}>↗ Share trip</Text>
          </Pressable>
          <Pressable style={styles.shareBtn} onPress={onExportTrip}>
            <Text style={styles.shareText}>⤓ Export .json</Text>
          </Pressable>
        </View>
      ) : null}

      {stops.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No stops yet</Text>
          <Text style={styles.emptyBody}>
            Add festivals from Explore to start building your run.
          </Text>
          <Pressable style={styles.cta} onPress={() => router.push("/explore")}>
            <Text style={styles.ctaText}>Browse festivals</Text>
          </Pressable>
        </View>
      ) : (
        stops.map((festival, index) => {
          const meta = metaFor(festival.id);
          const prev = index > 0 ? stops[index - 1] : null;
          const legMiles = prev
            ? haversineMiles(prev.coordinates, festival.coordinates)
            : 0;
          return (
            <View key={festival.id}>
              {prev ? (
                <View style={styles.leg}>
                  <Text style={styles.legText}>
                    ↓ {legMiles.toLocaleString()} mi · ~
                    {estimateDriveHours(legMiles)} h drive
                  </Text>
                </View>
              ) : null}
              <View style={styles.stop}>
                <Text style={styles.stopIndex}>{index + 1}</Text>
                <Pressable
                  style={styles.stopMain}
                  onPress={() => router.push(`/festival/${festival.id}`)}
                >
                  <MonogramMark festival={festival} size={38} />
                  <View style={styles.stopBody}>
                    <Text style={styles.stopName} numberOfLines={1}>
                      {festival.name}
                    </Text>
                    <Text style={styles.stopMeta} numberOfLines={1}>
                      {festival.city} · {meta.dateRangeLabel}
                    </Text>
                  </View>
                </Pressable>
                <View style={styles.stopActions}>
                  <Pressable onPress={() => move(index, -1)} hitSlop={8}>
                    <Text style={styles.moveBtn}>▲</Text>
                  </Pressable>
                  <Pressable onPress={() => move(index, 1)} hitSlop={8}>
                    <Text style={styles.moveBtn}>▼</Text>
                  </Pressable>
                  <Pressable onPress={() => removeFromRoute(festival.id)} hitSlop={8}>
                    <Text style={styles.removeBtn}>✕</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          );
        })
      )}

      <Text style={styles.notesLabel}>TRIP NOTES</Text>
      <TextInput
        value={trip.notes}
        onChangeText={setTripNotes}
        placeholder="Lodging, ticket windows, who's coming, budget…"
        placeholderTextColor={colors.textMuted}
        multiline
        style={styles.notes}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surfaceMuted },
  content: { padding: space.md, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: "900", color: colors.textPrimary },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 4, marginBottom: 12 },
  shareRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  shareBtn: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  shareText: { fontSize: 13, fontWeight: "700", color: colors.textPrimary },
  empty: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    alignItems: "flex-start",
  },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: colors.textPrimary },
  emptyBody: { fontSize: 14, color: colors.textSecondary, marginTop: 6, marginBottom: 16 },
  cta: { backgroundColor: colors.red, borderRadius: radius.md, paddingHorizontal: 18, paddingVertical: 11 },
  ctaText: { color: "#FFFFFF", fontWeight: "800" },
  leg: { paddingVertical: 6, paddingLeft: 34 },
  legText: { fontSize: 12, color: colors.textMuted, fontWeight: "600" },
  stop: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    gap: 8,
  },
  stopIndex: {
    width: 22,
    textAlign: "center",
    fontWeight: "900",
    color: colors.textMuted,
    fontSize: 13,
  },
  stopMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, minWidth: 0 },
  stopBody: { flex: 1, minWidth: 0 },
  stopName: { fontSize: 15, fontWeight: "800", color: colors.textPrimary },
  stopMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  stopActions: { alignItems: "center", gap: 6, flexDirection: "row" },
  moveBtn: { fontSize: 14, color: colors.textSecondary, paddingHorizontal: 2 },
  removeBtn: { fontSize: 15, color: colors.red, paddingHorizontal: 2 },
  notesLabel: {
    fontSize: 11,
    letterSpacing: 1.6,
    fontWeight: "800",
    color: colors.textMuted,
    marginTop: 24,
    marginBottom: 8,
  },
  notes: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    minHeight: 110,
    fontSize: 15,
    color: colors.textPrimary,
    textAlignVertical: "top",
  },
});
