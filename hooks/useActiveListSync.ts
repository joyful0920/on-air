"use client";

import { useEffect, useRef } from "react";
import { onDisconnect, ref, set } from "firebase/database";
import { firebaseDb } from "@/lib/firebase";
import type { PresenceEntry, Todo, UserProfile } from "@/lib/types";

// 의도적으로 언마운트 시 active_lists 삭제를 하지 않는다.
// SPA 내 다른 페이지로 이동해도 Firebase 연결은 유지되므로 "방송 중"이 맞다.
// 모든 탭/창이 실제로 닫혀 RTDB 연결이 끊기면 onDisconnect.remove()가 서버에서 자동 정리.

interface SyncInput {
  shareId: string | null;
  uid: string | null;
  ownerId: string | null;
  title: string;
  ownerProfile: UserProfile | null;
  todos: Todo[];
  presence: PresenceEntry[];
}

const DEBOUNCE_MS = 350;

/**
 * owner 클라이언트에서만 active_lists/{shareId} 요약을 갱신한다.
 * - 모든 클라가 동시에 쓰면 write 충돌 → owner 단독 갱신.
 * - debounce 350ms로 입력 빈도가 높은 todo 편집 시 write 폭주 방지.
 * - 마운트 시 onDisconnect remove 등록 → owner의 모든 탭이 닫히면 대시보드에서 자동 제거.
 */
export function useActiveListSync({
  shareId,
  uid,
  ownerId,
  title,
  ownerProfile,
  todos,
  presence,
}: SyncInput): void {
  const isOwner = !!uid && uid === ownerId;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onDisconnectRegistered = useRef(false);

  useEffect(() => {
    if (!isOwner || !shareId || !ownerProfile || !ownerId) return;
    const db = firebaseDb();
    const r = ref(db, `active_lists/${shareId}`);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const activeTodos = todos.filter((t) => t.status === "active");
      const nextDeadline =
        activeTodos.length === 0
          ? null
          : activeTodos.reduce((min, t) => (t.deadline < min ? t.deadline : min), activeTodos[0]!.deadline);
      const watcherCount = presence.filter((p) => p.uid !== ownerId).length;
      const summary: Record<string, unknown> = {
        ownerId,
        ownerName: ownerProfile.name,
        ownerColor: ownerProfile.color,
        title,
        todoCount: todos.length,
        doneCount: todos.filter((t) => t.done).length,
        nextDeadline,
        watcherCount,
        updatedAt: Date.now(),
      };
      // iconKey가 없는 기존 프로필 호환: 있을 때만 기록
      if (ownerProfile.iconKey) {
        summary.ownerIconKey = ownerProfile.iconKey;
      }
      // onDisconnect 등록은 첫 set 직후 한 번만 (재등록 방지)
      set(r, summary)
        .then(() => {
          if (!onDisconnectRegistered.current) {
            onDisconnect(r).remove().catch(() => undefined);
            onDisconnectRegistered.current = true;
          }
        })
        .catch((err) => {
          // eslint-disable-next-line no-console
          console.error("[active_lists] write failed", err);
        });
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isOwner, shareId, ownerId, title, ownerProfile, todos, presence]);
}

/**
 * owner가 명시적으로 라이브를 종료한다.
 * - /lists/{shareId}/meta 삭제 → 모든 클라이언트의 list 페이지가 404로 전환되고 useActiveListSync가 멈춘다.
 * - /active_lists/{shareId} 삭제 → 대시보드 카드 즉시 제거.
 *
 * todos/presence/reactions 등 sub-tree는 보안 룰상 owner가 일괄 삭제할 수 없어 남겨둔다.
 * meta가 사라지면 어떤 UI도 그 데이터를 참조하지 않고, 시청자 presence는 onDisconnect로 자연 정리된다.
 */
export async function endLive(shareId: string): Promise<void> {
  const db = firebaseDb();
  await set(ref(db, `lists/${shareId}/meta`), null);
  await set(ref(db, `active_lists/${shareId}`), null);
}
