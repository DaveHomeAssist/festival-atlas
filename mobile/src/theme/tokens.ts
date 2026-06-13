/** Brand tokens ported from the web app's shared.css palette (navy/cream/gold/red). */

export const colors = {
  navy: "#101826",
  navySoft: "#1D2A40",
  cream: "#F8F3E8",
  creamDim: "rgba(248,243,232,0.72)",
  gold: "#E3B04B",
  red: "#F15C41",
  teal: "#0891B2",
  ink: "#101826",
  textPrimary: "#1A2333",
  textSecondary: "#55617A",
  textMuted: "#8A93A6",
  surface: "#FFFFFF",
  surfaceMuted: "#F0E9DA",
  border: "rgba(16,24,38,0.10)",
  borderStrong: "rgba(16,24,38,0.18)",
  // season status accents
  now: "#16A34A",
  soon: "#E3B04B",
  upcoming: "#0891B2",
  past: "#8A93A6",
  review: "#F15C41",
} as const;

export const tierColor: Record<string, string> = {
  S: "#F15C41",
  A: "#E3B04B",
  B: "#0891B2",
};

export const seasonColor: Record<string, string> = {
  "happening-now": colors.now,
  "happening-soon": colors.soon,
  upcoming: colors.upcoming,
  past: colors.past,
  "dates-tbd": colors.textMuted,
};

export const radius = { sm: 10, md: 16, lg: 22, xl: 28 } as const;
export const space = { xs: 6, sm: 10, md: 16, lg: 22, xl: 28 } as const;

export const font = {
  display: "System",
  body: "System",
  mono: "System",
} as const;
