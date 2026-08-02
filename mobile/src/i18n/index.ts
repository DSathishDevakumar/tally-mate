import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json";
import ta from "./ta.json";

export const SUPPORTED_LANGUAGES = ["en", "ta"] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

const LOCALE_TAGS: Record<Language, string> = { en: "en-IN", ta: "ta-IN" };

/** Maps our two-letter language code to a full locale tag for Intl/toLocaleDateString calls. */
export function localeTagFor(language: string): string {
  return LOCALE_TAGS[language as Language] ?? "en-IN";
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ta: { translation: ta },
  },
  lng: "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
