"use client";

import { useEffect, useState } from "react";
import { off, onValue, ref } from "firebase/database";
import { firebaseDb } from "@/lib/firebase";
import { parseActiveListSummary } from "@/lib/guards";
import type { ActiveListSummary } from "@/lib/types";

export function useActiveLists(): { lists: ActiveListSummary[]; loading: boolean } {
  const [lists, setLists] = useState<ActiveListSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const db = firebaseDb();
    const r = ref(db, "active_lists");
    const handler = onValue(
      r,
      (snap) => {
        const v = snap.val() as Record<string, unknown> | null;
        if (!v) {
          setLists([]);
        } else {
          const out: ActiveListSummary[] = [];
          for (const [shareId, raw] of Object.entries(v)) {
            const parsed = parseActiveListSummary(shareId, raw);
            if (parsed) out.push(parsed);
          }
          // nextDeadline 오름차순, null은 뒤로
          out.sort((a, b) => {
            if (a.nextDeadline === null && b.nextDeadline === null) return b.updatedAt - a.updatedAt;
            if (a.nextDeadline === null) return 1;
            if (b.nextDeadline === null) return -1;
            return a.nextDeadline - b.nextDeadline;
          });
          setLists(out);
        }
        setLoading(false);
      },
      (err) => {
        // 권한/네트워크 등으로 read 실패해도 UI가 무한 로딩에 갇히지 않도록 풀어준다.
        // eslint-disable-next-line no-console
        console.error("[active_lists] read failed", err);
        setLoading(false);
      },
    );
    return () => off(r, "value", handler);
  }, []);

  return { lists, loading };
}
