import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, typography } from "../theme/theme";

type Tone = "success" | "danger" | "warning" | "neutral" | "accent";

export function Badge({ label, tone = "neutral" }: Readonly<{ label: string; tone?: Tone }>) {
  const t = toneStyles[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      <Text style={[styles.label, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

const toneStyles: Record<Tone, { bg: string; fg: string }> = {
  success: { bg: colors.successLight, fg: colors.primaryDark },
  danger: { bg: colors.dangerLight, fg: colors.danger },
  warning: { bg: colors.warningLight, fg: colors.warning },
  neutral: { bg: colors.surfaceMuted, fg: colors.textSecondary },
  accent: { bg: colors.accentLight, fg: colors.accent },
};

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  label: { ...typography.caption, fontSize: 12 },
});
