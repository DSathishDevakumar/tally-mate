import { useState } from "react";
import { useRouter } from "expo-router";
import { Alert } from "react-native";
import { useTranslation } from "react-i18next";
import { createCustomer } from "../../../src/lib/api";
import { Button } from "../../../src/components/Button";
import { Screen } from "../../../src/components/Screen";
import { TextField } from "../../../src/components/TextField";

export default function NewCustomer() {
  const { t } = useTranslation();
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
      Alert.alert(t("customers.nameRequiredTitle"), t("customers.nameRequiredMessage"));
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
      Alert.alert(t("common.saveFailedTitle"), err instanceof Error ? err.message : t("common.tryAgain"));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Screen scroll>
      <TextField
        label={t("common.name")}
        icon="person-outline"
        required
        value={name}
        onChangeText={setName}
        placeholder={t("customers.namePlaceholder")}
      />
      <TextField
        label={t("common.phone")}
        icon="call-outline"
        value={phone}
        onChangeText={setPhone}
        placeholder={t("common.phonePlaceholder")}
        keyboardType="phone-pad"
      />
      <TextField
        label={t("common.address")}
        icon="location-outline"
        value={address}
        onChangeText={setAddress}
        placeholder={t("customers.addressPlaceholder")}
      />
      <TextField
        label={t("customers.creditLimit")}
        icon="card-outline"
        value={creditLimit}
        onChangeText={setCreditLimit}
        placeholder={t("customers.creditLimitPlaceholder")}
        keyboardType="decimal-pad"
      />
      <TextField
        label={t("customers.openingBalance")}
        icon="wallet-outline"
        value={openingBalance}
        onChangeText={setOpeningBalance}
        placeholder="0"
        keyboardType="decimal-pad"
      />
      <TextField
        label={t("common.notes")}
        icon="document-text-outline"
        value={notes}
        onChangeText={setNotes}
        placeholder={t("customers.notesPlaceholder")}
        multiline
      />

      <Button label={t("customers.saveButton")} onPress={handleSave} loading={isSaving} style={{ marginTop: 8 }} />
    </Screen>
  );
}
