import { Tabs } from "expo-router";

// TODO: once role-specific navigation is designed, branch tabs by appUser.role
// (e.g. CUSTOMER gets a single read-only "My Tab" screen instead of these).
export default function AppLayout() {
  return (
    <Tabs screenOptions={{ headerTitleAlign: "center" }}>
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="customers" options={{ title: "Customers", headerShown: false }} />
      <Tabs.Screen name="daily-entry" options={{ title: "Daily Entry", headerShown: false }} />
      <Tabs.Screen name="billing/index" options={{ title: "Billing" }} />
      <Tabs.Screen name="reports/index" options={{ title: "Reports" }} />
    </Tabs>
  );
}
