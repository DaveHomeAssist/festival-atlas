import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Festival, FestivalGuideMeta } from "@/data/types";
import { colors, radius, tierColor } from "@/theme/tokens";
import { Pill, SeasonBadge } from "./Badge";
import { MonogramMark } from "./MonogramMark";

interface Props {
  festival: Festival;
  meta: FestivalGuideMeta;
  shortlisted?: boolean;
  onPress?: () => void;
  onToggleShortlist?: () => void;
}

export function FestivalCard({
  festival,
  meta,
  shortlisted,
  onPress,
  onToggleShortlist,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.row}>
        <MonogramMark festival={festival} />
        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={2}>
            {festival.name}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {festival.genre} · {festival.city}
          </Text>
          <View style={styles.badges}>
            <SeasonBadge status={meta.seasonStatus} label={meta.dateRangeLabel} />
          </View>
        </View>
        <View style={styles.right}>
          <View style={[styles.tier, { backgroundColor: tierColor[festival.tier] }]}>
            <Text style={styles.tierText}>{festival.tier}</Text>
          </View>
          {onToggleShortlist ? (
            <Pressable onPress={onToggleShortlist} hitSlop={10}>
              <Text style={[styles.star, shortlisted && styles.starOn]}>
                {shortlisted ? "★" : "☆"}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
      {meta.planningStatus && meta.planningStatus !== "Scout" ? (
        <View style={styles.footer}>
          <Pill label={meta.planningStatus} tint={colors.teal} />
          {meta.dataStatus.startsWith("needs") ? (
            <Pill label={meta.dataLabel} tint={colors.red} />
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 12,
  },
  pressed: { opacity: 0.7 },
  row: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  body: { flex: 1, minWidth: 0 },
  name: { fontSize: 17, fontWeight: "800", color: colors.textPrimary },
  meta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  badges: { marginTop: 8 },
  right: { alignItems: "center", gap: 10 },
  tier: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  tierText: { color: "#FFFFFF", fontWeight: "800", fontSize: 13 },
  star: { fontSize: 22, color: colors.textMuted },
  starOn: { color: colors.gold },
  footer: { flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" },
});
