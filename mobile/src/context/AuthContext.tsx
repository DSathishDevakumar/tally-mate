import * as AuthSession from "expo-auth-session";
import { getQueryParams } from "expo-auth-session/build/QueryParams";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { getMe, syncUser } from "../lib/api";
import type { AppUser } from "../types";

WebBrowser.maybeCompleteAuthSession();

interface AuthContextValue {
  session: Session | null;
  appUser: AppUser | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  // Tracks initial session hydration + the sync-with-backend round trip, so
  // the root layout knows when it's safe to redirect between (auth)/(app).
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setIsLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (!newSession) {
        setAppUser(null);
        setIsLoading(false);
      }
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // On Android, the OS can hand the OAuth redirect straight to this app via
    // its URL scheme, which makes WebBrowser.openAuthSessionAsync report a
    // plain "dismiss" instead of "success" — losing the auth code. Listening
    // for the redirect as a deep link directly is the reliable path on both
    // platforms; signInWithGoogle no longer depends on the browser's own
    // result to extract the code.
    const linkSubscription = Linking.addEventListener("url", async ({ url }) => {
      const { params, errorCode } = getQueryParams(url);
      if (errorCode) {
        console.error("Google sign-in redirect error", errorCode);
      } else if (params.code) {
        const { error } = await supabase.auth.exchangeCodeForSession(params.code);
        if (error) console.error("Failed to exchange code for session", error);
      }
      WebBrowser.dismissBrowser();
    });

    return () => linkSubscription.remove();
  }, []);

  useEffect(() => {
    if (!session) return;

    let cancelled = false;
    setIsLoading(true);

    // First sign-in provisions the user row on our backend; subsequent app
    // launches with an existing session just fetch it.
    getMe()
      .catch(() => syncUser())
      .then((user) => {
        if (!cancelled) setAppUser(user);
      })
      .catch((err) => {
        console.error("Failed to resolve app user", err);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [session]);

  async function signInWithGoogle() {
    const redirectTo = AuthSession.makeRedirectUri();

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });
    if (error) throw error;
    if (!data.url) throw new Error("Supabase did not return an OAuth URL");

    // The "url" listener registered above handles the redirect (extracting
    // the code and exchanging it for a session) and dismisses the browser.
    // This just keeps the browser open until that happens, or the user
    // cancels it manually.
    await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setAppUser(null);
  }

  const value = useMemo(
    () => ({ session, appUser, isLoading, signInWithGoogle, signOut }),
    [session, appUser, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
