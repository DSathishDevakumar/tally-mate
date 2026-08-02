import { Ionicons } from "@expo/vector-icons";
import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../src/context/AuthContext";
import { listCustomers, listEntries } from "../../src/lib/api";
import { Avatar } from "../../src/components/Avatar";
import { Card } from "../../src/components/Card";
import { Screen } from "../../src/components/Screen";
import { colors, radius, spacing, typography } from "../../src/theme/theme";

interface Stats {
  todayTotal: number;
  todayCount: number;
  customerCount: number;
  outstandingCount: number;
}

export default function Home() {
  const { t } = useTranslation();
  const { appUser, signOut } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      Promise.all([listEntries(), listCustomers()])
        .then(([entries, customers]) => {
          if (cancelled) return;
          setStats({
            todayTotal: entries.reduce((sum, e) => sum + Number(e.totalAmount), 0),
            todayCount: entries.length,
            customerCount: customers.length,
            outstandingCount: customers.filter((c) => c.runningBalance > 0).length,
          });
        })
        .catch((err) => console.error("Failed to load dashboard stats", err));
      return () => {
        cancelled = true;
      };
    }, [])
  );

  return (
    <Screen scroll>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.greeting}>{t("home.greeting")}</Text>
          <Text style={styles.name}>{appUser?.name}</Text>
        </View>
        <Avatar name={appUser?.name ?? "?"} size={52} />
      </View>

      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Ionicons name="today-outline" size={20} color={colors.primary} />
          <Text style={styles.statValue}>₹{(stats?.todayTotal ?? 0).toFixed(0)}</Text>
          <Text style={styles.statLabel}>{t("home.entriesTodayCount", { count: stats?.todayCount ?? 0 })}</Text>
        </Card>
        <Card style={styles.statCard}>
          <Ionicons name="people-outline" size={20} color={colors.accent} />
          <Text style={styles.statValue}>{stats?.customerCount ?? 0}</Text>
          <Text style={styles.statLabel}>{t("home.withDuesCount", { count: stats?.outstandingCount ?? 0 })}</Text>
        </Card>
      </View>

      <Text style={styles.sectionTitle}>{t("home.quickActions")}</Text>
      <ActionCard
        icon="mic"
        color={colors.accent}
        bg={colors.accentLight}
        title={t("home.actionVoiceTitle")}
        description={t("home.actionVoiceDescription")}
        onPress={() => router.push("/(app)/daily-entry/voice")}
      />
      <ActionCard
        icon="create-outline"
        color={colors.primary}
        bg={colors.primaryLight}
        title={t("home.actionManualTitle")}
        description={t("home.actionManualDescription")}
        onPress={() => router.push("/(app)/daily-entry/new")}
      />
      <ActionCard
        icon="person-add-outline"
        color={colors.warning}
        bg={colors.warningLight}
        title={t("home.actionNewCustomerTitle")}
        description={t("home.actionNewCustomerDescription")}
        onPress={() => router.push("/(app)/customers/new")}
      />

      <Pressable style={styles.signOutButton} onPress={signOut}>
        <Ionicons name="log-out-outline" size={18} color={colors.danger} />
        <Text style={styles.signOutText}>{t("home.signOut")}</Text>
      </Pressable>
    </Screen>
  );
}

function ActionCard({
  icon,
  color,
  bg,
  title,
  description,
  onPress,
}: Readonly<{
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  title: string;
  description: string;
  onPress: () => void;
}>) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && styles.pressed]}>
      <Card style={styles.actionCard}>
        <View style={[styles.actionIcon, { backgroundColor: bg }]}>
          <Ionicons name={icon} size={22} color={color} />
        </View>
        <View style={styles.actionText}>
          <Text style={styles.actionTitle}>{title}</Text>
          <Text style={styles.actionDescription}>{description}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.lg },
  headerText: { flex: 1 },
  greeting: { ...typography.body, color: colors.textSecondary },
  name: { ...typography.title, color: colors.textPrimary },
  statsRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg },
  statCard: { flex: 1, gap: 4 },
  statValue: { ...typography.title, color: colors.textPrimary, marginTop: spacing.xs },
  statLabel: { ...typography.caption, color: colors.textSecondary },
  sectionTitle: { ...typography.label, color: colors.textSecondary, marginBottom: spacing.sm, marginTop: spacing.xs },
  actionCard: { flexDirection: "row", alignItems: "center", marginBottom: spacing.sm },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  actionText: { flex: 1 },
  actionTitle: { ...typography.bodyStrong, color: colors.textPrimary },
  actionDescription: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  pressed: { opacity: 0.7 },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
  },
  signOutText: { ...typography.bodyStrong, color: colors.danger },
});
