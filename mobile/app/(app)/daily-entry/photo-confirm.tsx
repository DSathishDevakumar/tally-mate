import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { createCustomersBulk, createEntriesBulk, listCustomers } from "../../../src/lib/api";
import type { BulkEntryInput, Customer, PhotoDraftRow } from "../../../src/types";
import { Badge } from "../../../src/components/Badge";
import { Button } from "../../../src/components/Button";
import { Card } from "../../../src/components/Card";
import { LoadingView } from "../../../src/components/LoadingView";
import { PickerField } from "../../../src/components/PickerField";
import { Screen } from "../../../src/components/Screen";
import { TextField } from "../../../src/components/TextField";
import { colors, radius, spacing, typography } from "../../../src/theme/theme";

const NEW_CUSTOMER_VALUE = "__new__";

interface EditableRow {
  key: string;
  customerId: string;
  newCustomerName: string;
  newCustomerPhone: string;
  amount: string;
  note: string;
  confidence: number;
}

function confidenceTone(confidence: number): "success" | "warning" | "danger" {
  if (confidence >= 0.7) return "success";
  if (confidence >= 0.4) return "warning";
  return "danger";
}

export default function PhotoConfirm() {
  const router = useRouter();
  const { rows: rowsParam } = useLocalSearchParams<{ rows: string }>();
  const draftRows: PhotoDraftRow[] = useMemo(() => JSON.parse(rowsParam ?? "[]"), [rowsParam]);

  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [rows, setRows] = useState<EditableRow[]>(() =>
    draftRows.map((r, i) => ({
      key: String(i),
      customerId: r.matchedCustomer?.id ?? (r.extractedCustomerName ? NEW_CUSTOMER_VALUE : ""),
      newCustomerName: r.matchedCustomer ? "" : (r.extractedCustomerName ?? ""),
      newCustomerPhone: "",
      amount: r.amount != null ? String(r.amount) : "",
      note: r.note ?? "",
      confidence: r.confidence,
    }))
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    listCustomers()
      .then((data) => setCustomers(data.filter((c) => c.isActive)))
      .catch((err) => {
        console.error("Failed to load customers", err);
        setCustomers([]);
      });
  }, []);

  function updateRow(key: string, patch: Partial<EditableRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function removeRow(key: string) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  async function handleSaveAll() {
    if (rows.length === 0) {
      Alert.alert("Nothing to save", "All rows have been removed.");
      return;
    }

    for (const [i, row] of rows.entries()) {
      if (!row.customerId) {
        Alert.alert("Missing customer", `Row ${i + 1} needs a customer selected.`);
        return;
      }
      if (row.customerId === NEW_CUSTOMER_VALUE && !row.newCustomerName.trim()) {
        Alert.alert("Missing name", `Row ${i + 1}'s new customer needs a name.`);
        return;
      }
      const amt = Number(row.amount);
      if (!row.amount || !Number.isFinite(amt) || amt <= 0) {
        Alert.alert("Invalid amount", `Row ${i + 1} needs a valid amount greater than 0.`);
        return;
      }
    }

    setIsSaving(true);
    try {
      // Step 1: bulk-create any customers that don't exist yet, one shot.
      const newRows = rows.filter((r) => r.customerId === NEW_CUSTOMER_VALUE);
      let createdCustomers: Customer[] = [];
      if (newRows.length > 0) {
        createdCustomers = await createCustomersBulk(
          newRows.map((r) => ({ name: r.newCustomerName.trim(), phone: r.newCustomerPhone.trim() || undefined }))
        );
      }

      // Step 2: resolve every row to a real customerId, then save all entries in one shot.
      let newIndex = 0;
      const entries: BulkEntryInput[] = rows.map((r) => {
        const customerId = r.customerId === NEW_CUSTOMER_VALUE ? createdCustomers[newIndex++]!.id : r.customerId;
        return {
          customerId,
          amount: Number(r.amount),
          note: r.note.trim() || undefined,
          source: "PHOTO",
          aiConfidence: r.confidence,
        };
      });

      await createEntriesBulk(entries);

      Alert.alert(
        "Saved",
        `Saved ${entries.length} ${entries.length === 1 ? "entry" : "entries"}${
          createdCustomers.length
            ? ` and added ${createdCustomers.length} new customer${createdCustomers.length === 1 ? "" : "s"}`
            : ""
        }.`
      );
      router.back();
    } catch (err) {
      Alert.alert("Failed to save", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  if (customers === null) {
    return <LoadingView />;
  }

  return (
    <Screen scroll>
      <Text style={styles.summary}>
        Found {draftRows.length} {draftRows.length === 1 ? "entry" : "entries"} in this photo. Review each one
        below, remove any that were misread, then save them all at once.
      </Text>

      {rows.map((row, index) => {
        const draft = draftRows[Number(row.key)];
        return (
          <Card key={row.key} style={styles.rowCard}>
            <View style={styles.rowHeader}>
              <Text style={styles.rowTitle}>Row {index + 1}</Text>
              <View style={styles.rowHeaderRight}>
                <Badge label={`${Math.round(row.confidence * 100)}%`} tone={confidenceTone(row.confidence)} />
                <Pressable onPress={() => removeRow(row.key)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                </Pressable>
              </View>
            </View>

            {draft?.extractedCustomerName && !draft.matchedCustomer ? (
              <Text style={styles.readAs}>Read as "{draft.extractedCustomerName}"</Text>
            ) : null}

            <PickerField
              label="Customer"
              icon="person-outline"
              required
              selectedValue={row.customerId}
              onValueChange={(value) => updateRow(row.key, { customerId: value })}
            >
              <Picker.Item label="Select a customer..." value="" />
              {customers.map((c) => (
                <Picker.Item key={c.id} label={c.name} value={c.id} />
              ))}
              <Picker.Item label="+ Create new customer..." value={NEW_CUSTOMER_VALUE} color={colors.accent} />
            </PickerField>

            {row.customerId === NEW_CUSTOMER_VALUE ? (
              <View style={styles.newCustomerBox}>
                <TextField
                  label="New Customer Name"
                  icon="person-add-outline"
                  required
                  value={row.newCustomerName}
                  onChangeText={(text) => updateRow(row.key, { newCustomerName: text })}
                  placeholder="Customer name"
                />
                <TextField
                  label="Phone (optional)"
                  icon="call-outline"
                  value={row.newCustomerPhone}
                  onChangeText={(text) => updateRow(row.key, { newCustomerPhone: text })}
                  placeholder="Phone number"
                  keyboardType="phone-pad"
                />
              </View>
            ) : null}

            <TextField
              label="Amount"
              icon="cash-outline"
              required
              value={row.amount}
              onChangeText={(text) => updateRow(row.key, { amount: text })}
              placeholder="0"
              keyboardType="decimal-pad"
            />

            <TextField
              label="Note (optional)"
              icon="document-text-outline"
              value={row.note}
              onChangeText={(text) => updateRow(row.key, { note: text })}
              placeholder="e.g. rice, oil, soap"
            />
          </Card>
        );
      })}

      {rows.length === 0 ? (
        <Text style={styles.emptyText}>All rows removed — go back and retake the photo if needed.</Text>
      ) : (
        <Button
          label={`Save All (${rows.length})`}
          onPress={handleSaveAll}
          loading={isSaving}
          style={{ marginTop: spacing.sm }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.md, lineHeight: 20 },
  rowCard: { marginBottom: spacing.md },
  rowHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xs },
  rowTitle: { ...typography.label, color: colors.textSecondary, textTransform: "uppercase" },
  rowHeaderRight: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  readAs: { ...typography.caption, color: colors.textMuted, fontStyle: "italic", marginBottom: spacing.sm },
  newCustomerBox: {
    backgroundColor: colors.accentLight,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  emptyText: { ...typography.body, color: colors.textSecondary, textAlign: "center", marginTop: spacing.lg },
});
