import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { colors } from "../../../src/theme/theme";

export default function ReportsLayout() {
  const { t } = useTranslation();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: "700", color: colors.textPrimary },
        headerTintColor: colors.primary,
      }}
    >
      <Stack.Screen name="index" options={{ title: t("reports.listTitle") }} />
      <Stack.Screen name="[id]" options={{ title: t("reports.statementTitle") }} />
    </Stack>
  );
}
