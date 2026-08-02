import { useCallback, useState } from "react";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { getCustomerStatement } from "../../../src/lib/api";
import type { CustomerStatement } from "../../../src/types";
import { Avatar } from "../../../src/components/Avatar";
import { Badge } from "../../../src/components/Badge";
import { Card } from "../../../src/components/Card";
import { EmptyState } from "../../../src/components/EmptyState";
import { LoadingView } from "../../../src/components/LoadingView";
import { localeTagFor } from "../../../src/i18n";
import { colors, radius, spacing, typography } from "../../../src/theme/theme";

function formatDate(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
}

export default function CustomerStatementScreen() {
  const { t, i18n } = useTranslation();
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
  const locale = localeTagFor(i18n.language);

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
            <Badge label={isDue ? t("common.badgeDue") : t("common.badgeSettled")} tone={isDue ? "danger" : "success"} />
          </Card>

          <Card style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>₹{summary.totalCredit.toFixed(0)}</Text>
              <Text style={styles.statLabel}>{t("reports.totalCredit")}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statValue, styles.statValuePaid]}>₹{summary.totalPaid.toFixed(0)}</Text>
              <Text style={styles.statLabel}>{t("reports.totalPaid")}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{summary.entryCount}</Text>
              <Text style={styles.statLabel}>{t("reports.entries")}</Text>
            </View>
          </Card>

          {summary.dateRange ? (
            <Text style={styles.dateRangeLine}>
              {t("reports.dateRange")}: {formatDate(summary.dateRange.from, locale)} – {formatDate(summary.dateRange.to, locale)}
            </Text>
          ) : null}

          <Text style={styles.sectionTitle}>{t("reports.entryHistory")}</Text>
        </View>
      }
      ListEmptyComponent={
        <EmptyState
          icon="receipt-outline"
          title={t("reports.noEntriesTitle")}
          description={t("reports.noEntriesDescription", { name: customer.name })}
        />
      }
      renderItem={({ item }) => {
        const isPayment = item.type === "PAYMENT";
        const subtitle = item.note ?? (isPayment && item.paymentMethod ? t(`payments.method.${item.paymentMethod}`) : null);
        return (
          <View style={styles.row}>
            <View style={styles.rowMiddle}>
              <View style={styles.rowTitleLine}>
                <Text style={styles.rowDate}>{formatDate(item.date, locale)}</Text>
                {isPayment ? <Badge label={t("reports.paymentBadge")} tone="success" /> : null}
              </View>
              {subtitle ? (
                <Text style={styles.note} numberOfLines={1}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
            <View style={styles.rowRight}>
              <Text style={[styles.amount, isPayment && styles.amountPaid]}>
                {isPayment ? "− " : ""}₹{Number(item.amount).toFixed(2)}
              </Text>
              {!isPayment && item.billId ? <Badge label={t("common.badgeBilled")} tone="neutral" /> : null}
            </View>
          </View>
        );
      }}
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
  statValuePaid: { color: colors.success },
  statLabel: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  dateRangeLine: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.md },
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
  rowTitleLine: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  rowDate: { ...typography.bodyStrong, color: colors.textPrimary },
  note: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  rowRight: { alignItems: "flex-end", gap: 4 },
  amount: { ...typography.bodyStrong, color: colors.danger },
  amountPaid: { color: colors.success },
});
