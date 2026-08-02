import { Stack } from "expo-router";
import { colors } from "../../../src/theme/theme";

export default function DailyEntryLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: "700", color: colors.textPrimary },
        headerTintColor: colors.primary,
      }}
    >
      <Stack.Screen name="index" options={{ title: "Today's Entries" }} />
      <Stack.Screen name="new" options={{ title: "Add Entry" }} />
      <Stack.Screen name="voice" options={{ title: "Add by Voice" }} />
      <Stack.Screen name="voice-confirm" options={{ title: "Confirm Entry" }} />
      <Stack.Screen name="photo" options={{ title: "Add by Photo" }} />
      <Stack.Screen name="photo-confirm" options={{ title: "Confirm Entries" }} />
      <Stack.Screen name="[id]" options={{ title: "Entry" }} />
    </Stack>
  );
}
