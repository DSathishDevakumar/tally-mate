import { Redirect } from "expo-router";
import { useAuth } from "../src/context/AuthContext";

export default function Index() {
  const { session, appUser, isLoading } = useAuth();

  if (isLoading) return null;
  if (session && appUser) return <Redirect href="/(app)" />;
  return <Redirect href="/(auth)/sign-in" />;
}
