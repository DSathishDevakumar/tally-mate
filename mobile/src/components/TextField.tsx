import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { colors, radius, spacing, typography } from "../theme/theme";

interface TextFieldProps extends TextInputProps {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  required?: boolean;
}

export function TextField({ label, icon, required, style, onFocus, onBlur, ...rest }: Readonly<TextFieldProps>) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <View style={[styles.fieldWrapper, isFocused && styles.fieldWrapperFocused]}>
        {icon ? (
          <Ionicons name={icon} size={18} color={isFocused ? colors.primary : colors.textMuted} style={styles.icon} />
        ) : null}
        <TextInput
          placeholderTextColor={colors.textMuted}
          style={[styles.input, rest.multiline && styles.multiline, style]}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.md },
  label: { ...typography.label, color: colors.textSecondary, marginBottom: spacing.xs },
  required: { color: colors.danger },
  fieldWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm + 4,
  },
  fieldWrapperFocused: { borderColor: colors.primary },
  icon: { marginRight: spacing.sm },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.textPrimary,
  },
  multiline: { minHeight: 80, textAlignVertical: "top", paddingTop: 12 },
});
