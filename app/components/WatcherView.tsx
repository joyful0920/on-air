"use client";

import { useEffect, useMemo } from "react";
import type { ListMeta, PresenceEntry, Todo } from "@/lib/types";
import { useT } from "@/lib/i18n";
import { useUserProfile } from "@/hooks/useUserProfile";
import { expireTodoIfNeeded } from "@/hooks/useTodos";
import Avatar from "./Avatar";
import TodoItem from "./TodoItem";
import WatcherChips from "./WatcherChips";
import YoutubePlayer from "./YoutubePlayer";

interface Props {
  shareId: string;
  uid: string;
  meta: ListMeta;
  todos: Todo[];
  presence: PresenceEntry[];
}

export default function WatcherView({ shareId, uid, meta, todos, presence }: Props) {
  const t = useT();
  const ownerProfile = useUserProfile(meta.ownerId);

  useEffect(() => {
    todos.forEach((td) => {
      if (td.status === "active" && td.deadline <= Date.now()) {
        expireTodoIfNeeded(shareId, td.id).catch(() => undefined);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareId]);

  const otherWatcherUids = useMemo(
    () => presence.filter((p) => p.uid !== uid && p.uid !== meta.ownerId).map((p) => p.uid),
    [presence, uid, meta.ownerId],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          {ownerProfile && (
            <Avatar name={ownerProfile.name} color={ownerProfile.color} iconKey={ownerProfile.iconKey} size="lg" />
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-bold truncate">{meta.title || "—"}</h1>
            <div className="text-xs text-onair-mute mt-1 flex items-center gap-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-onair-live animate-pulseLive" />
              {ownerProfile
                ? t("list.ownerHeader", { name: ownerProfile.name })
                : t("list.watching")}
            </div>
          </div>
        </div>
        {otherWatcherUids.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-onair-mute">
              {t("list.watchersWith", { count: otherWatcherUids.length })}
            </span>
            <WatcherChips uids={otherWatcherUids} />
          </div>
        )}
      </div>

      {meta.youtubeVideoId && <YoutubePlayer videoId={meta.youtubeVideoId} />}

      {todos.length === 0 ? (
        <p className="text-onair-mute text-sm py-10 text-center">{t("list.noTodos")}</p>
      ) : (
        <ul className="space-y-2">
          {todos.map((td) => (
            <TodoItem key={td.id} shareId={shareId} todo={td} canEdit={false} />
          ))}
        </ul>
      )}
    </div>
  );
}
