import { useCallback, useState } from "react";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { Alert, StyleSheet, Switch, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { getCustomer, updateCustomer } from "../../../src/lib/api";
import type { Customer } from "../../../src/types";
import { Avatar } from "../../../src/components/Avatar";
import { Badge } from "../../../src/components/Badge";
import { Button } from "../../../src/components/Button";
import { Card } from "../../../src/components/Card";
import { LoadingView } from "../../../src/components/LoadingView";
import { RecordPaymentModal } from "../../../src/components/RecordPaymentModal";
import { Screen } from "../../../src/components/Screen";
import { TextField } from "../../../src/components/TextField";
import { colors, spacing, typography } from "../../../src/theme/theme";

export default function CustomerDetail() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);

  const load = useCallback(() => {
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

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

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
      Alert.alert(t("common.savedTitle"), t("customers.savedMessage"));
    } catch (err) {
      Alert.alert(t("common.saveFailedTitle"), err instanceof Error ? err.message : t("common.tryAgain"));
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
          <Text style={styles.balanceLabel}>{t("customers.runningBalance")}</Text>
          <Text style={[styles.balance, isDue && styles.balanceDue]}>₹{customer.runningBalance.toFixed(2)}</Text>
        </View>
        <Badge label={isDue ? t("common.badgeDue") : t("common.badgeSettled")} tone={isDue ? "danger" : "success"} />
      </Card>

      {isDue ? (
        <Button
          label={t("payments.recordButton")}
          icon="cash-outline"
          variant="secondary"
          onPress={() => setIsPaymentModalVisible(true)}
          style={{ marginBottom: spacing.lg }}
        />
      ) : null}

      <TextField label={t("common.name")} icon="person-outline" required value={name} onChangeText={setName} />
      <TextField label={t("common.phone")} icon="call-outline" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <TextField label={t("common.address")} icon="location-outline" value={address} onChangeText={setAddress} />
      <TextField
        label={t("customers.creditLimit")}
        icon="card-outline"
        value={creditLimit}
        onChangeText={setCreditLimit}
        keyboardType="decimal-pad"
      />
      <TextField label={t("common.notes")} icon="document-text-outline" value={notes} onChangeText={setNotes} multiline />

      <Card style={styles.switchRow}>
        <View>
          <Text style={styles.switchLabel}>{t("customers.activeLabel")}</Text>
          <Text style={styles.switchHint}>{t("customers.activeHint")}</Text>
        </View>
        <Switch
          value={isActive}
          onValueChange={setIsActive}
          trackColor={{ true: colors.primary, false: colors.border }}
        />
      </Card>

      <Button label={t("common.saveChanges")} onPress={handleSave} loading={isSaving} style={{ marginTop: spacing.md }} />

      <RecordPaymentModal
        visible={isPaymentModalVisible}
        customerId={customer.id}
        customerName={customer.name}
        runningBalance={customer.runningBalance}
        onClose={() => setIsPaymentModalVisible(false)}
        onSuccess={(newBalance) => {
          setIsPaymentModalVisible(false);
          setCustomer((c) => (c ? { ...c, runningBalance: newBalance } : c));
        }}
      />
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
