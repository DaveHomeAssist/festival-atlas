import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { SeasonStatus } from "@/data/types";
import { colors, seasonColor } from "@/theme/tokens";

export function SeasonBadge({
  status,
  label,
}: {
  status: SeasonStatus;
  label: string;
}) {
  const tint = seasonColor[status] ?? colors.textMuted;
  return (
    <View style={[styles.badge, { backgroundColor: tint + "22", borderColor: tint + "55" }]}>
      <View style={[styles.dot, { backgroundColor: tint }]} />
      <Text style={[styles.text, { color: tint }]}>{label}</Text>
    </View>
  );
}

export function Pill({
  label,
  tint = colors.textSecondary,
  filled = false,
}: {
  label: string;
  tint?: string;
  filled?: boolean;
}) {
  return (
    <View
      style={[
        styles.pill,
        filled
          ? { backgroundColor: tint }
          : { borderColor: tint + "66", borderWidth: 1 },
      ]}
    >
      <Text style={[styles.pillText, { color: filled ? "#FFFFFF" : tint }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: 11, fontWeight: "700", letterSpacing: 0.3 },
  pill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  pillText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.3 },
});
