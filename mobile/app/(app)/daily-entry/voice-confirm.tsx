import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Alert, Modal, StyleSheet, Text, View } from "react-native";
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
      Alert.alert("Name required", "Please enter the customer's name.");
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
      Alert.alert("Failed to create customer", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setIsSavingCustomer(false);
    }
  }

  async function handleSave() {
    if (!customerId) {
      Alert.alert("Customer required", "Please select which customer this entry belongs to.");
      return;
    }
    const parsedAmount = Number(amount);
    if (!amount || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      Alert.alert("Amount required", "Please enter a valid amount greater than 0.");
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
        aiConfidence: draft.confidence,
      });
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

  const needsAttention = !draft.matchedCustomer;

  return (
    <Screen scroll>
      <Card style={styles.transcriptCard}>
        <View style={styles.transcriptHeader}>
          <Ionicons name="mic" size={14} color={colors.accent} />
          <Text style={styles.transcriptLabel}>Heard</Text>
        </View>
        <Text style={styles.transcript}>"{draft.transcript || "(no speech detected)"}"</Text>
      </Card>

      {needsAttention ? (
        <Card style={styles.warningCard}>
          <Ionicons name="alert-circle" size={18} color={colors.warning} />
          <Text style={styles.warningText}>
            {draft.extractedCustomerName
              ? `Couldn't confidently match "${draft.extractedCustomerName}" to a customer — please pick one below.`
              : "No customer name was recognized — please select one below."}
          </Text>
        </Card>
      ) : null}

      <PickerField label="Customer" icon="person-outline" required selectedValue={customerId} onValueChange={handleCustomerPickerChange}>
        <Picker.Item label="Select a customer..." value="" />
        {customers.map((c) => (
          <Picker.Item key={c.id} label={c.name} value={c.id} />
        ))}
        <Picker.Item label="+ Create new customer..." value={NEW_CUSTOMER_VALUE} color={colors.accent} />
      </PickerField>

      <TextField
        label="Amount"
        icon="cash-outline"
        required
        value={amount}
        onChangeText={setAmount}
        placeholder="0"
        keyboardType="decimal-pad"
      />

      <TextField
        label="Note (optional)"
        icon="document-text-outline"
        value={note}
        onChangeText={setNote}
        placeholder="e.g. rice, oil, soap"
        multiline
      />

      <Button label="Confirm & Save" onPress={handleSave} loading={isSaving} style={{ marginTop: 8 }} />

      <Modal visible={isCreatingCustomer} transparent animationType="fade" onRequestClose={() => setIsCreatingCustomer(false)}>
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Customer</Text>
            <TextField
              label="Name"
              icon="person-outline"
              required
              value={newCustomerName}
              onChangeText={setNewCustomerName}
              placeholder="Customer name"
            />
            <TextField
              label="Phone (optional)"
              icon="call-outline"
              value={newCustomerPhone}
              onChangeText={setNewCustomerPhone}
              placeholder="Phone number"
              keyboardType="phone-pad"
            />
            <View style={styles.modalActions}>
              <Button
                label="Cancel"
                variant="ghost"
                onPress={() => setIsCreatingCustomer(false)}
                style={styles.modalActionButton}
              />
              <Button
                label="Create Customer"
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
  warningCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    backgroundColor: colors.warningLight,
    marginBottom: spacing.md,
    borderRadius: radius.md,
  },
  warningText: { ...typography.body, color: colors.warning, flex: 1, lineHeight: 20 },
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
