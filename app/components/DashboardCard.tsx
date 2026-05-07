"use client";

import Link from "next/link";
import type { ActiveListSummary } from "@/lib/types";
import { useT } from "@/lib/i18n";
import { URGENCY_CLASS, countdownParts, urgencyLevel } from "@/lib/time";
import Avatar from "./Avatar";

interface Props {
  summary: ActiveListSummary;
  now: number;
}

export default function DashboardCard({ summary, now }: Props) {
  const t = useT();
  const remaining = summary.nextDeadline === null ? null : summary.nextDeadline - now;
  const level = remaining === null ? "normal" : urgencyLevel(remaining);
  const timeText =
    remaining === null
      ? null
      : (() => {
          const { days, hms } = countdownParts(remaining);
          return days > 0
            ? t("common.countdownWithDays", { days, time: hms })
            : hms;
        })();
  const total = summary.todoCount;
  const done = summary.doneCount;
  const pct = total === 0 ? 0 : Math.min(100, Math.round((done / total) * 100));

  return (
    <Link
      href={`/list/${summary.shareId}`}
      className="block bg-onair-panel border border-onair-line rounded-2xl p-5 hover:border-onair-live transition group"
    >
      <div className="flex items-start gap-3 mb-4">
        <Avatar name={summary.ownerName} color={summary.ownerColor} iconKey={summary.ownerIconKey} size="md" />
        <div className="min-w-0 flex-1">
          <h3 className="font-bold truncate group-hover:text-onair-live transition">
            {summary.title || "—"}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-onair-live animate-pulseLive" />
            <span className="text-xs text-onair-mute truncate">{summary.ownerName}</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between text-xs text-onair-mute mb-1">
            <span>{t("dashboard.progress", { done, total })}</span>
          </div>
          <div className="h-1.5 bg-onair-line rounded-full overflow-hidden">
            <div className="h-full bg-onair-live transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className={`font-mono tabular-nums ${URGENCY_CLASS[level]}`}>
            ⏰{" "}
            {timeText === null
              ? t("dashboard.noDeadline")
              : t("dashboard.timeLeft", { time: timeText })}
          </span>
          <span className="text-xs text-onair-mute">
            👀 {t("dashboard.watchers", { count: summary.watcherCount })}
          </span>
        </div>
      </div>
    </Link>
  );
}
