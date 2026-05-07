"use client";

import { useState } from "react";
import { ref, update } from "firebase/database";
import { firebaseDb } from "@/lib/firebase";
import { extractYoutubeId } from "@/lib/youtube";
import { useT } from "@/lib/i18n";

interface Props {
  shareId: string;
  currentVideoId: string | undefined;
}

export default function YoutubeEditor({ shareId, currentVideoId }: Props) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setError(null);
    const id = extractYoutubeId(input);
    if (!id) {
      setError(t("list.bgmInvalid"));
      return;
    }
    setSaving(true);
    try {
      const db = firebaseDb();
      await update(ref(db, `lists/${shareId}/meta`), { youtubeVideoId: id });
      setInput("");
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    const db = firebaseDb();
    await update(ref(db, `lists/${shareId}/meta`), { youtubeVideoId: null });
  };

  if (editing) {
    return (
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("list.bgmPlaceholder")}
            className="flex-1 bg-onair-bg border border-onair-line rounded-lg px-3 py-2 text-sm outline-none focus:border-onair-live transition"
            autoFocus
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-onair-live text-white text-sm font-semibold disabled:opacity-50"
          >
            {t("common.confirm")}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setInput("");
              setError(null);
            }}
            className="px-4 py-2 rounded-lg border border-onair-line text-sm"
          >
            {t("common.cancel")}
          </button>
        </div>
        {error && <p className="text-xs text-onair-warn">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-xs text-onair-mute hover:text-onair-ink transition"
      >
        {currentVideoId ? t("list.bgmChange") : t("list.bgmAdd")}
      </button>
      {currentVideoId && (
        <button
          type="button"
          onClick={handleClear}
          className="text-xs text-onair-mute hover:text-onair-live transition"
        >
          × {t("list.bgmRemove")}
        </button>
      )}
    </div>
  );
}
