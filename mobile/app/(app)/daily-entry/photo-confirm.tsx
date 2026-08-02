import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const router = useRouter();
  const { rows: rowsParam } = useLocalSearchParams<{ rows: string }>();
  const draftRows: PhotoDraftRow[] = useMemo(() => JSON.parse(rowsParam ?? "[]"), [rowsParam]);

  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [rows, setRows] = useState<EditableRow[]>(() =>
    draftRows.map((r, i) => ({
      key: String(i),
      // Only default straight to "create new customer" when there's an extracted name and
      // nothing similar already exists — if there are suggestions, force a deliberate choice
      // so a near-miss transliteration doesn't silently create a duplicate customer.
      customerId:
        r.matchedCustomer?.id ?? (r.extractedCustomerName && r.suggestedCustomers.length === 0 ? NEW_CUSTOMER_VALUE : ""),
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
      Alert.alert(t("photoEntry.nothingToSaveTitle"), t("photoEntry.nothingToSaveMessage"));
      return;
    }

    for (const [i, row] of rows.entries()) {
      if (!row.customerId) {
        Alert.alert(t("photoEntry.missingCustomerTitle"), t("photoEntry.missingCustomerMessage", { number: i + 1 }));
        return;
      }
      if (row.customerId === NEW_CUSTOMER_VALUE && !row.newCustomerName.trim()) {
        Alert.alert(t("photoEntry.missingNameTitle"), t("photoEntry.missingNameMessage", { number: i + 1 }));
        return;
      }
      const amt = Number(row.amount);
      if (!row.amount || !Number.isFinite(amt) || amt <= 0) {
        Alert.alert(t("photoEntry.invalidAmountTitle"), t("photoEntry.invalidAmountMessage", { number: i + 1 }));
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
        const draft = draftRows[Number(r.key)];
        return {
          customerId,
          amount: Number(r.amount),
          note: r.note.trim() || undefined,
          source: "PHOTO",
          customerNameNative: draft?.extractedCustomerNameNative ?? undefined,
          aiConfidence: r.confidence,
        };
      });

      await createEntriesBulk(entries);

      const entriesMessage = t("photoEntry.savedMessageEntries", {
        count: entries.length,
        noun: t(entries.length === 1 ? "photoEntry.entrySingular" : "photoEntry.entryPlural"),
      });
      const customersMessage = createdCustomers.length
        ? t("photoEntry.savedMessageWithCustomers", {
            count: createdCustomers.length,
            customerNoun: t(createdCustomers.length === 1 ? "photoEntry.customerSingular" : "photoEntry.customerPlural"),
          })
        : "";
      Alert.alert(t("photoEntry.savedTitle"), `${entriesMessage}${customersMessage}.`);
      router.back();
    } catch (err) {
      Alert.alert(t("common.saveFailedTitle"), err instanceof Error ? err.message : t("common.tryAgain"));
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
        {t("photoEntry.summary", {
          count: draftRows.length,
          noun: t(draftRows.length === 1 ? "photoEntry.entrySingular" : "photoEntry.entryPlural"),
        })}
      </Text>

      {rows.map((row, index) => {
        const draft = draftRows[Number(row.key)];
        return (
          <Card key={row.key} style={styles.rowCard}>
            <View style={styles.rowHeader}>
              <Text style={styles.rowTitle}>{t("photoEntry.rowLabel", { number: index + 1 })}</Text>
              <View style={styles.rowHeaderRight}>
                <Badge label={`${Math.round(row.confidence * 100)}%`} tone={confidenceTone(row.confidence)} />
                <Pressable onPress={() => removeRow(row.key)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                </Pressable>
              </View>
            </View>

            {draft?.extractedCustomerName && !draft.matchedCustomer ? (
              <Text style={styles.readAs}>
                {t("photoEntry.readAs", { name: draft.extractedCustomerName })}
                {draft.extractedCustomerNameNative
                  ? t("photoEntry.readAsNative", { native: draft.extractedCustomerNameNative })
                  : ""}
              </Text>
            ) : null}

            {draft && !draft.matchedCustomer && draft.suggestedCustomers.length > 0 ? (
              <View style={styles.suggestionBlock}>
                <Text style={styles.suggestionLabel}>{t("common.suggestedLabel")}</Text>
                <View style={styles.suggestionRow}>
                  {draft.suggestedCustomers.map((s) => (
                    <Pressable
                      key={s.id}
                      style={styles.suggestionChip}
                      onPress={() => updateRow(row.key, { customerId: s.id })}
                    >
                      <Text style={styles.suggestionChipText}>{s.name}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            <PickerField
              label={t("common.customer")}
              icon="person-outline"
              required
              selectedValue={row.customerId}
              onValueChange={(value) => updateRow(row.key, { customerId: value })}
            >
              <Picker.Item label={t("common.selectCustomerPlaceholder")} value="" />
              {customers.map((c) => (
                <Picker.Item key={c.id} label={c.name} value={c.id} />
              ))}
              <Picker.Item label={t("common.createNewCustomerOption")} value={NEW_CUSTOMER_VALUE} color={colors.accent} />
            </PickerField>

            {row.customerId === NEW_CUSTOMER_VALUE ? (
              <View style={styles.newCustomerBox}>
                <TextField
                  label={t("photoEntry.newCustomerNameLabel")}
                  icon="person-add-outline"
                  required
                  value={row.newCustomerName}
                  onChangeText={(text) => updateRow(row.key, { newCustomerName: text })}
                  placeholder={t("customers.namePlaceholder")}
                />
                <TextField
                  label={t("common.phoneOptional")}
                  icon="call-outline"
                  value={row.newCustomerPhone}
                  onChangeText={(text) => updateRow(row.key, { newCustomerPhone: text })}
                  placeholder={t("common.phonePlaceholder")}
                  keyboardType="phone-pad"
                />
              </View>
            ) : null}

            <TextField
              label={t("common.amount")}
              icon="cash-outline"
              required
              value={row.amount}
              onChangeText={(text) => updateRow(row.key, { amount: text })}
              placeholder="0"
              keyboardType="decimal-pad"
            />

            <TextField
              label={t("common.noteOptional")}
              icon="document-text-outline"
              value={row.note}
              onChangeText={(text) => updateRow(row.key, { note: text })}
              placeholder={t("common.itemsPlaceholder")}
            />
          </Card>
        );
      })}

      {rows.length === 0 ? (
        <Text style={styles.emptyText}>{t("photoEntry.allRemoved")}</Text>
      ) : (
        <Button
          label={t("photoEntry.saveAllButton", { count: rows.length })}
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
  suggestionBlock: { marginBottom: spacing.sm },
  suggestionLabel: { ...typography.label, color: colors.textSecondary, marginBottom: spacing.xs },
  suggestionRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  suggestionChip: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.full,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm + 4,
  },
  suggestionChipText: { ...typography.caption, color: colors.primaryDark, fontWeight: "700" },
  newCustomerBox: {
    backgroundColor: colors.accentLight,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  emptyText: { ...typography.body, color: colors.textSecondary, textAlign: "center", marginTop: spacing.lg },
});
