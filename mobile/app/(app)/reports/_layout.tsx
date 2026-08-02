import { Stack } from "expo-router";
import { colors } from "../../../src/theme/theme";

export default function ReportsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: "700", color: colors.textPrimary },
        headerTintColor: colors.primary,
      }}
    >
      <Stack.Screen name="index" options={{ title: "Reports" }} />
      <Stack.Screen name="[id]" options={{ title: "Statement" }} />
    </Stack>
  );
}
