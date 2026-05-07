"use client";

import { useEffect, useRef } from "react";
import { off, onValue, ref, update } from "firebase/database";
import { firebaseDb } from "@/lib/firebase";
import { parsePresence } from "@/lib/guards";
import type { ActiveListSummary } from "@/lib/types";

const DEBOUNCE_MS = 350;

/**
 * 대시보드에 머물러 있는 owner의 카드 watcherCount를 실시간으로 유지한다.
 * useActiveListSync는 /list/{shareId} 페이지에서만 작동하므로,
 * owner가 / 페이지에 있을 때 watcher 변화가 active_lists에 반영되지 않는 문제를 보완.
 *
 * 자기가 ownerId인 카드만 골라 /lists/{shareId}/presence를 구독하고,
 * 변경 시 active_lists/{shareId}의 watcherCount/updatedAt만 partial update.
 */
export function useOwnerCardsLiveSync(
  uid: string | null,
  summaries: readonly ActiveListSummary[],
): void {
  const ownedIds = uid
    ? summaries.filter((s) => s.ownerId === uid).map((s) => s.shareId)
    : [];
  const idsKey = ownedIds.join(",");
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    if (!uid || ownedIds.length === 0) return;
    const db = firebaseDb();
    const handlers: Array<() => void> = [];

    for (const shareId of ownedIds) {
      const r = ref(db, `lists/${shareId}/presence`);
      const handler = onValue(r, (snap) => {
        const v = snap.val() as Record<string, unknown> | null;
        let watcherCount = 0;
        if (v) {
          for (const [pUid, raw] of Object.entries(v)) {
            const p = parsePresence(pUid, raw);
            if (p && p.uid !== uid) watcherCount++;
          }
        }
        const existing = timersRef.current[shareId];
        if (existing) clearTimeout(existing);
        timersRef.current[shareId] = setTimeout(() => {
          update(ref(db, `active_lists/${shareId}`), {
            watcherCount,
            updatedAt: Date.now(),
          }).catch(() => undefined);
        }, DEBOUNCE_MS);
      });
      handlers.push(() => off(r, "value", handler));
    }

    return () => {
      handlers.forEach((fn) => fn());
      Object.values(timersRef.current).forEach((t) => clearTimeout(t));
      timersRef.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, idsKey]);
}
