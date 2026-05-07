"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useActiveLists } from "@/hooks/useActiveLists";
import { useBotPresenceCounts } from "@/hooks/useBotPresenceCounts";
import { useLocale, useT } from "@/lib/i18n";
import { URGENCY_CLASS, countdownParts, urgencyLevel } from "@/lib/time";
import { BOTS, botToSummary } from "@/lib/bots";
import Avatar from "./Avatar";

const SHOW_LIMIT = 10;

interface Props {
  excludeShareId: string | null;
}

export default function LiveSidebar({ excludeShareId }: Props) {
  const t = useT();
  const { locale } = useLocale();
  const { lists: realLists } = useActiveLists();
  const botPresence = useBotPresenceCounts();
  const [now, setNow] = useState(() => Date.now());
  const [sessionStart, setSessionStart] = useState<number | null>(null);

  useEffect(() => {
    setSessionStart(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const lists = useMemo(() => {
    if (sessionStart === null) return realLists;
    const botSummaries = BOTS.map((b) => {
      const s = botToSummary(b, locale, sessionStart);
      return { ...s, watcherCount: s.watcherCount + (botPresence[b.shareId] ?? 0) };
    });
    return [...realLists, ...botSummaries];
  }, [realLists, locale, sessionStart, botPresence]);

  const others = lists.filter((s) => s.shareId !== excludeShareId).slice(0, SHOW_LIMIT);

  return (
    <div className="space-y-3">
      <h2 className="text-xs font-semibold text-onair-mute uppercase tracking-wider px-1">
        {t("list.otherLives")}
      </h2>
      {others.length === 0 ? (
        <p className="text-xs text-onair-mute px-1 py-4">{t("list.noOtherLives")}</p>
      ) : (
        <ul className="space-y-2">
          {others.map((s) => {
            const remaining = s.nextDeadline === null ? null : s.nextDeadline - now;
            const level = remaining === null ? "normal" : urgencyLevel(remaining);
            const parts = remaining === null ? null : countdownParts(remaining);
            const timeText = parts
              ? parts.days > 0
                ? t("common.countdownWithDays", { days: parts.days, time: parts.hms })
                : parts.hms
              : "";
            return (
              <li key={s.shareId}>
                <Link
                  href={`/list/${s.shareId}`}
                  className="block bg-onair-panel border border-onair-line rounded-xl p-3 hover:border-onair-live transition group"
                >
                  <div className="flex items-start gap-2.5">
                    <Avatar name={s.ownerName} color={s.ownerColor} iconKey={s.ownerIconKey} size="sm" />
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold truncate group-hover:text-onair-live transition">
                        {s.title || "—"}
                      </h3>
                      <p className="text-xs text-onair-mute truncate">{s.ownerName}</p>
                      <div className="flex items-center justify-between gap-2 mt-1.5">
                        <span
                          className={`text-xs font-mono tabular-nums ${URGENCY_CLASS[level]}`}
                        >
                          {remaining === null ? "—" : `⏰ ${timeText}`}
                        </span>
                        <span className="text-xs text-onair-mute whitespace-nowrap">
                          👀 {s.watcherCount}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
