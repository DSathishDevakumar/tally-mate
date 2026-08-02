import { Ionicons } from "@expo/vector-icons";
import type { PropsWithChildren } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, shadowLg, spacing, typography } from "../theme/theme";

interface FabProps {
  label?: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  variant?: "primary" | "secondary";
  /** Fixed-size icon-only circle instead of an extended labeled pill — for secondary actions sharing a row with one primary action. */
  compact?: boolean;
}

/** A single floating action button. Use inside a <FabRow> for multiple. */
export function Fab({ label, icon, onPress, variant = "primary", compact }: Readonly<FabProps>) {
  const isSecondary = variant === "secondary";
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        compact ? styles.fabCompact : styles.fab,
        { backgroundColor: isSecondary ? colors.surface : colors.primary },
        isSecondary && styles.secondaryBorder,
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name={icon} size={compact ? 22 : 18} color={isSecondary ? colors.primary : colors.textOnPrimary} />
      {!compact && label ? (
        <Text style={[styles.label, { color: isSecondary ? colors.primary : colors.textOnPrimary }]}>{label}</Text>
      ) : null}
    </Pressable>
  );
}

export function FabRow({ children }: Readonly<PropsWithChildren>) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  row: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  fab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: 15,
    borderRadius: radius.full,
    ...shadowLg,
  },
  fabCompact: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
    ...shadowLg,
  },
  secondaryBorder: { borderWidth: 1.5, borderColor: colors.border },
  label: { ...typography.bodyStrong },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
});
