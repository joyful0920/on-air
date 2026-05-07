"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ref, set } from "firebase/database";
import { nanoid } from "nanoid";
import { firebaseDb } from "@/lib/firebase";
import { useAnonAuth, saveUserProfile } from "@/hooks/useAnonAuth";
import { useActiveLists } from "@/hooks/useActiveLists";
import { useOwnerCardsLiveSync } from "@/hooks/useOwnerCardsLiveSync";
import { useBotPresenceCounts } from "@/hooks/useBotPresenceCounts";
import { useLocale, useT } from "@/lib/i18n";
import OnboardingDialog from "./components/OnboardingDialog";
import DashboardCard from "./components/DashboardCard";
import { BOTS, botToSummary } from "@/lib/bots";
import type { ActiveListSummary, UserProfile } from "@/lib/types";

type SortMode = "deadline" | "watchers";

function compareDeadline(a: ActiveListSummary, b: ActiveListSummary): number {
  if (a.nextDeadline === null && b.nextDeadline === null) return b.updatedAt - a.updatedAt;
  if (a.nextDeadline === null) return 1;
  if (b.nextDeadline === null) return -1;
  return a.nextDeadline - b.nextDeadline;
}

export default function Dashboard() {
  const router = useRouter();
  const t = useT();
  const { locale } = useLocale();
  const { uid, profile, ready } = useAnonAuth();
  const { lists: realLists, loading } = useActiveLists();
  useOwnerCardsLiveSync(uid, realLists);
  const botPresence = useBotPresenceCounts();
  const [now, setNow] = useState(() => Date.now());
  const [pendingCreate, setPendingCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("deadline");

  // 첫 렌더부터 봇 카드를 그대로 노출한다. 온보딩 다이얼로그는 portal 오버레이로
  // 그 위에 뜨므로 본문은 항상 대시보드 상태를 유지.
  // sessionStart는 useState lazy init으로 마운트 시점에 한 번만 고정 → 카운트다운이 흔들리지 않게.
  const [sessionStart] = useState<number>(() => Date.now());

  const lists = useMemo(() => {
    const botSummaries = BOTS.map((b) => {
      const summary = botToSummary(b, locale, sessionStart);
      const extra = botPresence[b.shareId] ?? 0;
      return { ...summary, watcherCount: summary.watcherCount + extra };
    });
    return [...realLists, ...botSummaries];
  }, [sessionStart, realLists, locale, botPresence]);

  const myExisting = useMemo(
    () => (uid ? lists.find((l) => l.ownerId === uid) : null),
    [uid, lists],
  );

  const sortedLists = useMemo(() => {
    const arr = [...lists];
    if (sortMode === "watchers") {
      arr.sort((a, b) => {
        if (a.watcherCount !== b.watcherCount) return b.watcherCount - a.watcherCount;
        return compareDeadline(a, b);
      });
    } else {
      arr.sort(compareDeadline);
    }
    return arr;
  }, [lists, sortMode]);

  // 카드 카운트다운: setInterval 하나로 묶어 1초마다 setState
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const needsOnboarding = ready && !!uid && !profile;

  const createList = async () => {
    if (!uid || !profile) return;
    setCreating(true);
    try {
      const shareId = nanoid(10);
      const db = firebaseDb();
      await set(ref(db, `lists/${shareId}/meta`), {
        ownerId: uid,
        title: t("list.defaultTitle", { name: profile.name }),
        createdAt: Date.now(),
      });
      router.push(`/list/${shareId}`);
    } finally {
      setCreating(false);
    }
  };

  const handleCreateClick = () => {
    if (!ready || !uid) return;
    // 이미 자기 라이브가 있으면 새로 만들지 않고 그쪽으로 이동
    if (myExisting) {
      router.push(`/list/${myExisting.shareId}`);
      return;
    }
    if (!profile) {
      setPendingCreate(true);
      return;
    }
    void createList();
  };

  const handleOnboardSubmit = async (p: UserProfile) => {
    if (!uid) return;
    await saveUserProfile(uid, p);
    if (pendingCreate) {
      setPendingCreate(false);
      // 온보딩 직후 멀티-라이브 방지 재확인
      if (myExisting) {
        router.push(`/list/${myExisting.shareId}`);
        return;
      }
      const db = firebaseDb();
      const shareId = nanoid(10);
      await set(ref(db, `lists/${shareId}/meta`), {
        ownerId: uid,
        title: t("list.defaultTitle", { name: p.name }),
        createdAt: Date.now(),
      });
      router.push(`/list/${shareId}`);
      return;
    }
    // 첫 가입 직후 대시보드가 stale 상태로 멈추는 케이스 회피.
    // 단순 reload는 일부 브라우저/CDN 캐시를 통과해버려 같은 stale HTML이 다시 떨어진다.
    // 타임스탬프 쿼리스트링을 붙여 fresh URL로 navigate → 어떤 캐시 레이어도 우회된다.
    window.location.href = `/?onboarded=${Date.now()}`;
  };

  const titleText =
    lists.length > 0
      ? t("dashboard.title", { count: lists.length })
      : t("dashboard.titleEmpty");

  const buttonText = myExisting ? t("dashboard.viewMyLive") : t("dashboard.create");

  return (
    <div className="space-y-8">
      <section className="text-center py-6">
        <p className="text-onair-mute text-sm mb-2">{t("common.tagline")}</p>
        <h1 className="text-3xl sm:text-4xl font-bold">{titleText}</h1>
        <button
          type="button"
          onClick={handleCreateClick}
          disabled={!ready || creating}
          className="mt-6 px-6 py-3 rounded-full bg-onair-live text-white font-bold hover:opacity-90 transition disabled:opacity-50"
        >
          {buttonText}
        </button>
      </section>

      {lists.length === 0 ? (
        loading ? (
          <p className="text-center text-onair-mute text-sm">{t("common.loading")}</p>
        ) : (
          <p className="text-center text-onair-mute text-sm py-10">{t("dashboard.empty")}</p>
        )
      ) : (
        <>
          <div className="flex items-center gap-2 text-xs justify-end">
            <span className="text-onair-mute">{t("dashboard.sortLabel")}</span>
            <div className="flex items-center gap-1 border border-onair-line rounded-md p-0.5">
              <button
                type="button"
                onClick={() => setSortMode("deadline")}
                className={`px-2 py-1 rounded font-semibold transition ${
                  sortMode === "deadline"
                    ? "bg-onair-ink text-onair-bg"
                    : "text-onair-mute hover:text-onair-ink"
                }`}
              >
                {t("dashboard.sortByDeadline")}
              </button>
              <button
                type="button"
                onClick={() => setSortMode("watchers")}
                className={`px-2 py-1 rounded font-semibold transition ${
                  sortMode === "watchers"
                    ? "bg-onair-ink text-onair-bg"
                    : "text-onair-mute hover:text-onair-ink"
                }`}
              >
                {t("dashboard.sortByWatchers")}
              </button>
            </div>
          </div>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {sortedLists.map((s) => (
              <DashboardCard key={s.shareId} summary={s} now={now} />
            ))}
          </div>
        </>
      )}

      {(needsOnboarding || pendingCreate) && uid && !profile && (
        <OnboardingDialog onSubmit={handleOnboardSubmit} />
      )}
    </div>
  );
}
