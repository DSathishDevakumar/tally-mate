import { Slot, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "../src/context/AuthContext";
import { LanguageProvider } from "../src/context/LanguageContext";
import { LoadingView } from "../src/components/LoadingView";
import "../src/i18n";

function RootNavigator() {
  const { session, appUser, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!session && !inAuthGroup) {
      router.replace("/(auth)/sign-in");
    } else if (session && appUser && inAuthGroup) {
      // TODO: once role-specific home screens exist, branch this redirect by appUser.role.
      router.replace("/(app)");
    }
  }, [session, appUser, isLoading, segments]);

  if (isLoading) {
    return <LoadingView />;
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <AuthProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </AuthProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
