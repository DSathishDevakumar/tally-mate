import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { draftPhotoEntries } from "../../../src/lib/api";
import { LoadingView } from "../../../src/components/LoadingView";
import { colors, radius, shadowLg, spacing, typography } from "../../../src/theme/theme";

export default function PhotoEntry() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);

  async function handlePick(fromCamera: boolean) {
    const { granted } = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!granted) {
      Alert.alert(
        "Permission needed",
        `Please allow ${fromCamera ? "camera" : "photo library"} access to continue.`
      );
      return;
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setIsProcessing(true);
    try {
      const rows = await draftPhotoEntries(asset.uri, asset.mimeType ?? "image/jpeg");
      router.replace({
        pathname: "/(app)/daily-entry/photo-confirm",
        params: { rows: JSON.stringify(rows) },
      });
    } catch (err) {
      Alert.alert("Couldn't process photo", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setIsProcessing(false);
    }
  }

  if (isProcessing) {
    return (
      <View style={styles.container}>
        <LoadingView />
        <Text style={styles.processingLabel}>Reading the page...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.hintCard}>
        <Ionicons name="document-text-outline" size={28} color={colors.primary} style={{ marginBottom: spacing.sm }} />
        <Text style={styles.hint}>
          Photograph a page of your credit notebook. Every customer and amount written on it will be found
          automatically — you'll review and confirm before anything is saved.
        </Text>
      </View>

      <Pressable style={styles.actionButton} onPress={() => handlePick(true)}>
        <View style={[styles.actionIcon, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="camera" size={24} color={colors.primary} />
        </View>
        <View style={styles.actionText}>
          <Text style={styles.actionTitle}>Take Photo</Text>
          <Text style={styles.actionDescription}>Use the camera right now</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Pressable>

      <Pressable style={styles.actionButton} onPress={() => handlePick(false)}>
        <View style={[styles.actionIcon, { backgroundColor: colors.accentLight }]}>
          <Ionicons name="images" size={24} color={colors.accent} />
        </View>
        <View style={styles.actionText}>
          <Text style={styles.actionTitle}>Choose from Gallery</Text>
          <Text style={styles.actionDescription}>Pick an existing photo</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg, gap: spacing.md },
  processingLabel: { ...typography.body, color: colors.textSecondary, textAlign: "center", marginTop: -spacing.lg },
  hintCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  hint: { ...typography.body, color: colors.textPrimary, textAlign: "center", lineHeight: 21 },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadowLg,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: { flex: 1 },
  actionTitle: { ...typography.bodyStrong, color: colors.textPrimary },
  actionDescription: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
});
