import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { listCustomerReports } from "../../../src/lib/api";
import type { CustomerReportSummary } from "../../../src/types";
import { Avatar } from "../../../src/components/Avatar";
import { Badge } from "../../../src/components/Badge";
import { EmptyState } from "../../../src/components/EmptyState";
import { LoadingView } from "../../../src/components/LoadingView";
import { colors, radius, spacing, typography } from "../../../src/theme/theme";

export default function ReportsList() {
  const { t } = useTranslation();
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerReportSummary[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await listCustomerReports();
      setCustomers(data);
    } catch (err) {
      console.error("Failed to load reports", err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (customers === null) {
    return <LoadingView />;
  }

  return (
    <FlatList
      data={customers}
      keyExtractor={(item) => item.id}
      contentContainerStyle={customers.length === 0 ? styles.emptyList : styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListEmptyComponent={
        <EmptyState
          icon="bar-chart-outline"
          title={t("reports.emptyTitle")}
          description={t("reports.emptyDescription")}
        />
      }
      renderItem={({ item }) => (
        <Pressable
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          onPress={() => router.push(`/(app)/reports/${item.id}`)}
        >
          <Avatar name={item.name} />
          <View style={styles.rowMiddle}>
            <Text style={styles.name}>{item.name}</Text>
            {item.phone ? <Text style={styles.phone}>{item.phone}</Text> : null}
          </View>
          <View style={styles.rowRight}>
            <Text style={[styles.balance, item.runningBalance > 0 && styles.balanceDue]}>
              ₹{item.runningBalance.toFixed(0)}
            </Text>
            {!item.isActive ? (
              <Badge label={t("common.badgeInactive")} tone="neutral" />
            ) : item.runningBalance > 0 ? (
              <Badge label={t("common.badgeDue")} tone="danger" />
            ) : (
              <Badge label={t("common.badgeSettled")} tone="success" />
            )}
          </View>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.md, paddingBottom: 32 },
  emptyList: { flexGrow: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.sm + 4,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  rowPressed: { opacity: 0.7 },
  rowMiddle: { flex: 1 },
  name: { ...typography.bodyStrong, color: colors.textPrimary },
  phone: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  rowRight: { alignItems: "flex-end", gap: 4 },
  balance: { ...typography.bodyStrong, color: colors.textPrimary },
  balanceDue: { color: colors.danger },
});
