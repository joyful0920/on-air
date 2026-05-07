import type { ReactElement } from "react";
import { isIconKey, type IconKey } from "./nicknames";

// 24x24 viewBox 기준의 라인 스타일 아이콘. stroke=currentColor 이므로 부모에서 색을 지정한다.
// 각 항목은 <svg> 내부에 들어갈 자식 요소만 반환한다.

const Cat = (
  <g>
    <path d="M5 9 L7 4 L10 8" />
    <path d="M14 8 L17 4 L19 9" />
    <path d="M5 13 Q5 19 12 19 Q19 19 19 13 Q19 8 12 8 Q5 8 5 13 Z" />
    <circle cx="10" cy="13" r="0.6" fill="currentColor" stroke="none" />
    <circle cx="14" cy="13" r="0.6" fill="currentColor" stroke="none" />
    <path d="M11 16 Q12 17 13 16" />
    <path d="M3 14 L7 14" />
    <path d="M17 14 L21 14" />
  </g>
);

const Penguin = (
  <g>
    <ellipse cx="12" cy="13" rx="5.5" ry="8" />
    <ellipse cx="12" cy="15" rx="3" ry="5" />
    <circle cx="10.5" cy="9" r="0.6" fill="currentColor" stroke="none" />
    <circle cx="13.5" cy="9" r="0.6" fill="currentColor" stroke="none" />
    <path d="M11 11 L12 12.5 L13 11" />
    <path d="M9 21 L10 22.5" />
    <path d="M15 21 L14 22.5" />
  </g>
);

const Squirrel = (
  <g>
    <path d="M9 13 Q9 9 12 9 Q15 9 15 13 Q15 17 12 17 Q9 17 9 13 Z" />
    <path d="M10 7 L11 9" />
    <path d="M14 7 L13 9" />
    <circle cx="11" cy="13" r="0.5" fill="currentColor" stroke="none" />
    <circle cx="13" cy="13" r="0.5" fill="currentColor" stroke="none" />
    <path d="M15 16 Q19 14 19 10 Q19 5 14 5" />
    <path d="M9 17 L8 21 L13 21" />
  </g>
);

const Scholar = (
  <g>
    <path d="M3 10 L12 6 L21 10 L12 14 Z" />
    <path d="M6 12 L6 16 Q12 18.5 18 16 L18 12" />
    <path d="M19 10.5 L19 14" />
    <circle cx="19" cy="14.5" r="0.7" fill="currentColor" stroke="none" />
  </g>
);

const Robot = (
  <g>
    <path d="M12 3 L12 5" />
    <circle cx="12" cy="2.5" r="0.7" fill="currentColor" stroke="none" />
    <rect x="6" y="6" width="12" height="10" rx="1.5" />
    <circle cx="10" cy="10" r="0.8" fill="currentColor" stroke="none" />
    <circle cx="14" cy="10" r="0.8" fill="currentColor" stroke="none" />
    <path d="M9.5 13 L14.5 13" />
    <path d="M5 10 L5 13" />
    <path d="M19 10 L19 13" />
    <path d="M9 16 L9 20" />
    <path d="M15 16 L15 20" />
  </g>
);

const Hacker = (
  <g>
    <path d="M4 11 Q4 4 12 4 Q20 4 20 11 L20 17 Q20 20 17 20 L7 20 Q4 20 4 17 Z" />
    <path d="M4 13 Q12 16 20 13" />
    <path d="M8.5 14.5 L10.5 14.5" />
    <path d="M13.5 14.5 L15.5 14.5" />
  </g>
);

const Student = (
  <g>
    <path d="M4 7 L11 9 L11 19 L4 17 Z" />
    <path d="M20 7 L13 9 L13 19 L20 17 Z" />
    <path d="M11 9 L13 9" />
    <path d="M11 19 L13 19" />
    <path d="M6 11 L9 11.6" />
    <path d="M6 14 L9 14.6" />
    <path d="M15 11 L18 10.4" />
    <path d="M15 14 L18 13.4" />
  </g>
);

const Runner = (
  <g>
    <circle cx="14" cy="5" r="1.8" />
    <path d="M14 7 L11 13" />
    <path d="M11 13 L7 18" />
    <path d="M11 13 L13 17 L16 16" />
    <path d="M12 10 L8 9" />
    <path d="M12 10 L16 13" />
  </g>
);

const Warrior = (
  <g>
    <path d="M6 5 L12 4 L18 5 L18 12 Q12 18 6 12 Z" />
    <path d="M12 7 L12 14" />
    <path d="M9 10 L15 10" />
  </g>
);

const Chef = (
  <g>
    <path d="M7 14 Q4 14 4 10 Q4 7 7 7 Q8 4 12 5 Q16 4 17 7 Q20 7 20 10 Q20 14 17 14" />
    <path d="M7 14 L7 19 Q12 21 17 19 L17 14" />
    <path d="M7 14 L17 14" />
    <path d="M11 14 L11 19" />
    <path d="M14 14 L14 19" />
  </g>
);

