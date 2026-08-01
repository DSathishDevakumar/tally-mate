import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
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
import { deleteEntry, listEntries, updateEntry } from "../../../src/lib/api";
import type { LedgerEntry } from "../../../src/types";

export default function EntryDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [entry, setEntry] = useState<LedgerEntry | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    // Entries don't have a get-by-id endpoint yet (list is the only read path),
    // so pull today's list and find it — fine while entries only ever get
    // edited on the same day they're created.
    listEntries().then((entries) => {
      const found = entries.find((e) => e.id === id) ?? null;
      setEntry(found);
      if (found) {
        setAmount(found.totalAmount);
        setNote(found.note ?? "");
      }
    });
  }, [id]);

  async function handleSave() {
    if (!id) return;
    const parsedAmount = Number(amount);
    if (!amount || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      Alert.alert("Amount required", "Please enter a valid amount greater than 0.");
      return;
    }

    setIsSaving(true);
    try {
      const updated = await updateEntry(id, { amount: parsedAmount, note: note.trim() || undefined });
      setEntry(updated);
      Alert.alert("Saved", "Entry updated.");
    } catch (err) {
      Alert.alert("Failed to save", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleDelete() {
    if (!id) return;
    Alert.alert("Delete entry?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteEntry(id);
            router.back();
          } catch (err) {
            Alert.alert("Failed to delete", err instanceof Error ? err.message : "Please try again.");
          }
        },
      },
    ]);
  }

  if (!entry) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (entry.billId) {
    return (
      <View style={styles.center}>
        <Text style={styles.name}>{entry.customer.name}</Text>
        <Text style={styles.amount}>₹{Number(entry.totalAmount).toFixed(2)}</Text>
        <Text style={styles.billedNotice}>This entry has already been billed and can't be changed.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.name}>{entry.customer.name}</Text>

        <Text style={styles.label}>Amount *</Text>
        <TextInput style={styles.input} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />

        <Text style={styles.label}>Note</Text>
        <TextInput style={[styles.input, styles.multiline]} value={note} onChangeText={setNote} multiline />

        <Pressable style={styles.saveButton} onPress={handleSave} disabled={isSaving}>
          <Text style={styles.saveButtonText}>{isSaving ? "Saving..." : "Save Changes"}</Text>
        </Pressable>

        <Pressable style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteButtonText}>Delete Entry</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 4 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 8 },
  name: { fontSize: 20, fontWeight: "700", marginBottom: 8 },
  amount: { fontSize: 24, fontWeight: "700", color: "#c62828" },
  billedNotice: { fontSize: 14, color: "#666", textAlign: "center", marginTop: 8 },
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
  saveButton: {
    backgroundColor: "#1a73e8",
    paddingVertical: 16,
    alignItems: "center",
    borderRadius: 10,
    marginTop: 24,
  },
  saveButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  deleteButton: {
    paddingVertical: 16,
    alignItems: "center",
    borderRadius: 10,
    marginTop: 12,
  },
  deleteButtonText: { color: "#c62828", fontSize: 15, fontWeight: "600" },
});
