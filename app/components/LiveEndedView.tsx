"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n";

export default function LiveEndedView() {
  const t = useT();
  return (
    <div className="text-center py-20 space-y-5">
      <div className="text-6xl opacity-25 select-none" aria-hidden>
        📡
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">{t("list.ended")}</h1>
        <p className="text-sm text-onair-mute">{t("list.endedDesc")}</p>
      </div>
      <Link
        href="/"
        className="inline-block px-5 py-2.5 rounded-full bg-onair-live text-white font-semibold hover:opacity-90 transition"
      >
        {t("common.back")}
      </Link>
    </div>
  );
}
