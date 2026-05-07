"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useT } from "@/lib/i18n";
import { getBot, botToTodos } from "@/lib/bots";
import { usePresenceList } from "@/hooks/usePresence";
import type { Todo, TodoStatus } from "@/lib/types";
import Avatar from "./Avatar";
import TodoItem from "./TodoItem";
import YoutubePlayer from "./YoutubePlayer";

const STATUS_ORDER: Record<TodoStatus, number> = {
  active: 0,
  expired: 1,
  done: 2,
};

interface Props {
  shareId: string;
}

export default function BotListView({ shareId }: Props) {
  const t = useT();
  const { locale } = useLocale();
  const [sessionStart, setSessionStart] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setSessionStart(Date.now());
    // 봇 todo의 status를 매 초 재계산 (active deadline이 지나면 expired로)
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const bot = getBot(shareId);
  const presence = usePresenceList(shareId);

  const todos = useMemo<Todo[]>(() => {
    if (!bot || sessionStart === null) return [];
    const arr = botToTodos(bot, locale, sessionStart, now);
    arr.sort((a, b) => {
      const so = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      if (so !== 0) return so;
      if (a.deadline !== b.deadline) return a.deadline - b.deadline;
      return a.createdAt - b.createdAt;
    });
    return arr;
  }, [bot, locale, sessionStart, now]);

  if (!bot) {
    return <p className="text-onair-mute text-sm">404</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={bot.ownerName[locale]} color={bot.ownerColor} iconKey={bot.ownerIconKey} size="lg" />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold truncate">{bot.title[locale]}</h1>
            <div className="text-xs text-onair-mute mt-1 flex items-center gap-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-onair-live animate-pulseLive" />
              {t("list.ownerHeader", { name: bot.ownerName[locale] })}
            </div>
          </div>
        </div>
        <div className="text-xs text-onair-mute">
          {t("dashboard.watchers", { count: bot.watcherCount + presence.length })}
        </div>
      </div>

      {bot.youtubeVideoId && <YoutubePlayer videoId={bot.youtubeVideoId} />}

      {todos.length === 0 ? (
        <p className="text-onair-mute text-sm py-10 text-center">{t("common.loading")}</p>
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
