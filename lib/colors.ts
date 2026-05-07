import type { UserColor } from "./types";

export const USER_COLORS: readonly UserColor[] = [
  "#ff6b6b",
  "#ffa94d",
  "#ffd43b",
  "#69db7c",
  "#4dabf7",
  "#9775fa",
  "#f783ac",
  "#22d3ee",
] as const;

export function pickRandomColor(): UserColor {
  const idx = Math.floor(Math.random() * USER_COLORS.length);
  return USER_COLORS[idx] ?? USER_COLORS[0]!;
}

export function isUserColor(v: unknown): v is UserColor {
  return typeof v === "string" && (USER_COLORS as readonly string[]).includes(v);
}
