import { useState } from "react";
import { useRouter } from "expo-router";
import { Alert } from "react-native";
import { createCustomer } from "../../../src/lib/api";
import { Button } from "../../../src/components/Button";
import { Screen } from "../../../src/components/Screen";
import { TextField } from "../../../src/components/TextField";

export default function NewCustomer() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert("Name required", "Please enter the customer's name.");
      return;
    }

    setIsSaving(true);
    try {
      await createCustomer({
        name: name.trim(),
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        creditLimit: creditLimit ? Number(creditLimit) : undefined,
        openingBalance: openingBalance ? Number(openingBalance) : undefined,
        notes: notes.trim() || undefined,
      });
      router.back();
    } catch (err) {
      Alert.alert("Failed to save", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Screen scroll>
      <TextField label="Name" icon="person-outline" required value={name} onChangeText={setName} placeholder="Customer name" />
      <TextField
        label="Phone"
        icon="call-outline"
        value={phone}
        onChangeText={setPhone}
        placeholder="Phone number"
        keyboardType="phone-pad"
      />
      <TextField label="Address" icon="location-outline" value={address} onChangeText={setAddress} placeholder="Address" />
      <TextField
        label="Credit Limit"
        icon="card-outline"
        value={creditLimit}
        onChangeText={setCreditLimit}
        placeholder="No limit"
        keyboardType="decimal-pad"
      />
      <TextField
        label="Opening Balance"
        icon="wallet-outline"
        value={openingBalance}
        onChangeText={setOpeningBalance}
        placeholder="0"
        keyboardType="decimal-pad"
      />
      <TextField
        label="Notes"
        icon="document-text-outline"
        value={notes}
        onChangeText={setNotes}
        placeholder="Optional notes"
        multiline
      />

      <Button label="Save Customer" onPress={handleSave} loading={isSaving} style={{ marginTop: 8 }} />
    </Screen>
  );
}
