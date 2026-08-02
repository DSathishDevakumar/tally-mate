import { useCallback, useState } from "react";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { deleteEntry, listEntries, updateEntry } from "../../../src/lib/api";
import type { LedgerEntry } from "../../../src/types";
import { Avatar } from "../../../src/components/Avatar";
import { Badge } from "../../../src/components/Badge";
import { Button } from "../../../src/components/Button";
import { Card } from "../../../src/components/Card";
import { LoadingView } from "../../../src/components/LoadingView";
import { Screen } from "../../../src/components/Screen";
import { TextField } from "../../../src/components/TextField";
import { colors, spacing, typography } from "../../../src/theme/theme";

export default function EntryDetail() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [entry, setEntry] = useState<LedgerEntry | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(() => {
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

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleSave() {
    if (!id) return;
    const parsedAmount = Number(amount);
    if (!amount || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      Alert.alert(t("common.amountRequiredTitle"), t("common.amountRequiredMessage"));
      return;
    }

    setIsSaving(true);
    try {
      const updated = await updateEntry(id, { amount: parsedAmount, note: note.trim() || undefined });
      setEntry(updated);
      Alert.alert(t("common.savedTitle"), t("dailyEntry.savedMessage"));
    } catch (err) {
      Alert.alert(t("common.saveFailedTitle"), err instanceof Error ? err.message : t("common.tryAgain"));
    } finally {
      setIsSaving(false);
    }
  }

  function handleDelete() {
    if (!id) return;
    Alert.alert(t("dailyEntry.deleteConfirmTitle"), t("dailyEntry.deleteConfirmMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          try {
            await deleteEntry(id);
            router.back();
          } catch (err) {
            Alert.alert(t("dailyEntry.deleteFailedTitle"), err instanceof Error ? err.message : t("common.tryAgain"));
          }
        },
      },
    ]);
  }

  if (!entry) {
    return <LoadingView />;
  }

  return (
    <Screen scroll>
      <Card style={styles.headerCard}>
        <Avatar name={entry.customer.name} size={56} />
        <View style={styles.headerText}>
          <Text style={styles.name}>{entry.customer.name}</Text>
          <Text style={styles.amount}>₹{Number(entry.totalAmount).toFixed(2)}</Text>
        </View>
        {entry.billId ? <Badge label={t("common.badgeBilled")} tone="neutral" /> : null}
      </Card>

      {entry.billId ? (
        <Card style={styles.notice}>
          <Text style={styles.noticeText}>{t("dailyEntry.billedNotice")}</Text>
        </Card>
      ) : (
        <>
          <TextField label={t("common.amount")} icon="cash-outline" required value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
          <TextField label={t("common.note")} icon="document-text-outline" value={note} onChangeText={setNote} multiline />

          <Button label={t("common.saveChanges")} onPress={handleSave} loading={isSaving} style={{ marginTop: spacing.sm }} />
          <Button label={t("dailyEntry.deleteEntryButton")} variant="ghost" onPress={handleDelete} style={{ marginTop: spacing.xs }} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerCard: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.lg },
  headerText: { flex: 1 },
  name: { ...typography.heading, color: colors.textPrimary },
  amount: { ...typography.title, color: colors.danger, marginTop: 2 },
  notice: { backgroundColor: colors.warningLight },
  noticeText: { ...typography.body, color: colors.warning, textAlign: "center" },
});
