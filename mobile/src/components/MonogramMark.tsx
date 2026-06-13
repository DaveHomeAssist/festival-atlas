import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { Festival } from "@/data/types";
import { monogram } from "@/lib/logos";
import { colors, radius } from "@/theme/tokens";

interface Props {
  festival: Pick<Festival, "name" | "searchMeta" | "color">;
  size?: number;
}

export function MonogramMark({ festival, size = 44 }: Props) {
  return (
    <View
      style={[
        styles.mark,
        {
          width: size,
          height: size,
          borderRadius: radius.md,
          backgroundColor: festival.color || colors.navySoft,
        },
      ]}
    >
      <Text style={[styles.text, { fontSize: size * 0.36 }]}>
        {monogram(festival)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    color: "#FFFFFF",
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});
