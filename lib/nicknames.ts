import type { Locale } from "./i18n/keys";

const JA_ADJ = [
  "眠れない", "夜更かしの", "コーヒー必須", "締切前の", "燃える",
  "走り続ける", "熱血", "爆速", "超集中", "絶対やる",
  "一夜漬けの", "追い込まれた", "覚悟の", "無敵の", "伝説の",
  "孤高の", "ひたむきな", "勇敢な", "やる気MAXの", "気まぐれな",
];

const JA_NOUN = [
  "猫", "ペンギン", "リス", "侍", "ロボット",
  "ハッカー", "受験生", "ランナー", "戦士", "料理人",
  "書家", "画家", "勇者", "研究者", "探偵",
  "職人", "忍者", "魔法使い", "旅人", "船乗り",
];

const KO_ADJ = [
  "잠 못 드는", "야근하는", "마감 직전", "각성한", "타오르는",
  "달리는", "열정적인", "폭주하는", "극강 집중", "무조건 해내는",
  "벼락치기", "쫓기는", "결단의", "무적의", "전설의",
  "고독한", "한결같은", "우아한", "용감한", "의욕 가득",
];

const KO_NOUN = [
  "고양이", "펭귄", "다람쥐", "선비", "로봇",
  "해커", "수험생", "러너", "전사", "요리사",
  "서예가", "화가", "용사", "연구자", "탐정",
  "장인", "닌자", "마법사", "여행자", "선장",
];

// 명사 인덱스에 1:1 대응되는 아바타 아이콘 키. KO_NOUN/JA_NOUN과 길이·순서를 반드시 맞춘다.
export const NOUN_ICON_KEYS = [
  "cat", "penguin", "squirrel", "scholar", "robot",
  "hacker", "student", "runner", "warrior", "chef",
  "calligrapher", "painter", "hero", "researcher", "detective",
  "craftsman", "ninja", "wizard", "traveler", "sailor",
] as const;

export type IconKey = (typeof NOUN_ICON_KEYS)[number];

export const DEFAULT_ICON_KEY: IconKey = "cat";

function pickIndex(len: number): number {
  return Math.floor(Math.random() * len);
}

function pick<T>(arr: readonly T[]): T {
  return arr[pickIndex(arr.length)]!;
}

export function randomNickname(locale: Locale): string {
  if (locale === "ja") {
    return `${pick(JA_ADJ)}${pick(JA_NOUN)}`;
  }
  return `${pick(KO_ADJ)} ${pick(KO_NOUN)}`;
}

export interface RandomProfile {
  name: string;
  iconKey: IconKey;
}

/**
 * 닉네임 명사와 매칭되는 아이콘 키를 함께 반환한다.
 * 명사 인덱스를 한 번만 뽑아 name과 iconKey를 동기화한다.
 */
export function randomProfile(locale: Locale): RandomProfile {
  const nounIdx = pickIndex(NOUN_ICON_KEYS.length);
  const adj = locale === "ja" ? pick(JA_ADJ) : pick(KO_ADJ);
  const noun = locale === "ja" ? JA_NOUN[nounIdx]! : KO_NOUN[nounIdx]!;
  const name = locale === "ja" ? `${adj}${noun}` : `${adj} ${noun}`;
  return { name, iconKey: NOUN_ICON_KEYS[nounIdx]! };
}

const ICON_KEY_SET: ReadonlySet<string> = new Set(NOUN_ICON_KEYS);

export function isIconKey(v: unknown): v is IconKey {
  return typeof v === "string" && ICON_KEY_SET.has(v);
}

/** 닉네임과 무관하게 아이콘 키만 무작위로 뽑는다. 직전 키와 같으면 한 번 더 뽑아 변화를 보장. */
export function pickRandomIconKey(prev?: IconKey): IconKey {
  let next = NOUN_ICON_KEYS[pickIndex(NOUN_ICON_KEYS.length)]!;
  if (prev !== undefined && next === prev && NOUN_ICON_KEYS.length > 1) {
    next = NOUN_ICON_KEYS[(NOUN_ICON_KEYS.indexOf(prev) + 1) % NOUN_ICON_KEYS.length]!;
  }
  return next;
}

/**
 * 사용자가 직접 입력한 닉네임에서 명사 키워드를 탐지해 아이콘 키로 매핑.
 * 매칭되는 명사가 없으면 null. 호출 측에서 기존 iconKey 유지/폴백을 결정한다.
 */
export function inferIconKeyFromName(name: string): IconKey | null {
  const trimmed = name.trim();
  if (!trimmed) return null;
  for (let i = 0; i < NOUN_ICON_KEYS.length; i += 1) {
    if (trimmed.includes(KO_NOUN[i]!) || trimmed.includes(JA_NOUN[i]!)) {
      return NOUN_ICON_KEYS[i]!;
    }
  }
  return null;
}
