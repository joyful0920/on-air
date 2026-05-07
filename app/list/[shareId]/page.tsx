"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { off, onValue, ref } from "firebase/database";
import { firebaseDb } from "@/lib/firebase";
import { parseListMeta } from "@/lib/guards";
import type { ListMeta } from "@/lib/types";
import { useAnonAuth, saveUserProfile } from "@/hooks/useAnonAuth";
import { useTodos } from "@/hooks/useTodos";
import { usePresenceList, usePresenceWriter } from "@/hooks/usePresence";
import { useReactions } from "@/hooks/useReactions";
import { useActiveListSync } from "@/hooks/useActiveListSync";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useT } from "@/lib/i18n";
import { isBotShareId } from "@/lib/bots";
import OnboardingDialog from "@/app/components/OnboardingDialog";
import OwnerView from "@/app/components/OwnerView";
import WatcherView from "@/app/components/WatcherView";
import ReactionLayer from "@/app/components/ReactionLayer";
import ReactionBar from "@/app/components/ReactionBar";
import LiveSidebar from "@/app/components/LiveSidebar";
import BotListView from "@/app/components/BotListView";
import LiveEndedView from "@/app/components/LiveEndedView";

export default function ListPage() {
  const params = useParams<{ shareId: string }>();
  const shareId = params?.shareId ?? null;
  const isBot = shareId ? isBotShareId(shareId) : false;
  // 봇 페이지에선 RTDB 구독을 일절 하지 않도록 effective shareId를 null로
  const effectiveShareId = isBot ? null : shareId;
  const t = useT();

  const { uid, profile, ready } = useAnonAuth();
  const [meta, setMeta] = useState<ListMeta | null>(null);
  const [metaLoaded, setMetaLoaded] = useState(false);

  useEffect(() => {
    if (!effectiveShareId) return;
    const db = firebaseDb();
    const r = ref(db, `lists/${effectiveShareId}/meta`);
    const handler = onValue(r, (snap) => {
      const parsed = parseListMeta(snap.val());
      setMeta(parsed);
      setMetaLoaded(true);
    });
    return () => off(r, "value", handler);
  }, [effectiveShareId]);

  const isOwner = !!uid && !!meta && uid === meta.ownerId;
  const role = isOwner ? "owner" : "watcher";

  // 봇 페이지에서도 presence와 reactions는 동작시킴 (실시간 viewer 카운트 + 응원 가능)
  usePresenceWriter(
    shareId,
    uid,
    isBot ? "watcher" : meta ? role : null,
  );
  const presence = usePresenceList(effectiveShareId);
  const { todos } = useTodos(effectiveShareId);
  const { floating, send, throttled, counts: reactionCounts } = useReactions(shareId, uid);

  const ownerProfile = useUserProfile(meta?.ownerId ?? null);

  useActiveListSync({
    shareId: effectiveShareId,
    uid,
    ownerId: meta?.ownerId ?? null,
    title: meta?.title ?? "",
    ownerProfile: ownerProfile,
    todos,
    presence,
  });

  const needsOnboarding = !isBot && ready && uid && !profile;

  const handleOnboardSubmit = async (p: import("@/lib/types").UserProfile) => {
    if (!uid) return;
    await saveUserProfile(uid, p);
  };

  const content = useMemo(() => {
    if (!shareId) return null;
    if (isBot) {
      return <BotListView shareId={shareId} />;
    }
    if (!metaLoaded || !ready) {
      return <p className="text-onair-mute text-sm">{t("common.loading")}</p>;
    }
    if (!meta) {
      return <LiveEndedView />;
    }
    if (!uid) return null;
    if (isOwner) {
      if (!profile) return null; // 온보딩 다이얼로그가 뜸
      return (
        <OwnerView
          shareId={shareId}
          uid={uid}
          profile={profile}
          meta={meta}
          todos={todos}
          presence={presence}
        />
      );
    }
    return (
      <WatcherView shareId={shareId} uid={uid} meta={meta} todos={todos} presence={presence} />
    );
  }, [shareId, isBot, metaLoaded, ready, meta, uid, isOwner, profile, todos, presence, t]);

  return (
    <>
      <div className="flex gap-6">
        <div className="flex-1 min-w-0">{content}</div>
        <aside className="hidden lg:block w-72 shrink-0">
          <div className="sticky top-20">
            <LiveSidebar excludeShareId={shareId} />
          </div>
        </aside>
      </div>
      <ReactionLayer items={floating} />
      {uid && (isBot || meta) && (
        <ReactionBar
          onSend={send}
          throttled={throttled}
          counts={reactionCounts}
          readOnly={isOwner}
        />
      )}
      {needsOnboarding && <OnboardingDialog onSubmit={handleOnboardSubmit} />}
    </>
  );
}
