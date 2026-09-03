export const colors = {
  bg: "#FAFAFF",
  ink: "#111827",
  muted: "#64748B",
  primary: "#6C63FF",
  primaryStrong: "#554DD6",
  primaryFg: "#FFFFFF",
  accentSoft: "#F1EFFF",
  secondary: "#43D19E",
  danger: "#FF6B6B",
  surface: "#FFFFFF",
  surfaceStrong: "#F8FAFC",
  border: "#E5E7EB",
  mark: "#5B55D6",
  markDot: "#6C63FF",
  warning: "#F59E0B",
} as const;

export const contrastColors = {
  bg: "#000000",
  ink: "#FFFFFF",
  muted: "#FFFFFF",
  primary: "#FFFFFF",
  primaryStrong: "#FFFFFF",
  primaryFg: "#000000",
  accentSoft: "#111111",
  secondary: "#FFFFFF",
  danger: "#FFFFFF",
  surface: "#000000",
  surfaceStrong: "#000000",
  border: "#FFFFFF",
  mark: "#FFFFFF",
  markDot: "#FFFFFF",
  warning: "#FFFFFF",
} as const;

export type ThemeColors = typeof colors;

export const radius = {
  card: 24,
  pill: 999,
  input: 16,
} as const;

export const tap = 44;
