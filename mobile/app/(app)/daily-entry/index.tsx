import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { listEntries } from "../../../src/lib/api";
import type { LedgerEntry } from "../../../src/types";

function todayLabel() {
  return new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
}

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
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const total = entries.reduce((sum, e) => sum + Number(e.totalAmount), 0);

  return (
    <View style={styles.container}>
      <View style={styles.summary}>
        <Text style={styles.dateLabel}>{todayLabel()}</Text>
        <Text style={styles.totalLabel}>Total: ₹{total.toFixed(2)}</Text>
      </View>
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={entries.length === 0 ? styles.emptyList : undefined}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>No entries yet today. Tap "+ Add Entry" below to log one.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => router.push(`/(app)/daily-entry/${item.id}`)}>
            <View style={styles.rowLeft}>
              <Text style={styles.name}>{item.customer.name}</Text>
              {item.note ? <Text style={styles.note}>{item.note}</Text> : null}
            </View>
            <Text style={styles.amount}>₹{Number(item.totalAmount).toFixed(2)}</Text>
          </Pressable>
        )}
      />
      <Pressable style={styles.addButton} onPress={() => router.push("/(app)/daily-entry/new")}>
        <Text style={styles.addButtonText}>+ Add Entry</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  summary: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#f5f5f5",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ddd",
  },
  dateLabel: { fontSize: 15, color: "#444", fontWeight: "600" },
  totalLabel: { fontSize: 15, fontWeight: "700", color: "#1a73e8" },
  emptyList: { flexGrow: 1 },
  emptyText: { fontSize: 16, color: "#666", textAlign: "center" },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ddd",
  },
  rowLeft: { flex: 1, paddingRight: 12 },
  name: { fontSize: 17, fontWeight: "600" },
  note: { fontSize: 14, color: "#666", marginTop: 2 },
  amount: { fontSize: 16, fontWeight: "700", color: "#c62828" },
  addButton: {
    backgroundColor: "#1a73e8",
    paddingVertical: 16,
    alignItems: "center",
    margin: 16,
    borderRadius: 10,
  },
  addButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
