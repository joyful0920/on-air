"use client";

import { useEffect, useState } from "react";
import { off, onValue, ref } from "firebase/database";
import { firebaseDb } from "@/lib/firebase";
import { isUserProfile } from "@/lib/guards";
import type { UserProfile } from "@/lib/types";
import Avatar from "./Avatar";

interface Props {
  uids: string[];
  max?: number;
}

export default function WatcherChips({ uids, max = 4 }: Props) {
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});

  useEffect(() => {
    const db = firebaseDb();
    const handlers: Array<() => void> = [];
    for (const uid of uids) {
      if (profiles[uid]) continue;
      const r = ref(db, `users/${uid}`);
      const h = onValue(r, (snap) => {
        const v = snap.val();
        if (isUserProfile(v)) {
          setProfiles((prev) => ({ ...prev, [uid]: v }));
        }
      });
      handlers.push(() => off(r, "value", h));
    }
    return () => {
      handlers.forEach((fn) => fn());
    };
    // 의존성에 profiles 빼고 uids만 → 새 uid 등장 시에만 구독 추가
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uids.join(",")]);

  const visible = uids.slice(0, max);
  const extra = uids.length - visible.length;

  return (
    <div className="flex items-center -space-x-2">
      {visible.map((uid) => {
        const p = profiles[uid];
        if (!p) {
          return (
            <span
              key={uid}
              className="w-7 h-7 rounded-full border-2 border-onair-bg bg-onair-line"
              aria-hidden
            />
          );
        }
        return (
          <span
            key={uid}
            className="rounded-full border-2 border-onair-bg"
            title={p.name}
          >
            <Avatar name={p.name} color={p.color} iconKey={p.iconKey} size="sm" />
          </span>
        );
      })}
      {extra > 0 && (
        <span className="w-7 h-7 rounded-full border-2 border-onair-bg bg-onair-line text-onair-ink text-xs font-bold flex items-center justify-center">
          +{extra}
        </span>
      )}
    </div>
  );
}
