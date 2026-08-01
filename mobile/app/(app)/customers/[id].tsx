import { useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { getCustomer, updateCustomer } from "../../../src/lib/api";
import type { Customer } from "../../../src/types";

export default function CustomerDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    getCustomer(id).then((c) => {
      setCustomer(c);
      setName(c.name);
      setPhone(c.phone ?? "");
      setAddress(c.address ?? "");
      setCreditLimit(c.creditLimit ?? "");
      setNotes(c.notes ?? "");
      setIsActive(c.isActive);
    });
  }, [id]);

  async function handleSave() {
    if (!id || !name.trim()) return;
    setIsSaving(true);
    try {
      const updated = await updateCustomer(id, {
        name: name.trim(),
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        creditLimit: creditLimit ? Number(creditLimit) : undefined,
        notes: notes.trim() || undefined,
        isActive,
      });
      setCustomer(updated);
      Alert.alert("Saved", "Customer updated.");
    } catch (err) {
      Alert.alert("Failed to save", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  if (!customer) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.balanceLabel}>Running Balance</Text>
        <Text style={[styles.balance, customer.runningBalance > 0 && styles.balanceDue]}>
          ₹{customer.runningBalance.toFixed(2)}
        </Text>

        <Text style={styles.label}>Name *</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} />

        <Text style={styles.label}>Phone</Text>
        <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

        <Text style={styles.label}>Address</Text>
        <TextInput style={styles.input} value={address} onChangeText={setAddress} />

        <Text style={styles.label}>Credit Limit</Text>
        <TextInput style={styles.input} value={creditLimit} onChangeText={setCreditLimit} keyboardType="decimal-pad" />

        <Text style={styles.label}>Notes</Text>
        <TextInput style={[styles.input, styles.multiline]} value={notes} onChangeText={setNotes} multiline />

        <View style={styles.switchRow}>
          <Text style={styles.label}>Active</Text>
          <Switch value={isActive} onValueChange={setIsActive} />
        </View>

        <Pressable style={styles.saveButton} onPress={handleSave} disabled={isSaving}>
          <Text style={styles.saveButtonText}>{isSaving ? "Saving..." : "Save Changes"}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 4 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  balanceLabel: { fontSize: 14, color: "#666" },
  balance: { fontSize: 28, fontWeight: "700", color: "#333", marginBottom: 12 },
  balanceDue: { color: "#c62828" },
  label: { fontSize: 14, fontWeight: "600", color: "#444", marginTop: 12 },
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
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16 },
  saveButton: {
    backgroundColor: "#1a73e8",
    paddingVertical: 16,
    alignItems: "center",
    borderRadius: 10,
    marginTop: 24,
  },
  saveButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
