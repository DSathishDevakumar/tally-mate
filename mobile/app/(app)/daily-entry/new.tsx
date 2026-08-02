import { Picker } from "@react-native-picker/picker";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Alert } from "react-native";
import { createEntry, listCustomers } from "../../../src/lib/api";
import type { Customer } from "../../../src/types";
import { Button } from "../../../src/components/Button";
import { EmptyState } from "../../../src/components/EmptyState";
import { LoadingView } from "../../../src/components/LoadingView";
import { PickerField } from "../../../src/components/PickerField";
import { Screen } from "../../../src/components/Screen";
import { TextField } from "../../../src/components/TextField";

export default function NewEntry() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [customerId, setCustomerId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    listCustomers()
      .then((data) => setCustomers(data.filter((c) => c.isActive)))
      .catch((err) => {
        console.error("Failed to load customers", err);
        setCustomers([]);
      });
  }, []);

  async function handleSave() {
    if (!customerId) {
      Alert.alert("Customer required", "Please select a customer.");
      return;
    }
    const parsedAmount = Number(amount);
    if (!amount || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      Alert.alert("Amount required", "Please enter a valid amount greater than 0.");
      return;
    }

    setIsSaving(true);
    try {
      await createEntry({ customerId, amount: parsedAmount, note: note.trim() || undefined });
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

  if (customers.length === 0) {
    return (
      <EmptyState
        icon="person-add-outline"
        title="No active customers"
        description="Add one from the Customers tab before logging an entry."
      />
    );
  }

  return (
    <Screen scroll>
      <PickerField label="Customer" icon="person-outline" required selectedValue={customerId} onValueChange={setCustomerId}>
        <Picker.Item label="Select a customer..." value="" />
        {customers.map((c) => (
          <Picker.Item key={c.id} label={c.name} value={c.id} />
        ))}
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

      <Button label="Save Entry" onPress={handleSave} loading={isSaving} style={{ marginTop: 8 }} />
    </Screen>
  );
}
