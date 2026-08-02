import { useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { Alert, StyleSheet, Switch, Text, View } from "react-native";
import { getCustomer, updateCustomer } from "../../../src/lib/api";
import type { Customer } from "../../../src/types";
import { Avatar } from "../../../src/components/Avatar";
import { Badge } from "../../../src/components/Badge";
import { Button } from "../../../src/components/Button";
import { Card } from "../../../src/components/Card";
import { LoadingView } from "../../../src/components/LoadingView";
import { Screen } from "../../../src/components/Screen";
import { TextField } from "../../../src/components/TextField";
import { colors, spacing, typography } from "../../../src/theme/theme";

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
    return <LoadingView />;
  }

  const isDue = customer.runningBalance > 0;

  return (
    <Screen scroll>
      <Card style={styles.balanceCard}>
        <Avatar name={customer.name} size={56} />
        <View style={styles.balanceText}>
          <Text style={styles.balanceLabel}>Running Balance</Text>
          <Text style={[styles.balance, isDue && styles.balanceDue]}>₹{customer.runningBalance.toFixed(2)}</Text>
        </View>
        <Badge label={isDue ? "Due" : "Settled"} tone={isDue ? "danger" : "success"} />
      </Card>

      <TextField label="Name" icon="person-outline" required value={name} onChangeText={setName} />
      <TextField label="Phone" icon="call-outline" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <TextField label="Address" icon="location-outline" value={address} onChangeText={setAddress} />
      <TextField
        label="Credit Limit"
        icon="card-outline"
        value={creditLimit}
        onChangeText={setCreditLimit}
        keyboardType="decimal-pad"
      />
      <TextField label="Notes" icon="document-text-outline" value={notes} onChangeText={setNotes} multiline />

      <Card style={styles.switchRow}>
        <View>
          <Text style={styles.switchLabel}>Active customer</Text>
          <Text style={styles.switchHint}>Inactive customers won't appear when logging new entries.</Text>
        </View>
        <Switch
          value={isActive}
          onValueChange={setIsActive}
          trackColor={{ true: colors.primary, false: colors.border }}
        />
      </Card>

      <Button label="Save Changes" onPress={handleSave} loading={isSaving} style={{ marginTop: spacing.md }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  balanceCard: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.lg },
  balanceText: { flex: 1 },
  balanceLabel: { ...typography.caption, color: colors.textSecondary },
  balance: { ...typography.title, color: colors.textPrimary },
  balanceDue: { color: colors.danger },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  switchLabel: { ...typography.bodyStrong, color: colors.textPrimary },
  switchHint: { ...typography.caption, color: colors.textSecondary, marginTop: 2, maxWidth: 220 },
});
