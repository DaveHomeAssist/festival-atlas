import { useRouter } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { FestivalCard } from "@/components/FestivalCard";
import { FestivalMap, type FestivalMapHandle } from "@/components/FestivalMap";
import type { Coordinates, Festival, Tier } from "@/data/types";
import { haversineMiles } from "@/lib/geo";
import { getCurrentCoordinates } from "@/lib/location";
import { useStore } from "@/store/store";
import { colors, radius, space } from "@/theme/tokens";

type SeasonFilter = "all" | "soon" | "upcoming" | "past";
type ViewMode = "list" | "map";
const TIERS: Tier[] = ["S", "A", "B"];

export default function ExploreScreen() {
  const router = useRouter();
  const {
    festivals,
    metaFor,
    isShortlisted,
    toggleShortlist,
    trip,
  } = useStore();

  const [query, setQuery] = useState("");
  const [tier, setTier] = useState<Tier | null>(null);
  const [season, setSeason] = useState<SeasonFilter>("all");
  const [onlyShortlist, setOnlyShortlist] = useState(false);
  const [mode, setMode] = useState<ViewMode>("list");
  const [near, setNear] = useState<Coordinates | null>(null);
  const [locating, setLocating] = useState(false);
  const mapRef = useRef<FestivalMapHandle>(null);

  const routeStops = useMemo(
    () =>
      trip.parkIds
        .map((id) => festivals.find((f) => f.id === id))
        .filter(Boolean) as Festival[],
    [trip.parkIds, festivals]
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return festivals
      .map((f) => ({ f, meta: metaFor(f.id) }))
      .filter(({ f, meta }) => {
        if (q) {
          const hay =
            `${f.name} ${f.searchMeta.localName} ${f.city} ${f.searchMeta.region} ${f.genre}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        if (tier && f.tier !== tier) return false;
        if (onlyShortlist && !isShortlisted(f.id)) return false;
        if (season === "soon" && !["happening-now", "happening-soon"].includes(meta.seasonStatus))
          return false;
        if (season === "upcoming" && meta.seasonStatus !== "upcoming") return false;
        if (season === "past" && meta.seasonStatus !== "past") return false;
        return true;
      })
      .sort((a, b) => {
        if (near) {
          return (
            haversineMiles(near, a.f.coordinates) -
            haversineMiles(near, b.f.coordinates)
          );
        }
        const aStart = a.meta.dateStart || "9999";
        const bStart = b.meta.dateStart || "9999";
        return aStart.localeCompare(bStart);
      })
      .map(({ f }) => f);
  }, [festivals, metaFor, query, tier, season, onlyShortlist, isShortlisted, near]);

  async function onNearMe() {
    setLocating(true);
    try {
      const coords = await getCurrentCoordinates();
      if (coords) {
        setNear(coords);
        if (mode === "map") mapRef.current?.centerOn(coords);
      }
    } catch (err) {
      Alert.alert("Location unavailable", (err as Error).message);
    } finally {
      setLocating(false);
    }
  }

  const renderItem = ({ item }: { item: Festival }) => (
    <FestivalCard
      festival={item}
      meta={metaFor(item.id)}
      shortlisted={isShortlisted(item.id)}
      onToggleShortlist={() => toggleShortlist(item.id)}
      onPress={() => router.push(`/festival/${item.id}`)}
    />
  );

  return (
    <View style={styles.screen}>
      <View style={styles.controls}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search festivals, cities, genres…"
          placeholderTextColor={colors.textMuted}
          style={styles.search}
        />
        <View style={styles.chipRow}>
          <Chip label="All tiers" active={!tier} onPress={() => setTier(null)} />
          {TIERS.map((t) => (
            <Chip
              key={t}
              label={`Tier ${t}`}
              active={tier === t}
              onPress={() => setTier(tier === t ? null : t)}
            />
          ))}
        </View>
        <View style={styles.chipRow}>
          <Chip label="Any time" active={season === "all"} onPress={() => setSeason("all")} />
          <Chip label="Soon" active={season === "soon"} onPress={() => setSeason("soon")} />
          <Chip label="Upcoming" active={season === "upcoming"} onPress={() => setSeason("upcoming")} />
          <Chip label="Past" active={season === "past"} onPress={() => setSeason("past")} />
          <Chip
            label="★ Shortlist"
            active={onlyShortlist}
            onPress={() => setOnlyShortlist((v) => !v)}
          />
        </View>
        <View style={styles.modeRow}>
          <View style={styles.segment}>
            <Pressable
              onPress={() => setMode("list")}
              style={[styles.segBtn, mode === "list" && styles.segBtnActive]}
            >
              <Text style={[styles.segText, mode === "list" && styles.segTextActive]}>
                List
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setMode("map")}
              style={[styles.segBtn, mode === "map" && styles.segBtnActive]}
            >
              <Text style={[styles.segText, mode === "map" && styles.segTextActive]}>
                Map
              </Text>
            </Pressable>
          </View>
          <Pressable
            onPress={onNearMe}
            style={[styles.nearBtn, near && styles.nearBtnActive]}
          >
            <Text style={[styles.nearText, near && styles.nearTextActive]}>
              {locating ? "Locating…" : near ? "◉ Near me" : "○ Near me"}
            </Text>
          </Pressable>
          <Text style={styles.count}>
            {results.length} result{results.length === 1 ? "" : "s"}
          </Text>
        </View>
      </View>

      {mode === "map" ? (
        <FestivalMap
          ref={mapRef}
          festivals={results}
          routeStops={routeStops}
          onSelect={(festivalId) => router.push(`/festival/${festivalId}`)}
        />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(f) => f.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <Text style={styles.empty}>No festivals match those filters.</Text>
          }
        />
      )}
    </View>
  );
}

function Chip({
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
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surfaceMuted },
  controls: {
    padding: space.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 10,
  },
  search: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.textPrimary,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  chipActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  chipText: { fontSize: 13, color: colors.textSecondary, fontWeight: "600" },
  chipTextActive: { color: colors.cream },
  count: { fontSize: 12, color: colors.textMuted, fontWeight: "700", letterSpacing: 0.4 },
  list: { padding: space.md },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: 40 },
  modeRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  segment: {
    flexDirection: "row",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    overflow: "hidden",
  },
  segBtn: { paddingHorizontal: 16, paddingVertical: 7 },
  segBtnActive: { backgroundColor: colors.navy },
  segText: { fontSize: 13, fontWeight: "700", color: colors.textSecondary },
  segTextActive: { color: colors.cream },
  nearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  nearBtnActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  nearText: { fontSize: 13, fontWeight: "700", color: colors.textSecondary },
  nearTextActive: { color: "#FFFFFF" },
});