const Calligrapher = (
  <g>
    <path d="M19 4 L20 5 L9 16 L4 20 L6 14 Z" />
    <path d="M14 9 L16 11" />
    <path d="M5 17 L7 19" />
  </g>
);

const Painter = (
  <g>
    <path d="M5 11 Q5 5 12 5 Q19 5 19 11 Q19 16 14 16 L14 14 Q11 14 11 17 Q5 17 5 11 Z" />
    <circle cx="9" cy="9" r="1" fill="currentColor" stroke="none" />
    <circle cx="13" cy="8" r="1" fill="currentColor" stroke="none" />
    <circle cx="16" cy="11" r="1" fill="currentColor" stroke="none" />
  </g>
);

const Hero = (
  <g>
    <path d="M4 16 L4 8 L8 12 L12 5 L16 12 L20 8 L20 16 Z" />
    <path d="M4 17.5 L20 17.5" />
    <circle cx="12" cy="13" r="0.9" fill="currentColor" stroke="none" />
    <circle cx="6" cy="13" r="0.6" fill="currentColor" stroke="none" />
    <circle cx="18" cy="13" r="0.6" fill="currentColor" stroke="none" />
  </g>
);

const Researcher = (
  <g>
    <path d="M10 3 L14 3" />
    <path d="M10 4 L10 10 L6 18 Q5 21 9 21 L15 21 Q19 21 18 18 L14 10 L14 4" />
    <path d="M7.3 14 L16.7 14" />
    <circle cx="9" cy="17" r="0.7" fill="currentColor" stroke="none" />
    <circle cx="13" cy="18" r="0.5" fill="currentColor" stroke="none" />
  </g>
);

const Detective = (
  <g>
    <circle cx="10" cy="10" r="5.5" />
    <path d="M14 14 L20 20" />
    <path d="M7 8 Q9 7 11 8" />
  </g>
);

const Craftsman = (
  <g>
    <path d="M3 5 L13 5 L13 10 L3 10 Z" />
    <path d="M7 5 L7 10" />
    <path d="M9 10 L20 21" />
    <path d="M20 21 L21.5 19.5" />
    <path d="M19 22.5 L20.5 21" />
  </g>
);

const Ninja = (
  <g>
    <circle cx="12" cy="12" r="8" />
    <path d="M4 11 L20 11 L20 14 L4 14 Z" fill="currentColor" stroke="currentColor" />
    <circle cx="9" cy="12.5" r="0.6" fill="white" stroke="none" />
    <circle cx="15" cy="12.5" r="0.6" fill="white" stroke="none" />
    <path d="M19 11 L22 9 L22 14 L19 14" />
  </g>
);

const Wizard = (
  <g>
    <path d="M5 18 L12 3 L19 18 Z" />
    <path d="M3 18 L21 18" />
    <path d="M12 9 L12 13" />
    <path d="M10 11 L14 11" />
    <circle cx="9" cy="14" r="0.5" fill="currentColor" stroke="none" />
    <circle cx="15" cy="13" r="0.5" fill="currentColor" stroke="none" />
  </g>
);

const Traveler = (
  <g>
    <path d="M9 4 Q9 7 9 7 L15 7 Q15 4 15 4" />
    <rect x="6" y="7" width="12" height="13" rx="2" />
    <rect x="8.5" y="12" width="7" height="5" rx="0.8" />
    <path d="M11 5 L13 5" />
    <path d="M8.5 14.5 L15.5 14.5" />
  </g>
);

const Sailor = (
  <g>
    <circle cx="12" cy="5" r="1.7" />
    <path d="M12 6.7 L12 19" />
    <path d="M9 9 L15 9" />
    <path d="M5 14 Q5 20 12 20 Q19 20 19 14" />
    <path d="M5 14 L7.5 12" />
    <path d="M19 14 L16.5 12" />
  </g>
);

const ICONS: Record<IconKey, ReactElement> = {
  cat: Cat,
  penguin: Penguin,
  squirrel: Squirrel,
  scholar: Scholar,
  robot: Robot,
  hacker: Hacker,
  student: Student,
  runner: Runner,
  warrior: Warrior,
  chef: Chef,
  calligrapher: Calligrapher,
  painter: Painter,
  hero: Hero,
  researcher: Researcher,
  detective: Detective,
  craftsman: Craftsman,
  ninja: Ninja,
  wizard: Wizard,
  traveler: Traveler,
  sailor: Sailor,
};

interface AvatarIconProps {
  iconKey: string;
  /** SVG의 px 사이즈 (정사각형) */
  size: number;
}

export function AvatarIcon({ iconKey, size }: AvatarIconProps): ReactElement | null {
  if (!isIconKey(iconKey)) return null;
  const content = ICONS[iconKey];
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {content}
    </svg>
  );
}
