import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from "react-native";
import { colors, radius, spacing, typography } from "../theme/theme";

type Variant = "primary" | "secondary" | "outline" | "danger" | "ghost";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({ label, onPress, variant = "primary", icon, loading, disabled, style }: Readonly<ButtonProps>) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "outline" || variant === "ghost" ? colors.primary : colors.textOnPrimary} />
      ) : (
        <>
          {icon ? (
            <Ionicons
              name={icon}
              size={18}
              color={textColor[variant]}
              style={{ marginRight: spacing.xs }}
            />
          ) : null}
          <Text style={[styles.label, { color: textColor[variant] }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const textColor: Record<Variant, string> = {
  primary: colors.textOnPrimary,
  secondary: colors.primaryDark,
  outline: colors.textPrimary,
  danger: colors.textOnPrimary,
  ghost: colors.danger,
};

const variantStyles: Record<Variant, ViewStyle> = {
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.primaryLight },
  outline: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border },
  danger: { backgroundColor: colors.danger },
  ghost: { backgroundColor: "transparent" },
};

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
  },
  label: { ...typography.bodyStrong, fontSize: 16 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.5 },
});
