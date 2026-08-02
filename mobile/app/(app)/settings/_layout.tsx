import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { colors } from "../../../src/theme/theme";

export default function SettingsLayout() {
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
      <Stack.Screen name="index" options={{ title: t("settings.title") }} />
    </Stack>
  );
}
