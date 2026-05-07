"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLocale, useT } from "@/lib/i18n";
import { USER_COLORS, pickRandomColor } from "@/lib/colors";
import {
  DEFAULT_ICON_KEY,
  inferIconKeyFromName,
  isIconKey,
  pickRandomIconKey,
  randomProfile,
  type IconKey,
} from "@/lib/nicknames";
import Avatar from "./Avatar";
import type { UserColor, UserProfile } from "@/lib/types";

interface Props {
  /** 편집 모드일 때 초기값. 미제공 시 온보딩 모드로 새 프로필을 자동 생성. */
  initial?: UserProfile;
  onSubmit: (profile: UserProfile) => void;
  /** 제공되면 취소 버튼을 표시한다. (편집 모드에서 사용) */
  onCancel?: () => void;
}

const MAX_LEN = 30;

function pickDifferentColor(prev: UserColor): UserColor {
  if (USER_COLORS.length <= 1) return prev;
  let next = pickRandomColor();
  if (next === prev) {
    const idx = USER_COLORS.indexOf(prev);
    next = USER_COLORS[(idx + 1) % USER_COLORS.length]!;
  }
  return next;
}

function normalizeIconKey(v: string | undefined): IconKey {
  return isIconKey(v) ? v : DEFAULT_ICON_KEY;
}

export default function ProfileDialog({ initial, onSubmit, onCancel }: Props) {
  const t = useT();
  const { locale } = useLocale();
  const isEdit = initial !== undefined;

  const [name, setName] = useState(initial?.name ?? "");
  const [iconKey, setIconKey] = useState<IconKey>(normalizeIconKey(initial?.iconKey));
  const [color, setColor] = useState<UserColor>(initial?.color ?? (() => pickRandomColor())());

  // 온보딩 모드: 마운트/locale 변경 시 비어 있으면 자동 채움
  useEffect(() => {
    if (isEdit) return;
    setName((prev) => {
      if (prev.trim()) return prev;
      const p = randomProfile(locale);
      setIconKey(p.iconKey);
      return p.name;
    });
  }, [locale, isEdit]);

  const trimmed = name.trim();
  const canSubmit = trimmed.length >= 1 && trimmed.length <= MAX_LEN;

  const handleNameChange = (next: string) => {
    setName(next);
    const inferred = inferIconKeyFromName(next);
    if (inferred) setIconKey(inferred);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({ name: trimmed, color, iconKey });
  };

  const handleShuffleAll = () => {
    const p = randomProfile(locale);
    setName(p.name);
    setIconKey(p.iconKey);
    setColor(pickDifferentColor(color));
  };

  // 아바타 클릭 → 아이콘+컬러만 셔플 (닉네임 유지)
  const handleShuffleIcon = () => {
    setIconKey((prev) => pickRandomIconKey(prev));
    setColor((prev) => pickDifferentColor(prev));
  };

  const submitLabel = isEdit ? t("profile.save") : t("common.confirm");

  // body 스크롤 잠금 (다이얼로그 열린 동안)
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // SSR 가드: portal은 클라이언트에서만
  if (typeof document === "undefined") return null;

  const dialog = (
    <div className="fixed inset-0 z-50 bg-black/70 overflow-y-auto">
      <div className="min-h-full flex items-center justify-center px-4 py-10">
        <form
          onSubmit={handleSubmit}
          className="bg-onair-panel border border-onair-line rounded-2xl p-6 w-full max-w-sm space-y-5"
        >
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={handleShuffleIcon}
              className="rounded-full hover:opacity-90 active:scale-95 transition focus:outline-none focus:ring-2 focus:ring-onair-live focus:ring-offset-2 focus:ring-offset-onair-panel"
              aria-label={t("onboarding.shuffleIconHint")}
              title={t("onboarding.shuffleIconHint")}
            >
              <Avatar name={trimmed || "?"} color={color} iconKey={iconKey} size="lg" />
            </button>
            <button
              type="button"
              onClick={handleShuffleIcon}
              className="px-3 py-1.5 rounded-full border border-onair-line text-xs text-onair-mute hover:text-onair-ink hover:border-onair-mute transition"
            >
              🎲 {t("profile.shuffleIcon")}
            </button>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">
              {t("onboarding.askName")}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value.slice(0, MAX_LEN))}
                maxLength={MAX_LEN}
                className="flex-1 bg-onair-bg border border-onair-line rounded-lg px-3 py-2 text-base"
                autoFocus={!isEdit}
              />
              <button
                type="button"
                onClick={handleShuffleAll}
                className="px-3 py-2 rounded-lg border border-onair-line text-sm hover:bg-onair-bg transition whitespace-nowrap"
                aria-label={t("onboarding.shuffle")}
                title={t("onboarding.shuffle")}
              >
                🎲
              </button>
            </div>
            <p className="text-xs text-onair-mute mt-1">{t("onboarding.nameHint")}</p>
          </div>

          <div className="flex gap-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 py-2.5 rounded-lg border border-onair-line text-onair-ink font-semibold hover:bg-onair-bg transition"
              >
                {t("common.cancel")}
              </button>
            )}
            <button
              type="submit"
              disabled={!canSubmit}
              className="flex-[2] py-2.5 rounded-lg bg-onair-live text-white font-semibold disabled:bg-onair-line disabled:text-onair-mute transition"
            >
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}
