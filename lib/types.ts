export type UserColor =
  | "#ff6b6b"
  | "#ffa94d"
  | "#ffd43b"
  | "#69db7c"
  | "#4dabf7"
  | "#9775fa"
  | "#f783ac"
  | "#22d3ee";

export interface UserProfile {
  name: string;
  color: UserColor;
  iconKey?: string;
}

export type TodoStatus = "active" | "done" | "expired";

export interface Todo {
  id: string;
  text: string;
  done: boolean;
  deadline: number;
  status: TodoStatus;
  createdAt: number;
  completedAt: number | null;
}

export interface ListMeta {
  ownerId: string;
  title: string;
  createdAt: number;
  youtubeVideoId?: string;
}

export type PresenceRole = "owner" | "watcher";

export interface PresenceEntry {
  uid: string;
  role: PresenceRole;
  lastSeen: number;
}

export interface ReactionEntry {
  id: string;
  fromUid: string;
  emoji: string;
  createdAt: number;
}

export interface ActiveListSummary {
  shareId: string;
  ownerId: string;
  ownerName: string;
  ownerColor: UserColor;
  ownerIconKey?: string;
  title: string;
  todoCount: number;
  doneCount: number;
  nextDeadline: number | null;
  watcherCount: number;
  updatedAt: number;
}

export function nameInitial(name: string): string {
  const arr = Array.from(name.trim());
  return arr[0] ?? "?";
}
