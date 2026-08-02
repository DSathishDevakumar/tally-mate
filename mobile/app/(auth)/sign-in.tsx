import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../src/context/AuthContext";
import { colors, radius, shadowLg, spacing, typography } from "../../src/theme/theme";

export default function SignIn() {
  const { signInWithGoogle } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);

  async function handlePress() {
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      Alert.alert("Sign-in failed", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setIsSigningIn(false);
    }
  }

  return (
    <LinearGradient colors={[colors.primaryLight, colors.background]} style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.logoCircle}>
          <Ionicons name="storefront" size={40} color={colors.primary} />
        </View>
        <Text style={styles.title}>Grocery Ledger</Text>
        <Text style={styles.subtitle}>Track customer credit, the digital way.</Text>
      </View>

      <View style={styles.card}>
        <FeatureRow icon="people-outline" label="Manage customer credit accounts" />
        <FeatureRow icon="mic-outline" label="Log entries by voice or manually" />
        <FeatureRow icon="receipt-outline" label="Bill customers once a month" />

        <Pressable style={styles.googleButton} onPress={handlePress} disabled={isSigningIn}>
          {isSigningIn ? (
            <ActivityIndicator color={colors.textPrimary} />
          ) : (
            <>
              <Ionicons name="logo-google" size={20} color="#EA4335" style={{ marginRight: spacing.sm }} />
              <Text style={styles.googleButtonText}>Sign in with Google</Text>
            </>
          )}
        </Pressable>
      </View>
    </LinearGradient>
  );
}

function FeatureRow({ icon, label }: Readonly<{ icon: keyof typeof Ionicons.glyphMap; label: string }>) {
  return (
    <View style={styles.featureRow}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={styles.featureLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "space-between", padding: spacing.lg, paddingTop: spacing.xxl },
  hero: { alignItems: "center", marginTop: spacing.xxl },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
    ...shadowLg,
  },
  title: { ...typography.display, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs, textAlign: "center" },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadowLg,
  },
  featureRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
  featureLabel: { ...typography.body, color: colors.textSecondary },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 15,
    marginTop: spacing.sm,
  },
  googleButtonText: { ...typography.bodyStrong, color: colors.textPrimary },
});
