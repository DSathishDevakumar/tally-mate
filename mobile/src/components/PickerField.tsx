import { Picker } from "@react-native-picker/picker";
import { Ionicons } from "@expo/vector-icons";
import type { PropsWithChildren } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, typography } from "../theme/theme";

interface PickerFieldProps extends PropsWithChildren {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  required?: boolean;
  selectedValue: string;
  onValueChange: (value: string) => void;
}

export function PickerField({
  label,
  icon,
  required,
  selectedValue,
  onValueChange,
  children,
}: Readonly<PickerFieldProps>) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <View style={styles.fieldWrapper}>
        {icon ? <Ionicons name={icon} size={18} color={colors.textMuted} style={styles.icon} /> : null}
        <Picker selectedValue={selectedValue} onValueChange={onValueChange} style={styles.picker}>
          {children}
        </Picker>
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
    paddingLeft: spacing.sm + 4,
    overflow: "hidden",
  },
  icon: { marginRight: spacing.xs },
  picker: { flex: 1, color: colors.textPrimary },
});
