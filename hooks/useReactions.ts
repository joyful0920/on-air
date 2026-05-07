"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  off,
  onChildAdded,
  onValue,
  push,
  ref,
  remove,
  runTransaction,
  set,
} from "firebase/database";
import { firebaseDb } from "@/lib/firebase";
import { parseReaction } from "@/lib/guards";
import type { ReactionEntry } from "@/lib/types";

const THROTTLE_MS = 2_000;
const ANIMATION_MS = 3_400;
const RTDB_CLEANUP_MS = 5_000;

export interface FloatingReaction extends ReactionEntry {
  /** 발사점 기준 가로 오프셋 (px, ±) */
  startOffset: number;
  /** 위로 떠오르며 좌우로 휘청이는 단계별 sway 값 (px, ±) */
  sway1: number;
  sway2: number;
  sway3: number;
  swayEnd: number;
  /** 단계별 회전 (deg, ±) */
  rot1: number;
  rot2: number;
  rot3: number;
  /** 폰트 크기 (px) */
  size: number;
  /** 애니메이션 길이 (ms) */
  duration: number;
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function makeFloating(entry: ReactionEntry): FloatingReaction {
  // 좌우 휘청은 부호를 번갈아주면 자연스러운 S-curve가 됨
  const dir = Math.random() < 0.5 ? -1 : 1;
  return {
    ...entry,
    startOffset: rand(-30, 30),
    sway1: dir * rand(8, 28),
    sway2: -dir * rand(10, 32),
    sway3: dir * rand(6, 22),
    swayEnd: -dir * rand(8, 24),
    rot1: dir * rand(-12, 12),
    rot2: -dir * rand(-15, 15),
    rot3: dir * rand(-10, 10),
    size: rand(28, 38),
    duration: rand(2800, 3600),
  };
}

export function useReactions(shareId: string | null, uid: string | null) {
  const [floating, setFloating] = useState<FloatingReaction[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const lastSentRef = useRef(0);
  const [throttled, setThrottled] = useState(false);

  useEffect(() => {
    if (!shareId) return;
    const db = firebaseDb();
    const r = ref(db, `lists/${shareId}/reactions`);
    const handler = onChildAdded(r, (snap) => {
      const id = snap.key;
      if (!id) return;
      const parsed = parseReaction(id, snap.val());
      if (!parsed) return;
      // 애니메이션 시간 이상 지난 reaction은 표시하지 않음 (재구독 시 과거 잔상 방지)
      if (Date.now() - parsed.createdAt > ANIMATION_MS) return;
      const float = makeFloating(parsed);
      setFloating((prev) => [...prev, float]);
      window.setTimeout(() => {
        setFloating((prev) => prev.filter((x) => x.id !== id));
      }, float.duration + 100);
    });
    return () => off(r, "child_added", handler);
  }, [shareId]);

  // 누적 카운트 구독
  useEffect(() => {
    if (!shareId) {
      setCounts({});
      return;
    }
    const db = firebaseDb();
    const r = ref(db, `lists/${shareId}/reactionCounts`);
    const handler = onValue(r, (snap) => {
      const v = snap.val() as Record<string, unknown> | null;
      if (!v) {
        setCounts({});
        return;
      }
      const out: Record<string, number> = {};
      for (const [emoji, val] of Object.entries(v)) {
        if (typeof val === "number") out[emoji] = val;
      }
      setCounts(out);
    });
    return () => off(r, "value", handler);
  }, [shareId]);

  const send = useCallback(
    async (emoji: string) => {
      if (!shareId || !uid) return;
      const now = Date.now();
      if (now - lastSentRef.current < THROTTLE_MS) {
        setThrottled(true);
        window.setTimeout(() => setThrottled(false), THROTTLE_MS);
        return;
      }
      lastSentRef.current = now;
      setThrottled(true);
      window.setTimeout(() => setThrottled(false), THROTTLE_MS);
      const db = firebaseDb();
      const newRef = push(ref(db, `lists/${shareId}/reactions`));
      const id = newRef.key!;
      await set(newRef, { fromUid: uid, emoji, createdAt: now });
      // 누적 카운터 +1 (transaction으로 동시성 보호, strict +1 룰 통과)
      runTransaction(
        ref(db, `lists/${shareId}/reactionCounts/${emoji}`),
        (current) => (typeof current === "number" ? current : 0) + 1,
      ).catch(() => undefined);
      // 발신자가 일정 시간 뒤 본인 reaction node 삭제
      window.setTimeout(() => {
        remove(ref(db, `lists/${shareId}/reactions/${id}`)).catch(() => undefined);
      }, RTDB_CLEANUP_MS);
    },
    [shareId, uid],
  );

  return { floating, send, throttled, counts };
}
