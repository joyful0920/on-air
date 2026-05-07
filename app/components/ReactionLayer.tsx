"use client";

import type { CSSProperties } from "react";
import type { FloatingReaction } from "@/hooks/useReactions";

interface CSSVars extends CSSProperties {
  "--sway-1"?: string;
  "--sway-2"?: string;
  "--sway-3"?: string;
  "--sway-end"?: string;
  "--rot-1"?: string;
  "--rot-2"?: string;
  "--rot-3"?: string;
  "--ig-duration"?: string;
}

export default function ReactionLayer({ items }: { items: FloatingReaction[] }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden" aria-hidden>
      {items.map((r) => {
        const style: CSSVars = {
          bottom: "5rem",
          left: `calc(50% + ${r.startOffset}px)`,
          fontSize: `${r.size}px`,
          lineHeight: 1,
          "--sway-1": `${r.sway1}px`,
          "--sway-2": `${r.sway2}px`,
          "--sway-3": `${r.sway3}px`,
          "--sway-end": `${r.swayEnd}px`,
          "--rot-1": `${r.rot1}deg`,
          "--rot-2": `${r.rot2}deg`,
          "--rot-3": `${r.rot3}deg`,
          "--ig-duration": `${r.duration}ms`,
        };
        return (
          <span key={r.id} className="absolute ig-float-anim" style={style}>
            {r.emoji}
          </span>
        );
      })}
    </div>
  );
}
