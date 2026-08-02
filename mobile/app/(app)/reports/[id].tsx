import { useCallback, useState } from "react";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { getCustomerStatement } from "../../../src/lib/api";
import type { CustomerStatement } from "../../../src/types";
import { Avatar } from "../../../src/components/Avatar";
import { Badge } from "../../../src/components/Badge";
import { Card } from "../../../src/components/Card";
import { EmptyState } from "../../../src/components/EmptyState";
import { LoadingView } from "../../../src/components/LoadingView";
import { colors, radius, spacing, typography } from "../../../src/theme/theme";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export default function CustomerStatementScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [statement, setStatement] = useState<CustomerStatement | null>(null);

  const load = useCallback(() => {
    if (!id) return;
    getCustomerStatement(id).catch((err) => {
      console.error("Failed to load statement", err);
      return null;
    }).then((data) => {
      if (data) setStatement(data);
    });
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!statement) {
    return <LoadingView />;
  }

  const { customer, summary, entries } = statement;
  const isDue = customer.runningBalance > 0;

  return (
    <FlatList
      data={entries}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <View>
          <Card style={styles.balanceCard}>
            <Avatar name={customer.name} size={56} />
            <View style={styles.balanceText}>
              <Text style={styles.name}>{customer.name}</Text>
              <Text style={[styles.balance, isDue && styles.balanceDue]}>₹{customer.runningBalance.toFixed(2)}</Text>
            </View>
            <Badge label={isDue ? "Due" : "Settled"} tone={isDue ? "danger" : "success"} />
          </Card>

          <Card style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>₹{summary.totalCredit.toFixed(0)}</Text>
              <Text style={styles.statLabel}>Total Credit</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{summary.entryCount}</Text>
              <Text style={styles.statLabel}>Entries</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue} numberOfLines={1}>
                {summary.dateRange ? `${formatDate(summary.dateRange.from)} – ${formatDate(summary.dateRange.to)}` : "—"}
              </Text>
              <Text style={styles.statLabel}>Date Range</Text>
            </View>
          </Card>

          <Text style={styles.sectionTitle}>Entry History</Text>
        </View>
      }
      ListEmptyComponent={
        <EmptyState
          icon="receipt-outline"
          title="No entries yet"
          description={`${customer.name} has no ledger history.`}
        />
      }
      renderItem={({ item }) => (
        <View style={styles.row}>
          <View style={styles.rowMiddle}>
            <Text style={styles.rowDate}>{formatDate(item.entryDate)}</Text>
            {item.note ? (
              <Text style={styles.note} numberOfLines={1}>
                {item.note}
              </Text>
            ) : null}
          </View>
          <View style={styles.rowRight}>
            <Text style={styles.amount}>₹{Number(item.totalAmount).toFixed(2)}</Text>
            {item.billId ? <Badge label="Billed" tone="neutral" /> : null}
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.md, paddingBottom: 32 },
  balanceCard: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
  balanceText: { flex: 1 },
  name: { ...typography.bodyStrong, color: colors.textPrimary },
  balance: { ...typography.title, color: colors.textPrimary },
  balanceDue: { color: colors.danger },
  statsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.md },
  stat: { flex: 1, alignItems: "center" },
  statValue: { ...typography.bodyStrong, color: colors.textPrimary },
  statLabel: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  sectionTitle: { ...typography.heading, color: colors.textPrimary, marginBottom: spacing.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.sm + 4,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  rowMiddle: { flex: 1 },
  rowDate: { ...typography.bodyStrong, color: colors.textPrimary },
  note: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  rowRight: { alignItems: "flex-end", gap: 4 },
  amount: { ...typography.bodyStrong, color: colors.danger },
});
