# OnAir

> 당신의 마감, 라이브로

**🔴 Live: https://on-air-tan.vercel.app/**

[日本語](./README.md) ・ [한국어](./README.ko.md)

## 서비스 개요

마감을 안고 사는 사람들의 라이브 방송 대시보드입니다. 메인 페이지에 들어가면 "지금 누가 어떤 마감에 쫓기고 있는지"가 카드 목록으로 실시간 표시됩니다. 카드를 클릭하면 그 사람의 todo 리스트를 read-only로 지켜보면서 reaction을 보낼 수 있습니다. owner는 자기 리스트에서 todo CRUD와 deadline 설정이 가능하고, owner의 모든 탭이 닫히면 대시보드에서 자동으로 사라집니다.

라이브 방송이 메인 컨셉이며, 마감을 "방송"으로 켠다, watcher는 "시청자", reaction은 "라이브 응원", 카운트다운 0 = 방송 종료. 시험 공부 라이브, 마감 직전 작업 인증, 다이어트/운동 챌린지, 공개 회고 같은 짧은 호흡의 "방송"을 가볍게 켰다 끄는 도구입니다.

## 기술 스택

- Next.js 16 (App Router) / React 18 / TypeScript (strict)
- Firebase Realtime Database (RTDB) + Anonymous Auth (Web SDK v9 modular)
- Tailwind CSS / nanoid

의존성은 최소화했습니다. 상태관리·UI·i18n 라이브러리는 일부러 도입하지 않았습니다.

## 셋업

```bash
npm install
cp .env.local.example .env.local   # Firebase 값 채우기
npm run dev                         # http://localhost:3000
```

Firebase 쪽 준비:

1. **Realtime Database** 인스턴스 생성
2. **Authentication → Sign-in method → 익명(Anonymous)** 활성화
3. 프로젝트 설정 → Web SDK 값을 `.env.local`로 복사
4. `database.rules.json` 배포
   ```bash
   firebase deploy --only database
   ```
   Firebase Console의 Rules 탭에 직접 붙여넣어도 동일합니다.

---

## 백엔드 설계 포인트

이 프로젝트의 핵심은 **익명 인증 + RTDB만으로, 서버 함수 한 줄도 없이 "라이브 방송"의 시맨틱을 성립시킨 것**입니다. 주요 결정 사항을 차례대로 정리하겠습니다.

### 1. Read model 분리: `lists`가 아닌 `active_lists`를 본다

대시보드는 카드 단위 요약(타이틀 / 진행률 / 가장 임박한 deadline / 시청자 수)만 필요합니다. 그런데 `lists/{shareId}` 서브트리를 카드 N개 fan-out으로 구독하는 단순 구현으로 가면 카드 수에 비례해 클라이언트 대역폭과 메모리가 선형으로 늘어납니다. todo 본문이나 reaction까지 모든 클라이언트로 흘러가는 셈입니다.

그래서 read 전용의 얇은 사영(projection)을 별도 노드로 분리했습니다.

- **쓰기**: owner 클라이언트만 자기 요약을 `active_lists/{shareId}`에 350ms debounce로 기록 (`hooks/useActiveListSync.ts`)
- **읽기**: 대시보드는 `active_lists`라는 평탄한 노드 하나만 구독 (`hooks/useActiveLists.ts`)
- **충돌**: owner 단독 write이므로 write 충돌이 구조적으로 발생하지 않습니다. watcher는 read only

CQRS의 가벼운 버전입니다. 쓰기 주체를 한 명으로 좁히면 RTDB의 낙관적 잠금조차 필요 없어집니다.

### 2. `onDisconnect`로 라이브 in/out 자동 큐레이션

서버 cron 없이 "지금 살아있는 방송만" 보여주는 트릭입니다.

- owner가 리스트 페이지에 진입하면 `active_lists/{shareId}`에 `set`하고, **같은 ref에 `onDisconnect().remove()`를 등록**합니다
- owner의 모든 탭이 닫히거나 네트워크가 끊기면 RTDB 서버가 해당 노드를 삭제합니다
- 대시보드는 별도 cleanup을 돌리지 않아도 구독이 자연스럽게 "사라진 카드"로 반응합니다

레이스 컨디션 회피를 위해 `onDisconnect` 등록은 **첫 `set`이 resolve된 다음 단 한 번만** 수행합니다 (`onDisconnectRegistered` ref로 일회성 보장).

