"use client";

import { useEffect, useState } from "react";
import {
  off,
  onValue,
  push,
  ref,
  remove,
  runTransaction,
  set,
  update,
} from "firebase/database";
import { firebaseDb } from "@/lib/firebase";
import { parseTodo } from "@/lib/guards";
import type { Todo, TodoStatus } from "@/lib/types";

// active(진행 중) 먼저 마감 임박 순, 그 다음 expired, 마지막 done.
const STATUS_ORDER: Record<TodoStatus, number> = {
  active: 0,
  expired: 1,
  done: 2,
};

export function useTodos(shareId: string | null) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!shareId) return;
    const db = firebaseDb();
    const todosRef = ref(db, `lists/${shareId}/todos`);
    const handler = onValue(todosRef, (snap) => {
      const v = snap.val() as Record<string, unknown> | null;
      if (!v) {
        setTodos([]);
      } else {
        const list: Todo[] = [];
        for (const [id, raw] of Object.entries(v)) {
          const parsed = parseTodo(id, raw);
          if (parsed) list.push(parsed);
        }
        list.sort((a, b) => {
          const so = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
          if (so !== 0) return so;
          if (a.deadline !== b.deadline) return a.deadline - b.deadline;
          return a.createdAt - b.createdAt;
        });
        setTodos(list);
      }
      setLoading(false);
    });
    return () => off(todosRef, "value", handler);
  }, [shareId]);

  return { todos, loading };
}

export async function addTodo(
  shareId: string,
  input: { text: string; deadline: number },
): Promise<void> {
  const db = firebaseDb();
  const newRef = push(ref(db, `lists/${shareId}/todos`));
  const now = Date.now();
  const status: TodoStatus = input.deadline > now ? "active" : "expired";
  await set(newRef, {
    text: input.text,
    done: false,
    deadline: input.deadline,
    status,
    createdAt: now,
  });
}

export async function updateTodo(
  shareId: string,
  todoId: string,
  patch: Partial<Pick<Todo, "text" | "deadline">>,
): Promise<void> {
  const db = firebaseDb();
  await update(ref(db, `lists/${shareId}/todos/${todoId}`), patch);
}

export async function deleteTodo(shareId: string, todoId: string): Promise<void> {
  const db = firebaseDb();
  await remove(ref(db, `lists/${shareId}/todos/${todoId}`));
}

/**
 * 체크 토글. transaction 사용 이유: 여러 탭에서 동시에 토글해도 done/status/completedAt이 어긋나지 않게.
 */
export async function toggleTodoDone(shareId: string, todoId: string): Promise<void> {
  const db = firebaseDb();
  const r = ref(db, `lists/${shareId}/todos/${todoId}`);
  await runTransaction(r, (current) => {
    if (!current || typeof current !== "object") return current;
    const cur = current as {
      done?: boolean;
      status?: TodoStatus;
      deadline?: number;
      completedAt?: number | null;
    };
    const nextDone = !cur.done;
    const now = Date.now();
    let nextStatus: TodoStatus;
    let nextCompletedAt: number | null;
    if (nextDone) {
      nextStatus = "done";
      nextCompletedAt = now;
    } else if (typeof cur.deadline === "number" && cur.deadline <= now) {
      nextStatus = "expired";
      nextCompletedAt = null;
    } else {
      nextStatus = "active";
      nextCompletedAt = null;
    }
    return { ...cur, done: nextDone, status: nextStatus, completedAt: nextCompletedAt };
  });
}

/**
 * 만료 처리. transaction 사용 이유: 여러 클라이언트가 동시에 만료 처리하지 않도록 (중복 write 방지 + 멱등).
 */
export async function expireTodoIfNeeded(shareId: string, todoId: string): Promise<void> {
  const db = firebaseDb();
  const r = ref(db, `lists/${shareId}/todos/${todoId}`);
  await runTransaction(r, (current) => {
    if (!current || typeof current !== "object") return current;
    const cur = current as { done?: boolean; status?: TodoStatus; deadline?: number };
    if (cur.done) return current;
    if (cur.status === "expired") return current;
    if (typeof cur.deadline !== "number") return current;
    if (cur.deadline > Date.now()) return current;
    return { ...cur, status: "expired" };
  });
}
