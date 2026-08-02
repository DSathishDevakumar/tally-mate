import { Ionicons } from "@expo/vector-icons";
import { Tabs, useRouter } from "expo-router";
import { Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { colors } from "../../src/theme/theme";

// TODO: once role-specific navigation is designed, branch tabs by appUser.role
// (e.g. CUSTOMER gets a single read-only "My Tab" screen instead of these).
export default function AppLayout() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        headerTitleAlign: "center",
        headerStyle: { backgroundColor: colors.surface },
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: "700", color: colors.textPrimary },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tabs.home"),
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
          headerRight: () => (
            <Pressable onPress={() => router.push("/(app)/settings")} hitSlop={8} style={{ marginRight: 16 }}>
              <Ionicons name="settings-outline" size={22} color={colors.textPrimary} />
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: t("tabs.customers"),
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="daily-entry"
        options={{
          title: t("tabs.dailyEntry"),
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="book" size={size} color={color} />,
        }}
      />
      {/* Billing is hidden from navigation for now (href: null) while the module
          isn't built out yet — the route stays registered for when it ships. */}
      <Tabs.Screen name="billing/index" options={{ href: null }} />
      <Tabs.Screen
        name="reports/index"
        options={{
          title: t("tabs.reports"),
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="bar-chart" size={size} color={color} />,
        }}
      />
      {/* Settings is reached via the gear icon on Home, not a tab of its own. */}
      <Tabs.Screen name="settings/index" options={{ href: null, headerShown: false }} />
    </Tabs>
  );
}
