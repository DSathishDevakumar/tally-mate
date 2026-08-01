import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../src/context/AuthContext";

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
    <View style={styles.container}>
      <Text style={styles.title}>Grocery Ledger</Text>
      <Text style={styles.subtitle}>Track customer credit, the digital way.</Text>
      <Pressable style={styles.button} onPress={handlePress} disabled={isSigningIn}>
        {isSigningIn ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Sign in with Google</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  title: { fontSize: 28, fontWeight: "700" },
  subtitle: { fontSize: 16, color: "#666", marginBottom: 24, textAlign: "center" },
  button: {
    backgroundColor: "#1a73e8",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    minWidth: 220,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
