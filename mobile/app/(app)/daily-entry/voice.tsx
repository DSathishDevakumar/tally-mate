import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { Alert, Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { draftVoiceEntry } from "../../../src/lib/api";
import { EmptyState } from "../../../src/components/EmptyState";
import { LoadingView } from "../../../src/components/LoadingView";
import { colors, radius, shadowLg, spacing, typography } from "../../../src/theme/theme";

export default function VoiceEntry() {
  const { t } = useTranslation();
  const router = useRouter();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    (async () => {
      const { granted } = await AudioModule.requestRecordingPermissionsAsync();
      setHasPermission(granted);
      if (granted) {
        await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      }
    })();
  }, []);

  useEffect(() => {
    if (!recorderState.isRecording) {
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(pulse, { toValue: 1, duration: 1400, easing: Easing.out(Easing.ease), useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [recorderState.isRecording, pulse]);

  async function handleStart() {
    await recorder.prepareToRecordAsync();
    recorder.record();
  }

  async function handleStop() {
    await recorder.stop();
    const uri = recorder.uri;
    if (!uri) {
      Alert.alert(t("voiceEntry.recordingFailedTitle"), t("voiceEntry.recordingFailedMessage"));
      return;
    }

    setIsProcessing(true);
    try {
      const draft = await draftVoiceEntry(uri, "audio/mp4");
      router.replace({
        pathname: "/(app)/daily-entry/voice-confirm",
        params: { draft: JSON.stringify(draft) },
      });
    } catch (err) {
      Alert.alert(t("voiceEntry.processFailedTitle"), err instanceof Error ? err.message : t("common.tryAgain"));
    } finally {
      setIsProcessing(false);
    }
  }

  if (hasPermission === null) {
    return <LoadingView />;
  }

  if (!hasPermission) {
    return (
      <EmptyState
        icon="mic-off-outline"
        title={t("voiceEntry.micNeededTitle")}
        description={t("voiceEntry.micNeededDescription")}
      />
    );
  }

  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] });

  return (
    <View style={styles.container}>
      <View style={styles.hintCard}>
        <Text style={styles.hint}>
          {isProcessing
            ? t("voiceEntry.processingHint")
            : recorderState.isRecording
              ? t("voiceEntry.recordingHint")
              : t("voiceEntry.idleHint")}
        </Text>
      </View>

      <View style={styles.recordWrapper}>
        {recorderState.isRecording ? (
          <Animated.View
            style={[styles.pulseRing, { transform: [{ scale: pulseScale }], opacity: pulseOpacity }]}
          />
        ) : null}
        {isProcessing ? (
          <LoadingView />
        ) : (
          <Pressable
            style={[styles.recordButton, recorderState.isRecording && styles.recordButtonActive]}
            onPress={recorderState.isRecording ? handleStop : handleStart}
          >
            <Ionicons name={recorderState.isRecording ? "stop" : "mic"} size={40} color="#fff" />
          </Pressable>
        )}
      </View>

      <Text style={styles.statusLabel}>
        {isProcessing ? "" : recorderState.isRecording ? t("voiceEntry.tapToStop") : t("voiceEntry.tapToStart")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg, backgroundColor: colors.background },
  hintCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.xxl,
  },
  hint: { ...typography.body, color: colors.textPrimary, textAlign: "center", lineHeight: 22 },
  recordWrapper: { alignItems: "center", justifyContent: "center", width: 180, height: 180 },
  pulseRing: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
  },
  recordButton: {
    backgroundColor: colors.accent,
    width: 140,
    height: 140,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    ...shadowLg,
  },
  recordButtonActive: { backgroundColor: colors.danger },
  statusLabel: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.lg },
});
