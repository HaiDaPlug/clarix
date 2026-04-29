"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import sv, { Translations } from "./sv";
import en from "./en";

export type Locale = "sv" | "en";
export type { Translations } from "./sv";

const dictionaries: Record<Locale, Translations> = { sv, en };

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translations;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: "sv",
  setLocale: () => {},
  t: sv,
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>("sv");
  return (
    <LocaleContext.Provider value={{ locale, setLocale, t: dictionaries[locale] }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
