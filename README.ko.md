# OnAir

> 당신의 마감, 라이브로

**🔴 Live: [https://on-air-tan.vercel.app/](https://on-air-tan.vercel.app/)**

[日本語](./README.md) ・ [한국어](./README.ko.md)

## 서비스 개요

OnAir는 마감 시간이 있는 Todo를 공개하고, 다른 사람들이 실시간으로 지켜볼 수 있는 라이브 Todo 대시보드입니다.

메인 페이지에서는 현재 진행 중인 리스트가 카드 형태로 표시됩니다. 각 카드에는 작성자 정보, 진행률, 가장 가까운 마감 시간, 현재 지켜보는 사람 수가 함께 나타납니다. 카드를 클릭하면 해당 리스트로 이동해 Todo를 읽고, 이모지 리액션을 보낼 수 있습니다.

리스트 소유자는 자신의 리스트에서 Todo를 추가, 수정, 완료 처리, 삭제할 수 있고 각 Todo에 마감 시간을 설정할 수 있습니다. 소유자의 모든 탭이 닫히면 해당 리스트는 대시보드에서 자동으로 사라집니다.

이 앱은 “마감을 라이브로 켠다”는 컨셉으로 만들었습니다. 소유자는 마감을 방송처럼 열고, 시청자는 그 과정을 지켜보며 리액션으로 응원합니다. 카운트다운이 0이 되면 방송이 끝나는 흐름입니다. 시험 공부, 과제 마감, 운동·다이어트 챌린지, 짧은 회고처럼 지금 진행 중인 일을 가볍게 공개하고 함께 지켜보는 상황을 가정했습니다.

## 기술 스택

- Next.js 16 (App Router) / React 18 / TypeScript (strict)
- Firebase Realtime Database (RTDB) + Anonymous Auth (Web SDK v9 modular)
- Tailwind CSS / nanoid

의존성은 최소화했습니다. 상태관리, UI, i18n 라이브러리는 의도적으로 도입하지 않았습니다.

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

## 주요 설계 결정

이 프로젝트의 핵심은 별도의 백엔드 서버나 Cloud Functions 없이, Firebase Anonymous Auth와 Realtime Database만으로 “현재 어떤 리스트가 열려 있는지”, “누가 보고 있는지”, “마감 상태가 어떻게 바뀌는지”를 실시간으로 표현한 점입니다.

기능은 Todo CRUD에서 출발하지만, RTDB의 presence, `onDisconnect`, transaction, 대시보드용 read model을 활용해 라이브 서비스처럼 동작하도록 설계했습니다.

### 1. 대시보드용 요약 데이터 분리: `lists`가 아닌 `active_lists`를 구독

대시보드는 각 리스트의 전체 Todo나 reaction 데이터를 모두 알 필요가 없습니다. 필요한 것은 카드에 표시할 제목, 진행률, 가장 가까운 마감 시간, 시청자 수 같은 요약 정보뿐입니다.

만약 대시보드에서 `lists/{shareId}` 전체를 카드 수만큼 구독하면, 카드가 늘어날수록 클라이언트가 읽는 데이터와 메모리 사용량도 함께 늘어납니다. 대시보드에 필요 없는 Todo 본문이나 reaction 데이터까지 모든 클라이언트로 전달될 수 있습니다.

이를 피하기 위해 대시보드 전용 요약 노드인 `active_lists/{shareId}`를 별도로 두었습니다.

- **쓰기**: 소유자 클라이언트만 자신의 요약 정보를 `active_lists/{shareId}`에 350ms debounce로 기록합니다. (`hooks/useActiveListSync.ts`)
- **읽기**: 대시보드는 평탄한 `active_lists` 노드 하나만 구독합니다. (`hooks/useActiveLists.ts`)
- **충돌 방지**: 소유자만 쓰기 때문에 여러 클라이언트가 같은 요약 데이터를 동시에 갱신하는 구조가 아닙니다. 시청자는 read-only입니다.

큰 틀에서는 CQRS의 read model 분리와 비슷한 접근입니다. 화면에 필요한 요약 데이터를 따로 두면, 대시보드는 필요한 정보만 가볍게 읽을 수 있습니다.

### 2. `onDisconnect`를 이용한 라이브 리스트 자동 정리

이 앱에서는 “현재 열려 있는 리스트”만 대시보드에 보여줍니다. 이를 위해 별도의 cleanup job이나 서버 cron을 두지 않고, RTDB의 `onDisconnect()`를 사용했습니다.

소유자가 리스트 페이지에 들어오면 `active_lists/{shareId}`에 요약 정보를 기록합니다. 그리고 같은 경로에 `onDisconnect().remove()`를 등록합니다. 이후 소유자의 모든 탭이 닫히거나 네트워크가 끊기면, RTDB 서버가 해당 노드를 자동으로 삭제합니다.

그 결과 대시보드는 별도의 정리 로직 없이도 현재 활성화된 리스트만 보여줄 수 있습니다. 구독 중이던 카드가 사라지면 화면에서도 자연스럽게 제거됩니다.

race condition을 줄이기 위해 `onDisconnect` 등록은 첫 `set`이 완료된 뒤 한 번만 수행합니다. 코드에서는 `onDisconnectRegistered` ref로 일회성 등록을 보장했습니다.

`hooks/usePresence.ts`에서도 같은 패턴을 사용했습니다. 시청자 presence에도 `onDisconnect().remove()`를 걸어, 비정상 종료나 네트워크 단절이 발생해도 오래된 시청자 데이터가 남지 않도록 했습니다. 명시적인 unmount 시점에는 즉시 `set(null)`을 호출해, 페이지 이동 시 시청자 수가 바로 반영되도록 했습니다.

### 3. 여러 클라이언트가 동시에 갱신할 수 있는 부분은 `runTransaction` 사용

RTDB는 여러 클라이언트가 같은 데이터를 동시에 수정할 수 있습니다. 그래서 상태가 꼬일 수 있는 부분에는 `runTransaction`을 사용했습니다. (`hooks/useTodos.ts`)

**`toggleTodoDone`** — 소유자가 여러 탭을 열어둔 상태에서 같은 Todo의 완료 상태를 바꿀 수 있습니다. 이때 `done`, `status`, `completedAt` 세 필드가 서로 어긋나지 않도록 transaction 안에서 함께 갱신했습니다.

**`expireTodoIfNeeded`** — 카운트다운이 0이 되는 순간, 페이지를 보고 있는 여러 클라이언트가 동시에 만료 처리를 시도할 수 있습니다. transaction 내부에서 이미 `expired` 상태라면 기존 값을 그대로 반환하도록 만들어, 여러 번 실행되어도 결과가 바뀌지 않게 했습니다. 이미 처리된 요청은 상태를 다시 변경하지 않고 끝납니다.

### 4. 소유자 단독 write와 debounce

`active_lists`는 소유자만 쓰기 때문에 write 경합은 거의 없습니다. 다만 Todo 텍스트를 입력하는 동안 부모 컴포넌트가 자주 re-render되면 `useActiveListSync`도 함께 실행될 수 있습니다. 그대로 두면 짧은 시간 안에 여러 번 write가 발생합니다.

이를 줄이기 위해 `useActiveListSync.ts`에 350ms debounce를 두었습니다. 입력이 잠시 멈춘 뒤 한 번만 요약 정보를 기록합니다. 대시보드에서는 변경 사항이 약간 늦게 반영될 수 있지만, 불필요한 write를 줄이는 효과가 더 큽니다.

### 5. Reaction은 짧게 살아 있는 이벤트로 처리

Reaction은 누적 좋아요가 아니라, 라이브 방송 중에 올라오는 응원 이펙트에 가깝게 설계했습니다. 사용자가 이모지를 누르면 RTDB에 reaction 이벤트를 잠깐 기록하고, 모든 클라이언트는 이를 구독해 floating animation으로 보여줍니다. (`hooks/useReactions.ts`)

- **전송 제한**: 한 클라이언트당 2초에 1회만 보낼 수 있습니다. (`THROTTLE_MS = 2000`)
- **수신 처리**: `onChildAdded`로 reaction 스트림을 구독하고, 3.4초 애니메이션이 끝난 뒤 React state에서 제거합니다.
- **RTDB 정리**: 보낸 클라이언트가 5초 뒤 자신이 만든 reaction 노드를 삭제합니다.

이 정리 단계가 없으면 새로 들어온 사용자가 과거 reaction을 초기 데이터로 받아 다시 재생하는 문제가 생길 수 있습니다. 그래서 reaction은 오래 저장하지 않고, 보낸 사람이 직접 정리하는 단명 이벤트로 다뤘습니다. 별도의 서버 TTL이나 cron 없이 휘발성 데이터를 처리하기 위한 간단한 방식입니다.

### 6. Security Rules로 쓰기 권한 제한

`database.rules.json`에서는 노드별로 쓰기 권한을 분리했습니다.

| 노드                             | 쓰기 권한                                    | 검증                          |
| -------------------------------- | -------------------------------------------- | ----------------------------- |
| `users/{uid}`                    | 본인 uid만                                   | name / color / iconKey 스키마 |
| `lists/{shareId}/meta`           | 생성·수정·삭제 모두 `ownerId === auth.uid`   | title 길이 등                 |
| `lists/{shareId}/todos`          | `meta.ownerId === auth.uid` (다른 노드 참조) | text / deadline / status      |
| `lists/{shareId}/presence/{uid}` | 본인 uid만                                   | role enum                     |
| `active_lists/{shareId}`         | `ownerId === auth.uid`                       | summary 필드                  |

특히 `todos`의 write 권한은 `lists/{shareId}/meta/ownerId`를 기준으로 판단합니다. Todo마다 owner 정보를 중복 저장하지 않고, 리스트의 소유권을 `meta`에 모아두기 위한 선택입니다. 소유권 판단 기준이 한곳에 모여 있어 권한 규칙도 단순해집니다.

### 7. RTDB 응답은 타입 가드로 검증

RTDB에서 읽어온 데이터는 그대로 신뢰하지 않고 `unknown`으로 다룬 뒤, `lib/guards.ts`의 `parseTodo`, `parsePresence`, `parseListMeta` 같은 타입 가드 함수를 거치도록 했습니다. `any`는 사용하지 않았습니다.

스키마에 맞지 않는 레코드는 조용히 버리는 정책을 사용했습니다. 이렇게 하면 다음과 같은 장점이 있습니다.

- 앱 내부 코드는 타입이 좁혀진 안전한 값만 다룹니다.
- 과거 스키마로 저장된 깨진 레코드가 섞여 있어도 앱이 바로 죽지 않습니다.
- 필드 추가 시 guard에서 optional 처리한 뒤 rules의 validate를 완화하는 식으로 점진적으로 확장할 수 있습니다.

실제로 `iconKey`, `youtubeVideoId` 같은 필드도 이 순서로 추가했습니다.

### 8. 클라이언트 시계에 의존하는 부분과 그 한계

만료 처리는 누군가 리스트 페이지를 보고 있을 때만 실행됩니다. 아무도 보고 있지 않은 리스트는 `status`가 `active`로 남아 있다가, 다음 사용자가 들어왔을 때 sweep을 통해 정리될 수 있습니다. 화면에서는 deadline을 기준으로 이미 만료된 것처럼 보일 수 있지만, RTDB에 저장된 `status` 반영은 늦어질 수 있습니다.

카운트다운도 클라이언트의 로컬 시계를 기준으로 계산합니다. 모든 클라이언트가 같은 epoch deadline을 공유하므로 대체로 비슷하게 보이지만, 디바이스 시계 차이에 따라 1~2초 정도 차이가 날 수 있습니다.

Cloud Functions를 사용하면 만료 처리나 요약 데이터 갱신을 서버에서 더 정확하게 처리할 수 있습니다. 하지만 이번 프로젝트에서는 RTDB와 클라이언트만으로 라이브 경험을 구현하는 것이 목적이었기 때문에, 이러한 한계를 의도적으로 받아들였습니다.

---

## 의도적으로 만들지 않은 것

- **Cloud Functions**: cold start와 비용 관리를 피하고, RTDB와 클라이언트만으로 구현 범위를 제한하기 위해 사용하지 않았습니다. 만료 처리는 client-driven sweep으로 충분하다고 판단했습니다.
- **채팅**: 익명 환경에서는 abuse 대응 비용이 빠르게 커집니다. 이 프로젝트에서는 reaction 5종만으로 “보고 있다”, “응원한다”는 신호를 전달하도록 했습니다.
- **검색 / 태그 / 팔로우 / 알림 / 히스토리 / 통계 / 다중 owner / E2E 테스트**: 컨셉을 “지금 방송 중인 마감”으로 좁게 유지하기 위해 제외했습니다.

## i18n

지원 언어가 ja / ko 두 가지뿐이라 별도 라이브러리 없이 가볍게 직접 구현했습니다. (`lib/i18n/`)

`Dictionary` 타입, React Context, `useT()` 훅으로 구성되어 있습니다. `{{count}}` 같은 placeholder 단순 치환만 지원하고, 복수형 처리나 날짜 포맷팅은 이번 범위에서는 다루지 않았습니다.

SSR / CSR hydration mismatch를 피하기 위해 첫 렌더는 항상 `ja`로 고정하고, 마운트 후 `localStorage.onair.locale`을 읽어 `ko`이면 교체합니다.

## 디렉터리 구조

```txt
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

1. **탭 1 (owner)**: `/`에서 “라이브 시작” 클릭 → 닉네임 입력 → 리스트 페이지 진입 → 타이틀과 Todo 2~3개 작성. 이 중 하나는 1분 뒤 deadline으로 설정 → “URL 복사”
2. **탭 2 (watcher A)**: URL 붙여넣기 → 닉네임 입력 → owner의 Todo가 read-only로 보이는지 확인 → 하단 reaction 두 번 탭
3. **탭 3 (watcher B)**: 다른 브라우저 또는 시크릿 창에서 동일 URL 접속 → 우상단 watcher chip이 +1 되는지 확인 → reaction 한 번 전송
4. owner 화면에서 reaction 이모지가 떠오르고 watcher chip 수가 증가하는지 확인
5. 우상단 `JA / KO` 토글로 모든 텍스트가 즉시 전환되는지 확인
6. 1분 뒤 Todo의 카운트다운이 30초 이하가 되면 강조 색이 적용되고, 0이 되면 한 클라이언트가 transaction으로 `expired`를 설정해 모든 화면에 동기화되는지 확인
7. owner의 모든 탭을 닫으면, 다른 브라우저의 대시보드에서 카드가 자동으로 사라지는지 확인 (`onDisconnect` 동작)
