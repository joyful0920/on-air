"use client";

import Link from "next/link";
import { useLocale, useT } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import HeaderProfileButton from "./HeaderProfileButton";

export default function Header() {
  const t = useT();
  const { locale, setLocale } = useLocale();

  return (
    <header className="border-b border-onair-line bg-onair-bg/80 backdrop-blur sticky top-0 z-30">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-14">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="inline-block w-2 h-2 rounded-full bg-onair-live animate-pulseLive" aria-hidden />
          <span className="text-lg font-bold tracking-tight">{t("common.appName")}</span>
          <span className="hidden sm:inline text-xs text-onair-mute group-hover:text-onair-ink transition">
            {t("common.tagline")}
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <LocaleToggle locale={locale} onChange={setLocale} />
          <HeaderProfileButton />
        </div>
      </div>
    </header>
  );
}

function LocaleToggle({ locale, onChange }: { locale: Locale; onChange: (l: Locale) => void }) {
  const base = "px-2 py-1 text-xs font-semibold rounded transition";
  const active = "bg-onair-ink text-onair-bg";
  const inactive = "text-onair-mute hover:text-onair-ink";
  return (
    <div className="flex items-center gap-1 border border-onair-line rounded-md p-0.5" role="group" aria-label="language">
      <button
        type="button"
        className={`${base} ${locale === "ja" ? active : inactive}`}
        onClick={() => onChange("ja")}
      >
        JA
      </button>
      <button
        type="button"
        className={`${base} ${locale === "ko" ? active : inactive}`}
        onClick={() => onChange("ko")}
      >
        KO
      </button>
    </div>
  );
}
