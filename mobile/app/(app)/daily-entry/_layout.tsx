import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { colors } from "../../../src/theme/theme";

export default function DailyEntryLayout() {
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
      <Stack.Screen name="index" options={{ title: t("dailyEntry.listTitle") }} />
      <Stack.Screen name="new" options={{ title: t("dailyEntry.addTitle") }} />
      <Stack.Screen name="voice" options={{ title: t("dailyEntry.voiceTitle") }} />
      <Stack.Screen name="voice-confirm" options={{ title: t("dailyEntry.voiceConfirmTitle") }} />
      <Stack.Screen name="photo" options={{ title: t("dailyEntry.photoTitle") }} />
      <Stack.Screen name="photo-confirm" options={{ title: t("dailyEntry.photoConfirmTitle") }} />
      <Stack.Screen name="[id]" options={{ title: t("dailyEntry.detailTitle") }} />
    </Stack>
  );
}