`hooks/usePresence.ts`도 동일 패턴입니다. 시청자 presence에도 `onDisconnect().remove()`를 걸어 하드 크래시나 네트워크 단절 시 잔여 데이터가 남지 않게 합니다. 명시적 unmount 시점에는 즉시 `set(null)`을 호출하므로 화면 전환 시 시청자 수 반영도 0초 지연입니다.

### 3. `runTransaction`을 쓰는 두 지점

낙관적 잠금으로 다중 클라이언트 write의 멱등성을 보장하는 곳이 두 군데 있습니다 (`hooks/useTodos.ts`).

**`toggleTodoDone`** — owner가 여러 탭을 띄워둔 상태로 같은 todo를 토글했을 때, `done` / `status` / `completedAt` 세 필드가 "한쪽은 완료, 다른 쪽은 미완료" 같은 식으로 어긋나지 않도록 트랜잭션 안에서 세 필드를 동시에 원자적으로 갱신합니다.

**`expireTodoIfNeeded`** — 카운트다운이 0을 넘기는 순간, 페이지를 보고 있는 N명의 클라이언트가 "내가 expire를 세우겠다"며 동시에 달려듭니다. 트랜잭션 내부에 `if (current.status === 'expired') return current` 조기 반환을 넣어, 이미 expired면 손대지 않고 끝나는 멱등 처리로 만들었습니다. RTDB 측에서 N - 1건은 no-op으로 자연스럽게 걸러집니다.

### 4. Owner 단독 write + debounce

`active_lists`는 owner만 쓰기 때문에 write 경합은 없지만, todo 텍스트를 입력하는 동안 keystroke마다 부모 컴포넌트가 re-render되면서 `useActiveListSync`도 다시 돌아갑니다. 그대로 두면 초당 여러 번 write가 발생합니다.

`useActiveListSync.ts`에 350ms debounce를 둬서 입력이 잦아든 순간 한 번만 요약을 기록합니다. watcher 측 대시보드 입장에서는 "타이틀이 살짝 늦게 반영되네" 정도의 체감이고, 그 대신 비용 절감 효과가 훨씬 큽니다.

### 5. Reaction의 TTL을 "보낸 클라이언트의 책임"으로 구현

reaction은 floating animation을 위해 RTDB에 잠깐 push했다가 필요 없어지면 클라이언트가 직접 지우는 단명 데이터입니다 (`hooks/useReactions.ts`).

- **전송 레이트 제한**: 한 클라이언트당 2초에 1회 (`THROTTLE_MS = 2000`)
- **수신**: `onChildAdded`로 스트림 구독하다가 3.4초 애니메이션 후 React state에서 제거
- **RTDB 청소**: 보낸 본인이 5초 후 자기가 push한 child를 `remove`
  - 이 단계가 없으면 신규 입장자가 `onChildAdded`의 초기 리플레이로 "다른 사람이 보낸 이펙트"를 다시 재생하는 더블링 이슈가 발생합니다
  - 보낸 사람에게 청소 책임을 맡겨 서버 TTL이나 cron 없이 자연 소멸시키는 방식

서버리스 환경에서 "휘발성 데이터"를 다룰 때의 정석이라고 봅니다.

### 6. Security Rules로 네 가지 경계 긋기

`database.rules.json`:

| 노드                             | 쓰기 권한                                    | 검증                          |
| -------------------------------- | -------------------------------------------- | ----------------------------- |
| `users/{uid}`                    | 본인 uid만                                   | name / color / iconKey 스키마 |
| `lists/{shareId}/meta`           | 생성·수정·삭제 모두 `ownerId === auth.uid`   | title 길이 등                 |
| `lists/{shareId}/todos`          | `meta.ownerId === auth.uid` (다른 노드 참조) | text / deadline / status      |
| `lists/{shareId}/presence/{uid}` | 본인 uid만                                   | role enum                     |
| `active_lists/{shareId}`         | `ownerId === auth.uid`                       | summary 필드                  |

주목할 점: **`todos`의 write 권한이 `meta.ownerId`를 참조**합니다. 덕분에 "리스트 소유권"을 `meta`에 집중시킬 수 있습니다. owner를 바꾸려면 `meta`만 덮어쓰면 되고, todo 하나하나에 owner 필드를 중복 저장할 필요가 없습니다.

### 7. RTDB 응답은 타입 가드로 검증

`any` 금지. RTDB가 돌려주는 `unknown`은 `lib/guards.ts`의 `parseTodo` / `parsePresence` / `parseListMeta` 같은 narrowing 함수를 반드시 거치게 했습니다. 스키마 위반 레코드는 조용히 버리는 정책입니다. 이렇게 두면:

