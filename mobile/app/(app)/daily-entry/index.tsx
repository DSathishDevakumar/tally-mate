import { Ionicons } from "@expo/vector-icons";
import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { listEntries } from "../../../src/lib/api";
import type { LedgerEntry } from "../../../src/types";
import { Avatar } from "../../../src/components/Avatar";
import { Badge } from "../../../src/components/Badge";
import { EmptyState } from "../../../src/components/EmptyState";
import { Fab, FabRow } from "../../../src/components/Fab";
import { LoadingView } from "../../../src/components/LoadingView";
import { colors, radius, spacing, typography } from "../../../src/theme/theme";

function todayLabel() {
  return new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
}

const sourceIcon: Record<LedgerEntry["source"], keyof typeof Ionicons.glyphMap> = {
  MANUAL: "create-outline",
  VOICE: "mic",
  PHOTO: "camera",
};

export default function DailyEntryList() {
  const router = useRouter();
  const [entries, setEntries] = useState<LedgerEntry[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await listEntries();
      setEntries(data);
    } catch (err) {
      console.error("Failed to load entries", err);
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

  if (entries === null) {
    return <LoadingView />;
  }

  const total = entries.reduce((sum, e) => sum + Number(e.totalAmount), 0);

  return (
    <View style={styles.container}>
      <View style={styles.summary}>
        <View>
          <Text style={styles.dateLabel}>{todayLabel()}</Text>
          <Text style={styles.countLabel}>{entries.length} {entries.length === 1 ? "entry" : "entries"}</Text>
        </View>
        <Text style={styles.totalLabel}>₹{total.toFixed(2)}</Text>
      </View>

      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={entries.length === 0 ? styles.emptyList : styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <EmptyState
            icon="receipt-outline"
            title="No entries yet today"
            description="Use the buttons below to log a customer's purchase."
          />
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={() => router.push(`/(app)/daily-entry/${item.id}`)}
          >
            <Avatar name={item.customer.name} />
            <View style={styles.rowMiddle}>
              <Text style={styles.name}>{item.customer.name}</Text>
              {item.note ? (
                <Text style={styles.note} numberOfLines={1}>
                  {item.note}
                </Text>
              ) : null}
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.amount}>₹{Number(item.totalAmount).toFixed(2)}</Text>
              <View style={styles.sourceRow}>
                <Ionicons name={sourceIcon[item.source]} size={12} color={colors.textMuted} />
                {item.billId ? <Badge label="Billed" tone="neutral" /> : null}
              </View>
            </View>
          </Pressable>
        )}
      />

      <FabRow>
        <Fab icon="mic" variant="secondary" compact onPress={() => router.push("/(app)/daily-entry/voice")} />
        <Fab icon="camera" variant="secondary" compact onPress={() => router.push("/(app)/daily-entry/photo")} />
        <Fab label="Add Entry" icon="add" onPress={() => router.push("/(app)/daily-entry/new")} />
      </FabRow>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  summary: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dateLabel: { ...typography.bodyStrong, color: colors.textPrimary },
  countLabel: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  totalLabel: { ...typography.title, color: colors.primaryDark },
  list: { padding: spacing.md, paddingBottom: 110 },
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
  note: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  rowRight: { alignItems: "flex-end", gap: 4 },
  amount: { ...typography.bodyStrong, color: colors.danger },
  sourceRow: { flexDirection: "row", alignItems: "center", gap: 4 },
});
