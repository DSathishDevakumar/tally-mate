import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../src/context/LanguageContext";
import type { Language } from "../../../src/i18n";
import { Card } from "../../../src/components/Card";
import { Screen } from "../../../src/components/Screen";
import { colors, spacing, typography } from "../../../src/theme/theme";

const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: "en", label: "English" },
  { value: "ta", label: "தமிழ்" },
];

export default function Settings() {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();

  return (
    <Screen scroll>
      <Text style={styles.sectionTitle}>{t("settings.languageSection")}</Text>
      <Text style={styles.hint}>{t("settings.languageHint")}</Text>

      <Card style={styles.optionList}>
        {LANGUAGE_OPTIONS.map((option) => {
          const selected = option.value === language;
          return (
            <Pressable
              key={option.value}
              style={[styles.option, selected && styles.optionSelected]}
              onPress={() => setLanguage(option.value)}
            >
              <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>{option.label}</Text>
              {selected ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} /> : null}
            </Pressable>
          );
        })}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { ...typography.label, color: colors.textSecondary, marginBottom: spacing.xs },
  hint: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.md },
  optionList: { padding: 0, overflow: "hidden" },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionSelected: { backgroundColor: colors.primaryLight },
  optionLabel: { ...typography.body, color: colors.textPrimary },
  optionLabelSelected: { ...typography.bodyStrong, color: colors.primaryDark },
});
