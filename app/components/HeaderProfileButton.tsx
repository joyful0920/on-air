"use client";

import { useState } from "react";
import { useAnonAuth, saveUserProfile } from "@/hooks/useAnonAuth";
import { useT } from "@/lib/i18n";
import type { UserProfile } from "@/lib/types";
import Avatar from "./Avatar";
import ProfileDialog from "./ProfileDialog";

export default function HeaderProfileButton() {
  const t = useT();
  const { uid, profile } = useAnonAuth();
  const [open, setOpen] = useState(false);

  if (!uid || !profile) return null;

  const handleSave = async (next: UserProfile) => {
    setOpen(false);
    try {
      await saveUserProfile(uid, next);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[profile] save failed", err);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full hover:opacity-90 active:scale-95 transition focus:outline-none focus:ring-2 focus:ring-onair-live focus:ring-offset-2 focus:ring-offset-onair-bg"
        aria-label={t("profile.edit")}
        title={t("profile.edit")}
      >
        <Avatar name={profile.name} color={profile.color} iconKey={profile.iconKey} size="sm" />
      </button>
      {open && (
        <ProfileDialog
          initial={profile}
          onSubmit={handleSave}
          onCancel={() => setOpen(false)}
        />
      )}
    </>
  );
}
