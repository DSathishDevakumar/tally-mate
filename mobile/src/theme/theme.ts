import { Platform } from "react-native";

export const colors = {
  background: "#F6F8F7",
  surface: "#FFFFFF",
  surfaceMuted: "#F0F3F1",
  border: "#E6EBE8",

  textPrimary: "#111827",
  textSecondary: "#6B7280",
  textMuted: "#9CA3AF",
  textOnPrimary: "#FFFFFF",

  primary: "#15803D",
  primaryDark: "#166534",
  primaryLight: "#DCFCE7",

  accent: "#7C3AED",
  accentLight: "#EDE9FE",

  success: "#16A34A",
  successLight: "#DCFCE7",
  danger: "#DC2626",
  dangerLight: "#FEE2E2",
  warning: "#D97706",
  warningLight: "#FEF3C7",

  overlay: "rgba(17, 24, 39, 0.45)",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

export const typography = {
  display: { fontSize: 28, fontWeight: "800" as const, letterSpacing: -0.5 },
  title: { fontSize: 22, fontWeight: "700" as const, letterSpacing: -0.3 },
  heading: { fontSize: 17, fontWeight: "700" as const },
  body: { fontSize: 15, fontWeight: "400" as const },
  bodyStrong: { fontSize: 15, fontWeight: "600" as const },
  caption: { fontSize: 13, fontWeight: "500" as const },
  label: { fontSize: 13, fontWeight: "600" as const, letterSpacing: 0.2 },
};

export const shadow = Platform.select({
  ios: {
    shadowColor: "#111827",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  android: { elevation: 3 },
  default: {},
});

export const shadowLg = Platform.select({
  ios: {
    shadowColor: "#111827",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
  },
  android: { elevation: 8 },
  default: {},
});

// Deterministic pastel-on-dark palette for avatar initials, keyed by name so
// the same customer always gets the same color without storing one.
const avatarPalette = [
  { bg: "#DCFCE7", fg: "#166534" },
  { bg: "#EDE9FE", fg: "#5B21B6" },
  { bg: "#FEF3C7", fg: "#92400E" },
  { bg: "#DBEAFE", fg: "#1E40AF" },
  { bg: "#FCE7F3", fg: "#9D174D" },
  { bg: "#FFEDD5", fg: "#9A3412" },
  { bg: "#E0F2FE", fg: "#075985" },
];

export function avatarColorFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return avatarPalette[hash % avatarPalette.length];
}
