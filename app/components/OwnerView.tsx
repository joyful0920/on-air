"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ListMeta, PresenceEntry, Todo, UserProfile } from "@/lib/types";
import { useT } from "@/lib/i18n";
import { addTodo, expireTodoIfNeeded } from "@/hooks/useTodos";
import { endLive } from "@/hooks/useActiveListSync";
import { fromDatetimeLocalValue, toDatetimeLocalValue } from "@/lib/time";
import { ref, update } from "firebase/database";
import { firebaseDb } from "@/lib/firebase";
import Avatar from "./Avatar";
import TodoItem from "./TodoItem";
import WatcherChips from "./WatcherChips";
import YoutubePlayer from "./YoutubePlayer";
import YoutubeEditor from "./YoutubeEditor";

interface Props {
  shareId: string;
  uid: string;
  profile: UserProfile;
  meta: ListMeta;
  todos: Todo[];
  presence: PresenceEntry[];
}

export default function OwnerView({ shareId, uid, profile, meta, todos, presence }: Props) {
  const t = useT();
  const router = useRouter();
  const [title, setTitle] = useState(meta.title);
  const [newText, setNewText] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);

  // 마운트 시 만료 sweep
  useEffect(() => {
    todos.forEach((td) => {
      if (td.status === "active" && td.deadline <= Date.now()) {
        expireTodoIfNeeded(shareId, td.id).catch(() => undefined);
      }
    });
    // 한 번만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareId]);

  // meta.title 변경(다른 탭 동기화) 반영
  useEffect(() => {
    setTitle(meta.title);
  }, [meta.title]);

  const watcherUids = useMemo(
    () => presence.filter((p) => p.uid !== uid).map((p) => p.uid),
    [presence, uid],
  );

  const handleTitleBlur = async () => {
    const next = title.trim();
    if (!next || next === meta.title) return;
    const db = firebaseDb();
    await update(ref(db, `lists/${shareId}/meta`), { title: next });
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const text = newText.trim();
    if (!text) return;
    const dl = fromDatetimeLocalValue(newDeadline);
    if (dl === null) {
      setError(t("list.deadlineRequired"));
      return;
    }
    if (dl <= Date.now()) {
      setError(t("list.deadlinePast"));
      return;
    }
    await addTodo(shareId, { text, deadline: dl });
    setNewText("");
    setNewDeadline("");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // noop
    }
  };

  const handleEndLive = async () => {
    if (ending) return;
    if (typeof window === "undefined") return;
    if (!window.confirm(t("list.endLiveConfirm"))) return;
    setEnding(true);
    try {
      await endLive(shareId);
      router.push("/");
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[end-live] failed", err);
      setEnding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={profile.name} color={profile.color} iconKey={profile.iconKey} size="lg" />
          <div className="min-w-0">
            <div className="group relative inline-block w-full max-w-md">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleBlur}
                placeholder={t("list.titlePlaceholder")}
                className="bg-transparent border-b-2 border-dashed border-onair-line/70 group-hover:border-solid group-hover:border-onair-mute focus:border-solid focus:border-onair-live outline-none text-2xl font-bold w-full py-1 pr-8 transition placeholder:text-onair-mute placeholder:font-medium"
              />
              <span
                className="absolute right-1 bottom-2 text-onair-mute opacity-70 group-hover:opacity-100 group-focus-within:opacity-0 text-base transition pointer-events-none"
                aria-hidden
              >
                ✎
              </span>
            </div>
            <div className="text-xs text-onair-mute mt-2 flex items-center gap-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-onair-live animate-pulseLive" />
              ON AIR
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {watcherUids.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-onair-mute">
                {t("list.watchersWith", { count: watcherUids.length })}
              </span>
              <WatcherChips uids={watcherUids} />
            </div>
          )}
          <button
            type="button"
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-lg border border-onair-line text-sm hover:bg-onair-panel transition"
          >
            {copied ? t("common.copied") : t("common.copyUrl")}
          </button>
          <button
            type="button"
            onClick={handleEndLive}
            disabled={ending}
            className="px-3 py-1.5 rounded-lg border border-onair-line text-sm text-onair-mute hover:text-onair-live hover:border-onair-live transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ⏹ {t("list.endLive")}
          </button>
        </div>
      </div>

      {meta.youtubeVideoId && <YoutubePlayer videoId={meta.youtubeVideoId} />}
      <YoutubeEditor shareId={shareId} currentVideoId={meta.youtubeVideoId} />

      <form
        onSubmit={handleAdd}
        className="flex flex-col sm:flex-row gap-2 bg-onair-panel border border-onair-line rounded-2xl p-3 focus-within:border-onair-mute transition"
      >
        <input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder={t("list.todoPlaceholder")}
          className="flex-1 bg-onair-bg border border-onair-line rounded-lg px-3 py-2.5 outline-none focus:border-onair-live transition placeholder:text-onair-mute"
        />
        <label
          className="flex items-center gap-2 bg-onair-bg border border-onair-line rounded-lg px-3 py-2 focus-within:border-onair-live transition"
          aria-label={t("list.deadline")}
        >
          <span className="text-onair-mute" aria-hidden>📅</span>
          <input
            type="datetime-local"
            value={newDeadline}
            min={toDatetimeLocalValue(Date.now())}
            onChange={(e) => setNewDeadline(e.target.value)}
            className="bg-transparent outline-none text-sm tabular-nums"
          />
        </label>
        <button
          type="submit"
          className="px-5 py-2.5 rounded-lg bg-onair-live text-white font-semibold hover:opacity-90 transition flex items-center gap-1 justify-center whitespace-nowrap"
        >
          <span className="text-lg leading-none" aria-hidden>＋</span>
          {t("list.addTodo")}
        </button>
      </form>
      {error && <p className="text-xs text-onair-warn">{error}</p>}

      {todos.length === 0 ? (
        <p className="text-onair-mute text-sm py-10 text-center">{t("list.noTodos")}</p>
      ) : (
        <ul className="space-y-2">
          {todos.map((td) => (
            <TodoItem key={td.id} shareId={shareId} todo={td} canEdit />
          ))}
        </ul>
      )}
    </div>
  );
}
