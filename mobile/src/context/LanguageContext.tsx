import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import i18n, { SUPPORTED_LANGUAGES, type Language } from "../i18n";

const STORAGE_KEY = "@grocery/language";

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: PropsWithChildren) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored && (SUPPORTED_LANGUAGES as readonly string[]).includes(stored)) {
        const lang = stored as Language;
        i18n.changeLanguage(lang);
        setLanguageState(lang);
      }
    });
  }, []);

  function setLanguage(next: Language) {
    i18n.changeLanguage(next);
    setLanguageState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch((err) => console.error("Failed to persist language", err));
  }

  const value = useMemo(() => ({ language, setLanguage }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
