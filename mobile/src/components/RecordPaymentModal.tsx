import { Picker } from "@react-native-picker/picker";
import { useEffect, useState } from "react";
import { Alert, Modal, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { createPayment } from "../lib/api";
import { Button } from "./Button";
import { Card } from "./Card";
import { PickerField } from "./PickerField";
import { TextField } from "./TextField";
import { colors, spacing, typography } from "../theme/theme";

interface RecordPaymentModalProps {
  visible: boolean;
  customerId: string;
  customerName: string;
  runningBalance: number;
  onClose: () => void;
  onSuccess: (newBalance: number) => void;
}

const PAYMENT_METHODS = ["cash", "upi", "bank_transfer", "other"] as const;

export function RecordPaymentModal({
  visible,
  customerId,
  customerName,
  runningBalance,
  onClose,
  onSuccess,
}: Readonly<RecordPaymentModalProps>) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<(typeof PAYMENT_METHODS)[number]>("cash");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setAmount(runningBalance > 0 ? runningBalance.toFixed(2) : "");
      setPaymentMethod("cash");
    }
  }, [visible, runningBalance]);

  async function handleSave() {
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      Alert.alert(t("common.amountRequiredTitle"), t("common.amountRequiredMessage"));
      return;
    }
    if (parsed > runningBalance) {
      Alert.alert(t("payments.exceedsBalanceTitle"), t("payments.exceedsBalanceMessage", { amount: runningBalance.toFixed(2) }));
      return;
    }

    setIsSaving(true);
    try {
      const { runningBalance: newBalance } = await createPayment({ customerId, amount: parsed, paymentMethod });
      onSuccess(newBalance);
    } catch (err) {
      Alert.alert(t("payments.saveFailedTitle"), err instanceof Error ? err.message : t("common.tryAgain"));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Card style={styles.card}>
          <Text style={styles.title}>{t("payments.modalTitle")}</Text>
          <Text style={styles.subtitle}>{customerName}</Text>
          <Text style={styles.balanceLabel}>
            {t("payments.outstandingLabel")} <Text style={styles.balanceValue}>₹{runningBalance.toFixed(2)}</Text>
          </Text>

          <TextField
            label={t("common.amount")}
            icon="cash-outline"
            required
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
          />

          <PickerField
            label={t("payments.methodLabel")}
            icon="card-outline"
            selectedValue={paymentMethod}
            onValueChange={(v) => setPaymentMethod(v as (typeof PAYMENT_METHODS)[number])}
          >
            {PAYMENT_METHODS.map((method) => (
              <Picker.Item key={method} label={t(`payments.method.${method}`)} value={method} />
            ))}
          </PickerField>

          <View style={styles.actions}>
            <Button label={t("common.cancel")} variant="ghost" onPress={onClose} style={styles.actionButton} />
            <Button label={t("payments.recordButton")} onPress={handleSave} loading={isSaving} style={styles.actionButton} />
          </View>
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  card: { width: "100%" },
  title: { ...typography.heading, color: colors.textPrimary },
  subtitle: { ...typography.bodyStrong, color: colors.textSecondary, marginTop: 2, marginBottom: spacing.sm },
  balanceLabel: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.md },
  balanceValue: { ...typography.bodyStrong, color: colors.danger },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  actionButton: { flex: 1 },
});
