"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { off, onValue, ref, set } from "firebase/database";
import { firebaseAuth, firebaseDb } from "@/lib/firebase";
import { isUserProfile } from "@/lib/guards";
import type { UserProfile } from "@/lib/types";

export interface AnonAuthState {
  uid: string | null;
  profile: UserProfile | null;
  /** profile 노드를 처음으로 fetch한 직후 true. 온보딩 분기 트리거. */
  ready: boolean;
}

export function useAnonAuth(): AnonAuthState {
  const [uid, setUid] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const auth = firebaseAuth();
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUid(user.uid);
      } else {
        signInAnonymously(auth).catch((err) => {
          // eslint-disable-next-line no-console
          console.error("[auth] signInAnonymously failed", err);
        });
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!uid) return;
    const db = firebaseDb();
    const r = ref(db, `users/${uid}`);
    const handler = onValue(
      r,
      (snap) => {
        const v = snap.val();
        setProfile(isUserProfile(v) ? v : null);
        setReady(true);
      },
      (err) => {
        // eslint-disable-next-line no-console
        console.error("[auth] read profile failed", err);
        setReady(true);
      },
    );
    return () => off(r, "value", handler);
  }, [uid]);

  return { uid, profile, ready };
}

export async function saveUserProfile(uid: string, profile: UserProfile): Promise<void> {
  const db = firebaseDb();
  await set(ref(db, `users/${uid}`), profile);
}