- 앱 측 코드는 모두 완전 타입으로 작성 가능합니다
- 과거 스키마로 작성된 깨진 레코드가 섞여도 죽지 않습니다
- 향후 필드 추가 시 **guard에서 `optional` 처리 → rules의 `validate` 완화** 두 단계로 안전하게 확장 가능합니다 (실제로 `iconKey` / `youtubeVideoId` 추가가 이 순서로 들어갔습니다)

### 8. 클라이언트 시계 의존의 트레이드오프

만료 판정은 **누군가 페이지를 보고 있을 때만** 트랜잭션이 돌아갑니다. 아무도 안 보는 리스트는 `status`가 `active` 그대로 남고, 다음 진입자가 sweep합니다. 시각적으로는 카운트다운이 0이라 "만료된 것처럼" 보이지만, RTDB의 `status`는 지연될 수 있습니다.

카운트다운 자체도 클라이언트 로컬 시계로 계산합니다. 공유하는 건 epoch deadline이라 디바이스 간 차이는 보통 1~2초 수준입니다. 이런 점들은 Cloud Functions을 도입하지 않은 대가로 명시적으로 허용한 것입니다.

---

## 의도적으로 만들지 않은 것

- **Cloud Functions**: cold start와 비용 관리를 피하기 위해. 만료는 client-driven sweep으로 충분합니다
- **채팅**: 익명 환경에서 abuse 대응 비용이 가파르게 올라갑니다. reaction 5종이면 "보고 있어요" 시그널은 충분히 전달됩니다
- **검색 / 태그 / 팔로우 / 알림 / 히스토리 / 통계 / 다 owner / E2E**: 컨셉을 "방송 중인 마감"으로 좁게 묶기 위함

## i18n

ja / ko 두 언어뿐이라 자체 구현으로 얇게 처리했습니다 (`lib/i18n/`). `Dictionary` 타입 + React Context + `useT()` 훅. `{{count}}` 같은 placeholder 단순 치환만 지원하고, 복수형·날짜 포맷팅은 비대상입니다.

SSR / CSR hydration mismatch 회피를 위해 첫 렌더는 **항상 `ja`로 고정**하고, 마운트 후에 `localStorage.onair.locale`을 읽어 `ko`면 교체합니다.

## 디렉터리 구조

```
app/
  layout.tsx                    LocaleProvider + Header
  page.tsx                      대시보드
  list/[shareId]/page.tsx       리스트 페이지 (owner / watcher 분기)
  components/
hooks/
  useAnonAuth.ts                익명 로그인 + 프로필 구독
  useTodos.ts                   todo CRUD + transaction
  usePresence.ts                presence writer / list
  useReactions.ts               reaction push / throttle / floating
  useActiveLists.ts             대시보드 구독
  useActiveListSync.ts          owner 단독 active_lists 갱신 (debounced)
  useUserProfile.ts
lib/
  firebase.ts                   단일 초기화
  types.ts / guards.ts          RTDB 응답을 타입 가드로 narrowing
  nicknames.ts                  랜덤 닉네임 + 명사 인덱스에 연동된 아바타
  avatarIcons.tsx               20종 라인 SVG
  i18n/                         자체 구현
database.rules.json
```

## 데모 시나리오

1. **탭 1 (owner)**: `/`에서 "라이브 시작" → 닉네임 입력 → 리스트 페이지 진입 → 타이틀 + todo 2~3개 (1개는 1분 뒤 deadline) → "URL 복사"
2. **탭 2 (watcher A)**: URL 붙여넣기 → 같은 식으로 입력 → owner의 todo가 read-only로 보임. 하단 reaction 두 번 탭
3. **탭 3 (watcher B)**: 다른 브라우저(또는 시크릿)에서 동일 URL → 우상단에 watcher chip이 +1 → reaction 한 번
4. owner 화면에 reaction 이모지가 떠오르고 watcher chip 수도 증가
5. 우상단 `JA / KO` 토글로 모든 텍스트가 즉시 전환
6. 1분 뒤 todo의 카운트다운이 30초 이하가 되면 색이 강조 → 0이 되면 한 클라이언트가 트랜잭션으로 `expired`를 세우고 모두에게 동기화
7. owner의 모든 탭을 닫으면, 다른 브라우저의 대시보드에서 카드가 자동으로 사라집니다 (`onDisconnect` 동작 확인)
