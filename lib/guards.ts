import type {
  ActiveListSummary,
  ListMeta,
  PresenceEntry,
  ReactionEntry,
  Todo,
  TodoStatus,
  UserProfile,
} from "./types";
import { isUserColor } from "./colors";

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export function isUserProfile(v: unknown): v is UserProfile {
  if (!isObj(v)) return false;
  if (
    typeof v.name !== "string" ||
    v.name.trim().length === 0 ||
    !isUserColor(v.color)
  ) {
    return false;
  }
  // iconKey는 선택적: 미보유 기존 사용자 호환
  if (v.iconKey !== undefined && typeof v.iconKey !== "string") return false;
  return true;
}

function isTodoStatus(v: unknown): v is TodoStatus {
  return v === "active" || v === "done" || v === "expired";
}

export function parseTodo(id: string, v: unknown): Todo | null {
  if (!isObj(v)) return null;
  if (
    typeof v.text !== "string" ||
    typeof v.done !== "boolean" ||
    typeof v.deadline !== "number" ||
    typeof v.createdAt !== "number" ||
    !isTodoStatus(v.status)
  ) {
    return null;
  }
  return {
    id,
    text: v.text,
    done: v.done,
    deadline: v.deadline,
    status: v.status,
    createdAt: v.createdAt,
    completedAt: typeof v.completedAt === "number" ? v.completedAt : null,
  };
}

export function parseListMeta(v: unknown): ListMeta | null {
  if (!isObj(v)) return null;
  if (
    typeof v.ownerId !== "string" ||
    typeof v.title !== "string" ||
    typeof v.createdAt !== "number"
  ) {
    return null;
  }
  const youtubeVideoId =
    typeof v.youtubeVideoId === "string" && v.youtubeVideoId.length > 0
      ? v.youtubeVideoId
      : undefined;
  return {
    ownerId: v.ownerId,
    title: v.title,
    createdAt: v.createdAt,
    youtubeVideoId,
  };
}

export function parsePresence(uid: string, v: unknown): PresenceEntry | null {
  if (!isObj(v)) return null;
  if (
    (v.role !== "owner" && v.role !== "watcher") ||
    typeof v.lastSeen !== "number"
  ) {
    return null;
  }
  return { uid, role: v.role, lastSeen: v.lastSeen };
}

export function parseReaction(id: string, v: unknown): ReactionEntry | null {
  if (!isObj(v)) return null;
  if (
    typeof v.fromUid !== "string" ||
    typeof v.emoji !== "string" ||
    typeof v.createdAt !== "number"
  ) {
    return null;
  }
  return { id, fromUid: v.fromUid, emoji: v.emoji, createdAt: v.createdAt };
}

export function parseActiveListSummary(
  shareId: string,
  v: unknown,
): ActiveListSummary | null {
  if (!isObj(v)) return null;
  if (
    typeof v.ownerId !== "string" ||
    typeof v.ownerName !== "string" ||
    !isUserColor(v.ownerColor) ||
    typeof v.title !== "string" ||
    typeof v.todoCount !== "number" ||
    typeof v.doneCount !== "number" ||
    typeof v.watcherCount !== "number" ||
    typeof v.updatedAt !== "number"
  ) {
    return null;
  }
  const nextDeadline =
    typeof v.nextDeadline === "number" ? v.nextDeadline : null;
  const ownerIconKey =
    typeof v.ownerIconKey === "string" ? v.ownerIconKey : undefined;
  return {
    shareId,
    ownerId: v.ownerId,
    ownerName: v.ownerName,
    ownerColor: v.ownerColor,
    ownerIconKey,
    title: v.title,
    todoCount: v.todoCount,
    doneCount: v.doneCount,
    nextDeadline,
    watcherCount: v.watcherCount,
    updatedAt: v.updatedAt,
  };
}
