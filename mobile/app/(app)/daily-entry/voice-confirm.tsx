import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Alert, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { createCustomer, createEntry, listCustomers } from "../../../src/lib/api";
import type { Customer, VoiceDraft } from "../../../src/types";
import { Button } from "../../../src/components/Button";
import { Card } from "../../../src/components/Card";
import { LoadingView } from "../../../src/components/LoadingView";
import { PickerField } from "../../../src/components/PickerField";
import { Screen } from "../../../src/components/Screen";
import { TextField } from "../../../src/components/TextField";
import { colors, radius, spacing, typography } from "../../../src/theme/theme";

const NEW_CUSTOMER_VALUE = "__new__";

export default function VoiceConfirm() {
  const { t } = useTranslation();
  const router = useRouter();
  const { draft: draftParam } = useLocalSearchParams<{ draft: string }>();
  const draft: VoiceDraft = useMemo(() => JSON.parse(draftParam ?? "{}"), [draftParam]);

  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [customerId, setCustomerId] = useState(draft.matchedCustomer?.id ?? "");
  const [amount, setAmount] = useState(draft.amount != null ? String(draft.amount) : "");
  const [note, setNote] = useState(draft.note ?? "");
  const [isSaving, setIsSaving] = useState(false);

  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);

  useEffect(() => {
    listCustomers()
      .then((data) => setCustomers(data.filter((c) => c.isActive)))
      .catch((err) => {
        console.error("Failed to load customers", err);
        setCustomers([]);
      });
  }, []);

  function handleCustomerPickerChange(value: string) {
    if (value === NEW_CUSTOMER_VALUE) {
      setNewCustomerName(draft.extractedCustomerName ?? "");
      setNewCustomerPhone("");
      setIsCreatingCustomer(true);
      return;
    }
    setCustomerId(value);
  }

  async function handleCreateCustomer() {
    if (!newCustomerName.trim()) {
      Alert.alert(t("customers.nameRequiredTitle"), t("customers.nameRequiredMessage"));
      return;
    }

    setIsSavingCustomer(true);
    try {
      const customer = await createCustomer({
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim() || undefined,
      });
      setCustomers((prev) => [...(prev ?? []), customer]);
      setCustomerId(customer.id);
      setIsCreatingCustomer(false);
    } catch (err) {
      Alert.alert(t("voiceEntry.createCustomerFailedTitle"), err instanceof Error ? err.message : t("common.tryAgain"));
    } finally {
      setIsSavingCustomer(false);
    }
  }

  async function handleSave() {
    if (!customerId) {
      Alert.alert(t("dailyEntry.customerRequiredTitle"), t("voiceEntry.customerRequiredMessage"));
      return;
    }
    const parsedAmount = Number(amount);
    if (!amount || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      Alert.alert(t("common.amountRequiredTitle"), t("common.amountRequiredMessage"));
      return;
    }

    setIsSaving(true);
    try {
      await createEntry({
        customerId,
        amount: parsedAmount,
        note: note.trim() || undefined,
        source: "VOICE",
        rawVoiceText: draft.transcript,
        customerNameNative: draft.extractedCustomerNameNative ?? undefined,
        aiConfidence: draft.confidence,
      });
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

  const needsAttention = !customerId;

  return (
    <Screen scroll>
      <Card style={styles.transcriptCard}>
        <View style={styles.transcriptHeader}>
          <Ionicons name="mic" size={14} color={colors.accent} />
          <Text style={styles.transcriptLabel}>{t("voiceEntry.heardLabel")}</Text>
        </View>
        <Text style={styles.transcript}>"{draft.transcript || t("voiceEntry.noSpeechDetected")}"</Text>
      </Card>

      {draft.extractedCustomerNameNative ? (
        <Text style={styles.nativeName}>{t("voiceEntry.writtenAs", { name: draft.extractedCustomerNameNative })}</Text>
      ) : null}

      {needsAttention ? (
        <Card style={styles.warningCard}>
          <View style={styles.warningRow}>
            <Ionicons name="alert-circle" size={18} color={colors.warning} />
            <Text style={styles.warningText}>
              {draft.extractedCustomerName
                ? t("voiceEntry.matchFailedWithName", { name: draft.extractedCustomerName })
                : t("voiceEntry.matchFailedNoName")}
            </Text>
          </View>
          {draft.suggestedCustomers.length > 0 ? (
            <View>
              <Text style={styles.suggestionLabel}>{t("common.suggestedLabel")}</Text>
              <View style={styles.suggestionRow}>
                {draft.suggestedCustomers.map((s) => (
                  <Pressable key={s.id} style={styles.suggestionChip} onPress={() => setCustomerId(s.id)}>
                    <Text style={styles.suggestionChipText}>{s.name}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
        </Card>
      ) : null}

      <PickerField label={t("common.customer")} icon="person-outline" required selectedValue={customerId} onValueChange={handleCustomerPickerChange}>
        <Picker.Item label={t("common.selectCustomerPlaceholder")} value="" />
        {customers.map((c) => (
          <Picker.Item key={c.id} label={c.name} value={c.id} />
        ))}
        <Picker.Item label={t("common.createNewCustomerOption")} value={NEW_CUSTOMER_VALUE} color={colors.accent} />
      </PickerField>

      <TextField
        label={t("common.amount")}
        icon="cash-outline"
        required
        value={amount}
        onChangeText={setAmount}
        placeholder="0"
        keyboardType="decimal-pad"
      />

      <TextField
        label={t("common.noteOptional")}
        icon="document-text-outline"
        value={note}
        onChangeText={setNote}
        placeholder={t("common.itemsPlaceholder")}
        multiline
      />

      <Button label={t("voiceEntry.confirmSaveButton")} onPress={handleSave} loading={isSaving} style={{ marginTop: 8 }} />

      <Modal visible={isCreatingCustomer} transparent animationType="fade" onRequestClose={() => setIsCreatingCustomer(false)}>
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t("voiceEntry.newCustomerModalTitle")}</Text>
            <TextField
              label={t("common.name")}
              icon="person-outline"
              required
              value={newCustomerName}
              onChangeText={setNewCustomerName}
              placeholder={t("customers.namePlaceholder")}
            />
            <TextField
              label={t("common.phoneOptional")}
              icon="call-outline"
              value={newCustomerPhone}
              onChangeText={setNewCustomerPhone}
              placeholder={t("common.phonePlaceholder")}
              keyboardType="phone-pad"
            />
            <View style={styles.modalActions}>
              <Button
                label={t("common.cancel")}
                variant="ghost"
                onPress={() => setIsCreatingCustomer(false)}
                style={styles.modalActionButton}
              />
              <Button
                label={t("voiceEntry.createCustomerButton")}
                onPress={handleCreateCustomer}
                loading={isSavingCustomer}
                style={styles.modalActionButton}
              />
            </View>
          </Card>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  transcriptCard: { backgroundColor: colors.accentLight, marginBottom: spacing.md },
  transcriptHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  transcriptLabel: { ...typography.label, color: colors.accent, textTransform: "uppercase" },
  transcript: { ...typography.body, color: colors.textPrimary, fontStyle: "italic" },
  nativeName: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.md },
  warningCard: {
    backgroundColor: colors.warningLight,
    marginBottom: spacing.md,
    borderRadius: radius.md,
    gap: spacing.sm,
  },
  warningRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  warningText: { ...typography.body, color: colors.warning, flex: 1, lineHeight: 20 },
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
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  modalCard: { width: "100%" },
  modalTitle: { ...typography.heading, color: colors.textPrimary, marginBottom: spacing.md },
  modalActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  modalActionButton: { flex: 1 },
});
