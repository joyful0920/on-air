export type UrgencyLevel = "normal" | "soon" | "urgent" | "critical";

export function urgencyLevel(remainingMs: number): UrgencyLevel {
  if (remainingMs <= 60_000) return "critical"; // ≤ 1m (0 이하 포함)
  if (remainingMs <= 10 * 60_000) return "urgent"; // ≤ 10m
  if (remainingMs <= 60 * 60_000) return "soon"; // ≤ 1h
  return "normal";
}

export const URGENCY_CLASS: Record<UrgencyLevel, string> = {
  normal: "",
  soon: "text-yellow-300",
  urgent: "text-onair-warn font-semibold",
  critical: "text-onair-live font-bold animate-pulseLive",
};

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

export function formatDateTime(epochMs: number, locale: "ja" | "ko"): string {
  const d = new Date(epochMs);
  const y = d.getFullYear();
  const mo = pad(d.getMonth() + 1);
  const da = pad(d.getDate());
  const h = pad(d.getHours());
  const mi = pad(d.getMinutes());
  if (locale === "ja") return `${y}/${mo}/${da} ${h}:${mi}`;
  return `${y}-${mo}-${da} ${h}:${mi}`;
}

export function countdownParts(remainingMs: number): { days: number; hms: string } {
  if (remainingMs <= 0) return { days: 0, hms: "00:00:00" };
  const totalSec = Math.floor(remainingMs / 1000);
  const days = Math.floor(totalSec / 86400);
  const rem = totalSec - days * 86400;
  const h = Math.floor(rem / 3600);
  const m = Math.floor((rem % 3600) / 60);
  const s = rem % 60;
  return { days, hms: `${pad(h)}:${pad(m)}:${pad(s)}` };
}

export function formatCountdown(remainingMs: number): string {
  return countdownParts(remainingMs).hms;
}

export function toDatetimeLocalValue(epochMs: number): string {
  const d = new Date(epochMs);
  const pad = (n: number) => n.toString().padStart(2, "0");
  const y = d.getFullYear();
  const mo = pad(d.getMonth() + 1);
  const da = pad(d.getDate());
  const h = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${y}-${mo}-${da}T${h}:${mi}`;
}

export function fromDatetimeLocalValue(value: string): number | null {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : null;
}
