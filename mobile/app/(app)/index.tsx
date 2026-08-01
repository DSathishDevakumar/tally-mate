import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../src/context/AuthContext";

export default function Home() {
  const { appUser, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>Welcome, {appUser?.name}</Text>
      <Text style={styles.role}>Role: {appUser?.role}</Text>
      <Pressable style={styles.button} onPress={signOut}>
        <Text style={styles.buttonText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  greeting: { fontSize: 22, fontWeight: "700" },
  role: { fontSize: 16, color: "#666", marginBottom: 24 },
  button: { backgroundColor: "#e53935", paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  buttonText: { color: "#fff", fontWeight: "600" },
});
