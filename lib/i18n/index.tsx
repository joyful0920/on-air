"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import ja from "./ja";
import ko from "./ko";
import type { Dictionary, Locale, TranslationKey } from "./keys";

export type { Locale, TranslationKey };

const DICTS: Record<Locale, Dictionary> = { ja, ko };
const DEFAULT_LOCALE: Locale = "ja";
const STORAGE_KEY = "onair.locale";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k: string) => {
    const v = params[k];
    return v === undefined ? `{{${k}}}` : String(v);
  });
}

function isLocale(v: unknown): v is Locale {
  return v === "ja" || v === "ko";
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  // 초기 렌더는 항상 default로 고정 → SSR/CSR hydration mismatch 방지.
  // 마운트 후 localStorage 값이 있으면 교체.
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (isLocale(saved)) {
        // 사용자가 직접 고른 적 있으면 그걸 우선
        if (saved !== DEFAULT_LOCALE) setLocaleState(saved);
        return;
      }
      // 첫 방문: 브라우저 locale로 자동 결정 (ko* → 한국어, 그 외 → 기본 일본어)
      const browserLang = (navigator.language ?? "").toLowerCase();
      if (browserLang.startsWith("ko")) {
        setLocaleState("ko");
      }
    } catch {
      // noop
    }
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // noop
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) => {
      const dict = DICTS[locale];
      const template = dict[key];
      if (template === undefined) {
        if (process.env.NODE_ENV !== "production") {
          // eslint-disable-next-line no-console
          console.warn(`[i18n] missing key: ${key} (${locale})`);
        }
        return key;
      }
      return interpolate(template, params);
    },
    [locale],
  );

  const value = useMemo<LocaleContextValue>(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return ctx;
}

export function useT() {
  return useLocale().t;
}
