"use client";

import { useEffect, useState } from "react";
import { off, onValue, ref } from "firebase/database";
import { firebaseDb } from "@/lib/firebase";
import { BOTS } from "@/lib/bots";

/**
 * 모든 봇 라이브의 /lists/{botShareId}/presence를 한 번에 구독해
 * 실시간 viewer 수를 반환한다. Dashboard/LiveSidebar에서 봇 카드의
 * watcherCount(= baseline + 실 viewer)를 계산할 때 사용.
 */
export function useBotPresenceCounts(): Record<string, number> {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const db = firebaseDb();
    const handlers: Array<() => void> = [];
    for (const bot of BOTS) {
      const id = bot.shareId;
      const r = ref(db, `lists/${id}/presence`);
      const handler = onValue(r, (snap) => {
        const v = snap.val() as Record<string, unknown> | null;
        const count =
          v && typeof v === "object" ? Object.keys(v).length : 0;
        setCounts((prev) => (prev[id] === count ? prev : { ...prev, [id]: count }));
      });
      handlers.push(() => off(r, "value", handler));
    }
    return () => handlers.forEach((fn) => fn());
  }, []);

  return counts;
}
