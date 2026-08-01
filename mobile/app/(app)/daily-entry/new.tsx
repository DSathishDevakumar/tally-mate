import { Picker } from "@react-native-picker/picker";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { createEntry, listCustomers } from "../../../src/lib/api";
import type { Customer } from "../../../src/types";

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
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (customers.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>
          You don't have any active customers yet. Add one from the Customers tab first.
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.label}>Customer *</Text>
        <View style={styles.pickerWrapper}>
          <Picker selectedValue={customerId} onValueChange={setCustomerId}>
            <Picker.Item label="Select a customer..." value="" />
            {customers.map((c) => (
              <Picker.Item key={c.id} label={c.name} value={c.id} />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>Amount *</Text>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          placeholder="0"
          keyboardType="decimal-pad"
        />

        <Text style={styles.label}>Note (optional)</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={note}
          onChangeText={setNote}
          placeholder="e.g. rice, oil, soap"
          multiline
        />

        <Pressable style={styles.saveButton} onPress={handleSave} disabled={isSaving}>
          <Text style={styles.saveButtonText}>{isSaving ? "Saving..." : "Save Entry"}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 4 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  emptyText: { fontSize: 16, color: "#666", textAlign: "center" },
  label: { fontSize: 14, fontWeight: "600", color: "#444", marginTop: 12 },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    marginTop: 4,
    overflow: "hidden",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginTop: 4,
  },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  saveButton: {
    backgroundColor: "#1a73e8",
    paddingVertical: 16,
    alignItems: "center",
    borderRadius: 10,
    marginTop: 24,
  },
  saveButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
