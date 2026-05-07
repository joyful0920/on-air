"use client";

import { useEffect, useState } from "react";
import {
  off,
  onDisconnect,
  onValue,
  ref,
  set,
  update,
} from "firebase/database";
import { firebaseDb } from "@/lib/firebase";
import { parsePresence } from "@/lib/guards";
import type { PresenceEntry, PresenceRole } from "@/lib/types";

const HEARTBEAT_MS = 30_000;

export function usePresenceWriter(
  shareId: string | null,
  uid: string | null,
  role: PresenceRole | null,
): void {
  useEffect(() => {
    if (!shareId || !uid || !role) return;
    const db = firebaseDb();
    const r = ref(db, `lists/${shareId}/presence/${uid}`);
    set(r, { role, lastSeen: Date.now() }).catch((err) => {
      // eslint-disable-next-line no-console
      console.error("[presence] set failed", err);
    });
    onDisconnect(r).remove().catch(() => undefined);

    const interval = setInterval(() => {
      update(r, { lastSeen: Date.now() }).catch(() => undefined);
    }, HEARTBEAT_MS);

    return () => {
      clearInterval(interval);
      onDisconnect(r).cancel().catch(() => undefined);
      // 명시적 언마운트는 즉시 제거 (탭 이동/뷰 전환 시 즉시 사라지도록)
      set(r, null).catch(() => undefined);
    };
  }, [shareId, uid, role]);
}

export function usePresenceList(shareId: string | null): PresenceEntry[] {
  const [list, setList] = useState<PresenceEntry[]>([]);
  useEffect(() => {
    if (!shareId) return;
    const db = firebaseDb();
    const r = ref(db, `lists/${shareId}/presence`);
    const handler = onValue(r, (snap) => {
      const v = snap.val() as Record<string, unknown> | null;
      if (!v) {
        setList([]);
        return;
      }
      const out: PresenceEntry[] = [];
      for (const [uid, raw] of Object.entries(v)) {
        const p = parsePresence(uid, raw);
        if (p) out.push(p);
      }
      setList(out);
    });
    return () => off(r, "value", handler);
  }, [shareId]);
  return list;
}
