"use client";

import { useState } from "react";
import type { Todo } from "@/lib/types";
import { useLocale, useT } from "@/lib/i18n";
import Countdown from "./Countdown";
import { deleteTodo, expireTodoIfNeeded, toggleTodoDone, updateTodo } from "@/hooks/useTodos";
import { formatDateTime, fromDatetimeLocalValue, toDatetimeLocalValue } from "@/lib/time";
import { isBotShareId } from "@/lib/bots";

interface Props {
  shareId: string;
  todo: Todo;
  canEdit: boolean;
}

const STATUS_STYLES = {
  active: "border-l-onair-live bg-onair-panel",
  done: "border-l-emerald-500 bg-emerald-500/[0.04]",
  expired: "border-l-onair-warn bg-onair-warn/[0.04]",
} as const;

export default function TodoItem({ shareId, todo, canEdit }: Props) {
  const t = useT();
  const { locale } = useLocale();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(todo.text);
  const [deadline, setDeadline] = useState(toDatetimeLocalValue(todo.deadline));
  const [editError, setEditError] = useState<string | null>(null);

  // 봇 페이지에선 RTDB에 expire write를 시도하지 않음
  const onZero = isBotShareId(shareId)
    ? undefined
    : () => {
        expireTodoIfNeeded(shareId, todo.id).catch(() => undefined);
      };

  const handleSave = async () => {
    setEditError(null);
    const dl = fromDatetimeLocalValue(deadline);
    if (!text.trim() || dl === null) return;
    if (dl <= Date.now()) {
      setEditError(t("list.deadlinePast"));
      return;
    }
    await updateTodo(shareId, todo.id, { text: text.trim(), deadline: dl });
    setEditing(false);
  };

  const containerClass = `group flex items-center gap-3 px-4 py-3 rounded-xl border border-onair-line border-l-4 transition ${STATUS_STYLES[todo.status]}`;

  return (
    <li className={containerClass}>
      <CustomCheckbox
        checked={todo.done}
        disabled={!canEdit}
        ariaLabel={t(`status.${todo.status}` as const)}
        onToggle={() => toggleTodoDone(shareId, todo.id).catch(() => undefined)}
        status={todo.status}
      />

      <div className="flex-1 min-w-0">
        {editing && canEdit ? (
          <div className="flex flex-col gap-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="flex-1 bg-onair-bg border border-onair-line rounded-lg px-3 py-2 outline-none focus:border-onair-live transition"
                autoFocus
              />
              <label className="flex items-center gap-2 bg-onair-bg border border-onair-line rounded-lg px-3 py-2 focus-within:border-onair-live transition">
                <span className="text-onair-mute" aria-hidden>📅</span>
                <input
                  type="datetime-local"
                  value={deadline}
                  min={toDatetimeLocalValue(Date.now())}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="bg-transparent outline-none text-sm tabular-nums"
                />
              </label>
              <button
                type="button"
                onClick={handleSave}
                className="px-3 py-2 rounded-lg bg-onair-live text-white text-sm font-semibold"
              >
                {t("common.confirm")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditError(null);
                  setEditing(false);
                }}
                className="px-3 py-2 rounded-lg border border-onair-line text-sm"
              >
                {t("common.cancel")}
              </button>
            </div>
            {editError && <p className="text-xs text-onair-warn">{editError}</p>}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => canEdit && setEditing(true)}
            disabled={!canEdit}
            className={`flex items-center gap-2 w-full text-left rounded-md px-1 -mx-1 py-0.5 transition ${
              canEdit ? "hover:bg-onair-bg/60" : ""
            } ${todo.status === "done" || todo.status === "expired" ? "text-onair-mute" : ""}`}
          >
            <span className="break-words flex-1">{todo.text}</span>
            {canEdit && (
              <span
                className="text-onair-mute opacity-0 group-hover:opacity-60 transition text-sm"
                aria-hidden
              >
                ✎
              </span>
            )}
          </button>
        )}
      </div>

      <span className="text-sm font-mono whitespace-nowrap">
        {todo.status === "active" ? (
          <Countdown deadline={todo.deadline} onZero={onZero} />
        ) : todo.status === "done" ? (
          <span className="text-emerald-400 font-semibold">
            ✓{" "}
            {todo.completedAt
              ? t("list.completedAt", { time: formatDateTime(todo.completedAt, locale) })
              : t("status.done")}
          </span>
        ) : (
          <span className="text-onair-warn font-semibold">⏱ {t("status.expired")}</span>
        )}
      </span>

      {canEdit && (
        <button
          type="button"
          onClick={() => deleteTodo(shareId, todo.id).catch(() => undefined)}
          className="text-xs text-onair-mute hover:text-onair-live transition opacity-0 group-hover:opacity-100"
          aria-label={t("list.delete")}
        >
          {t("list.delete")}
        </button>
      )}
    </li>
  );
}

function CustomCheckbox({
  checked,
  disabled,
  ariaLabel,
  onToggle,
  status,
}: {
  checked: boolean;
  disabled: boolean;
  ariaLabel: string;
  onToggle: () => void;
  status: Todo["status"];
}) {
  return (
    <label
      className={`relative inline-flex items-center justify-center w-6 h-6 flex-shrink-0 ${
        disabled ? "cursor-not-allowed" : "cursor-pointer"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onToggle}
        className="peer sr-only"
        aria-label={ariaLabel}
      />
      <span
        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition ${
          checked
            ? "bg-emerald-500 border-emerald-500"
            : status === "expired"
            ? "border-onair-warn"
            : "border-onair-mute peer-hover:border-onair-ink peer-focus-visible:ring-2 peer-focus-visible:ring-onair-live/40"
        }`}
      >
        {checked && (
          <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 text-white" aria-hidden>
            <path
              d="M3 8.5l3.2 3.2L13 4.8"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        )}
      </span>
    </label>
  );
}
