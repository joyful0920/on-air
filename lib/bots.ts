import type { ActiveListSummary, Todo, TodoStatus, UserColor } from "./types";
import type { Locale } from "./i18n/keys";

interface BotTodoSpec {
  id: string;
  text: Record<Locale, string>;
  status: TodoStatus;
  /** 현재 시각 기준 deadline 오프셋(초). 음수=과거. */
  deadlineOffsetSec: number;
  /** done인 경우, 완료된 시점의 (현재 기준) 오프셋(초, 양수). */
  completedAgoSec?: number;
}

interface BotSpec {
  shareId: string;
  ownerId: string;
  ownerName: Record<Locale, string>;
  ownerColor: UserColor;
  ownerIconKey: string;
  title: Record<Locale, string>;
  watcherCount: number;
  youtubeVideoId?: string;
  todos: BotTodoSpec[];
}

export const BOTS: BotSpec[] = [
  {
    shareId: "bot-study",
    ownerId: "bot-study",
    ownerName: { ja: "深夜のハッカー", ko: "심야 해커" },
    ownerColor: "#9775fa",
    ownerIconKey: "hacker",
    title: {
      ja: "今日中に新機能をマージする",
      ko: "오늘 안에 새 기능 머지하기",
    },
    watcherCount: 5,
    youtubeVideoId: "7uRX00jTSA0",
    todos: [
      {
        id: "1",
        status: "done",
        text: { ja: "バグ修正", ko: "버그 수정" },
        deadlineOffsetSec: -3600,
        // 마감 15분 전에 완료
        completedAgoSec: 4500,
      },
      {
        id: "2",
        status: "active",
        text: { ja: "PRを作成", ko: "PR 작성" },
        deadlineOffsetSec: 1800,
      },
      {
        id: "3",
        status: "active",
        text: { ja: "テストを追加", ko: "테스트 추가" },
        deadlineOffsetSec: 7200,
      },
    ],
  },
  {
    shareId: "bot-fitness",
    ownerId: "bot-fitness",
    ownerName: { ja: "ダイエット中の鳥", ko: "다이어트 중인 새" },
    ownerColor: "#f783ac",
    ownerIconKey: "penguin",
    title: { ja: "30日チャレンジ20日目", ko: "30일 챌린지 20일째" },
    watcherCount: 7,
    youtubeVideoId: "8cMwehmelSU",
    todos: [
      {
        id: "1",
        status: "done",
        text: { ja: "ジョギング5km", ko: "조깅 5km" },
        deadlineOffsetSec: -7200,
        // 마감 15분 전에 완료
        completedAgoSec: 8100,
      },
      {
        id: "2",
        status: "expired",
        text: { ja: "プロテインを飲む", ko: "프로틴 마시기" },
        deadlineOffsetSec: -600,
      },
      {
        id: "3",
        status: "active",
        text: { ja: "スクワット100回", ko: "스쿼트 100개" },
        deadlineOffsetSec: 14400,
      },
    ],
  },
  {
    shareId: "bot-deadline",
    ownerId: "bot-deadline",
    ownerName: { ja: "締切ぎりぎり君", ko: "마감 직전이" },
    ownerColor: "#ffa94d",
    ownerIconKey: "runner",
    title: { ja: "明日の発表資料を完成", ko: "내일 발표 자료 완성하기" },
    watcherCount: 12,
    youtubeVideoId: "dGhUAVTkd1Y",
    todos: [
      {
        id: "1",
        status: "done",
        text: { ja: "アウトライン作成", ko: "아웃라인 작성" },
        deadlineOffsetSec: -10800,
        // 마감 30분 전에 완료
        completedAgoSec: 12600,
      },
      {
        id: "2",
        status: "done",
        text: { ja: "リサーチ完了", ko: "리서치 완료" },
        deadlineOffsetSec: -7200,
        // 마감 15분 전에 완료
        completedAgoSec: 8100,
      },
      {
        id: "3",
        status: "active",
        text: { ja: "スライド10枚作成", ko: "슬라이드 10장 만들기" },
        deadlineOffsetSec: 480,
      },
      {
        id: "4",
        status: "active",
        text: { ja: "リハーサル1回", ko: "리허설 1회" },
        deadlineOffsetSec: 21600,
      },
    ],
  },
];

export function isBotShareId(shareId: string): boolean {
  return BOTS.some((b) => b.shareId === shareId);
}

export function getBot(shareId: string): BotSpec | undefined {
  return BOTS.find((b) => b.shareId === shareId);
}

export function botToSummary(
  bot: BotSpec,
  locale: Locale,
  sessionStart: number,
): ActiveListSummary {
  const activeOffsets = bot.todos
    .filter((t) => t.status === "active")
    .map((t) => sessionStart + t.deadlineOffsetSec * 1000);
  const nextDeadline =
    activeOffsets.length === 0 ? null : Math.min(...activeOffsets);
  const doneCount = bot.todos.filter((t) => t.status === "done").length;
  return {
    shareId: bot.shareId,
    ownerId: bot.ownerId,
    ownerName: bot.ownerName[locale],
    ownerColor: bot.ownerColor,
    ownerIconKey: bot.ownerIconKey,
    title: bot.title[locale],
    todoCount: bot.todos.length,
    doneCount,
    nextDeadline,
    watcherCount: bot.watcherCount,
    updatedAt: sessionStart,
  };
}

/**
 * 봇의 todos를 Todo 모델로 변환. now 인자를 주면 active 항목 중 deadline이 지난 것은
 * "expired"로 자동 변환 (스펙에 박힌 상태가 아니라 시간 경과로 expired된 것).
 */
export function botToTodos(
  bot: BotSpec,
  locale: Locale,
  sessionStart: number,
  now: number = Date.now(),
): Todo[] {
  return bot.todos.map((spec) => {
    const deadline = sessionStart + spec.deadlineOffsetSec * 1000;
    const completedAt =
      spec.completedAgoSec !== undefined
        ? sessionStart - spec.completedAgoSec * 1000
        : null;
    let status = spec.status;
    if (status === "active" && deadline <= now) {
      status = "expired";
    }
    return {
      id: spec.id,
      text: spec.text[locale],
      done: status === "done",
      deadline,
      status,
      createdAt: sessionStart - 86_400_000,
      completedAt,
    };
  });
}
