"use client";

import { useEffect, useState } from "react";
import { URGENCY_CLASS, countdownParts, urgencyLevel } from "@/lib/time";
import { useT } from "@/lib/i18n";

interface Props {
  deadline: number;
  onZero?: () => void;
  className?: string;
}

export default function Countdown({ deadline, onZero, className }: Props) {
  const t = useT();
  const [now, setNow] = useState(() => Date.now());
  const fired = useState({ done: false })[0];

  useEffect(() => {
    fired.done = false;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [deadline, fired]);

  const remaining = deadline - now;
  useEffect(() => {
    if (remaining <= 0 && !fired.done) {
      fired.done = true;
      onZero?.();
    }
  }, [remaining, onZero, fired]);

  const level = urgencyLevel(remaining);
  const { days, hms } = countdownParts(remaining);
  const text = days > 0 ? t("common.countdownWithDays", { days, time: hms }) : hms;

  return (
    <span className={`tabular-nums ${URGENCY_CLASS[level]} ${className ?? ""}`}>
      {text}
    </span>
  );
}
