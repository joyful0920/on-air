"use client";

import { useEffect } from "react";
import { useAnonAuth } from "@/hooks/useAnonAuth";
import { useActiveLists } from "@/hooks/useActiveLists";

/**
 * owner 본인이 라이브 카드를 1개라도 갖고 있을 때 탭 종료 시 확인 다이얼로그를 띄운다.
 * onDisconnect로 active_lists가 자동 삭제되는 동작은 그대로 유지하되,
 * 사용자가 실수로 탭을 닫아 방송이 종료되는 일을 한 번 막아준다.
 *
 * 주의: 브라우저는 beforeunload의 커스텀 메시지를 무시하고 자체 문구를 보여준다.
 */
export default function BroadcastGuard() {
  const { uid } = useAnonAuth();
  const { lists } = useActiveLists();
  const ownsLive = !!uid && lists.some((l) => l.ownerId === uid);

  useEffect(() => {
    if (!ownsLive) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [ownsLive]);

  return null;
}
