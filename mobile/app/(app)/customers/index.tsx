import { Ionicons } from "@expo/vector-icons";
import { useCallback, useMemo, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import { listCustomers } from "../../../src/lib/api";
import type { Customer } from "../../../src/types";
import { Avatar } from "../../../src/components/Avatar";
import { Badge } from "../../../src/components/Badge";
import { EmptyState } from "../../../src/components/EmptyState";
import { Fab, FabRow } from "../../../src/components/Fab";
import { LoadingView } from "../../../src/components/LoadingView";
import { colors, radius, spacing, typography } from "../../../src/theme/theme";

export default function CustomersList() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");

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

  const filtered = useMemo(() => {
    if (!customers) return [];
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => c.name.toLowerCase().includes(q) || c.phone?.includes(q));
  }, [customers, query]);

  if (customers === null) {
    return <LoadingView />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchWrapper}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search customers..."
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={filtered.length === 0 ? styles.emptyList : styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title={query ? "No matches" : "No customers yet"}
            description={query ? "Try a different name or number." : 'Tap "Add Customer" below to add your first one.'}
          />
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={() => router.push(`/(app)/customers/${item.id}`)}
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
                <Badge label="Inactive" tone="neutral" />
              ) : item.runningBalance > 0 ? (
                <Badge label="Due" tone="danger" />
              ) : (
                <Badge label="Settled" tone="success" />
              )}
            </View>
          </Pressable>
        )}
      />

      <FabRow>
        <Fab label="Add Customer" icon="person-add" onPress={() => router.push("/(app)/customers/new")} />
      </FabRow>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 15, color: colors.textPrimary },
  list: { paddingHorizontal: spacing.md, paddingBottom: 96 },
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
