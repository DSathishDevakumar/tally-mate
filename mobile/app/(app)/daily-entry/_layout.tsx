import { Stack } from "expo-router";

export default function DailyEntryLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Today's Entries" }} />
      <Stack.Screen name="new" options={{ title: "Add Entry" }} />
      <Stack.Screen name="[id]" options={{ title: "Entry" }} />
    </Stack>
  );
}
