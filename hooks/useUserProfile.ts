"use client";

import { useEffect, useState } from "react";
import { off, onValue, ref } from "firebase/database";
import { firebaseDb } from "@/lib/firebase";
import { isUserProfile } from "@/lib/guards";
import type { UserProfile } from "@/lib/types";

export function useUserProfile(uid: string | null): UserProfile | null {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  useEffect(() => {
    if (!uid) {
      setProfile(null);
      return;
    }
    const db = firebaseDb();
    const r = ref(db, `users/${uid}`);
    const handler = onValue(r, (snap) => {
      const v = snap.val();
      setProfile(isUserProfile(v) ? v : null);
    });
    return () => off(r, "value", handler);
  }, [uid]);
  return profile;
}
