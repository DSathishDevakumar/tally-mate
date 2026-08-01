import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { listCustomers } from "../../../src/lib/api";
import type { Customer } from "../../../src/types";

export default function CustomersList() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await listCustomers();
      setCustomers(data);
    } catch (err) {
      console.error("Failed to load customers", err);
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
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={customers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={customers.length === 0 ? styles.emptyList : undefined}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>No customers yet. Tap "+ Add Customer" below to add your first one.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => router.push(`/(app)/customers/${item.id}`)}>
            <View style={styles.rowLeft}>
              <Text style={styles.name}>{item.name}</Text>
              {item.phone ? <Text style={styles.phone}>{item.phone}</Text> : null}
            </View>
            <View style={styles.rowRight}>
              <Text style={[styles.balance, item.runningBalance > 0 && styles.balanceDue]}>
                ₹{item.runningBalance.toFixed(2)}
              </Text>
              {!item.isActive ? <Text style={styles.inactiveBadge}>Inactive</Text> : null}
            </View>
          </Pressable>
        )}
      />
      <Pressable style={styles.addButton} onPress={() => router.push("/(app)/customers/new")}>
        <Text style={styles.addButtonText}>+ Add Customer</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
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
  rowLeft: { flex: 1 },
  name: { fontSize: 17, fontWeight: "600" },
  phone: { fontSize: 14, color: "#666", marginTop: 2 },
  rowRight: { alignItems: "flex-end" },
  balance: { fontSize: 16, fontWeight: "600", color: "#333" },
  balanceDue: { color: "#c62828" },
  inactiveBadge: { fontSize: 12, color: "#999", marginTop: 2 },
  addButton: {
    backgroundColor: "#1a73e8",
    paddingVertical: 16,
    alignItems: "center",
    margin: 16,
    borderRadius: 10,
  },
  addButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
