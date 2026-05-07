"use client";

import { useT } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n";

interface Props {
  onSend: (emoji: string) => void;
  throttled: boolean;
  counts: Record<string, number>;
  readOnly: boolean;
}

const REACTIONS: { emoji: string; labelKey: TranslationKey }[] = [
  { emoji: "🔥", labelKey: "reaction.fire" },
  { emoji: "💪", labelKey: "reaction.muscle" },
  { emoji: "👀", labelKey: "reaction.eyes" },
  { emoji: "❤️", labelKey: "reaction.heart" },
  { emoji: "🙏", labelKey: "reaction.pray" },
];

function formatCount(n: number): string {
  if (n < 1000) return n.toString();
  if (n < 10_000) return `${(n / 1000).toFixed(1)}k`;
  if (n < 1_000_000) return `${Math.floor(n / 1000)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

export default function ReactionBar({ onSend, throttled, counts, readOnly }: Props) {
  const t = useT();

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex gap-1 bg-onair-panel/95 backdrop-blur border border-onair-line rounded-full px-2 py-1.5 shadow-lg">
      {REACTIONS.map((r) => {
        const count = counts[r.emoji] ?? 0;
        const interactive = !readOnly;
        const disabled = readOnly || throttled;
        return (
          <button
            key={r.emoji}
            type="button"
            onClick={() => interactive && onSend(r.emoji)}
            disabled={disabled}
            aria-label={t(r.labelKey)}
            title={
              readOnly
                ? t(r.labelKey)
                : throttled
                ? t("reaction.throttled")
                : t(r.labelKey)
            }
            className={`group inline-flex items-center gap-1.5 h-10 px-3 rounded-full transition select-none ${
              readOnly
                ? "cursor-default"
                : throttled
                ? "cursor-not-allowed opacity-50"
                : "cursor-pointer hover:bg-onair-line active:scale-95"
            }`}
          >
            <span className="text-xl leading-none">{r.emoji}</span>
            <span
              className={`text-xs font-semibold tabular-nums min-w-[1ch] ${
                count > 0 ? "text-onair-ink" : "text-onair-mute/60"
              }`}
            >
              {formatCount(count)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
