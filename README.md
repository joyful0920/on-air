# OnAir

> **Tagline (JA)**: あなたの締切を、ライブで
> **Tagline (KO)**: 당신의 마감, 라이브로

마감을 건 사람들의 라이브 대시보드. 들어가면 누가 무엇을 하고 있는지가 카드로 보이고, 한 명을 클릭하면 같이 지켜본다. 시험 공부 라이브, 마감 직전 과제 인증, 운동 챌린지, 공개 회고 같은 짧은 호흡의 "방송"을 가볍게 켜고 끄는 도구.

## 셋업

```bash
npm install
cp .env.local.example .env.local   # 값 채우기
npm run dev                         # http://localhost:3000
```

### Firebase 준비

1. Firebase Console에서 **Realtime Database** 인스턴스 생성
2. **Authentication → Sign-in method → 익명(Anonymous)** 활성화
3. 콘솔의 "프로젝트 설정 → 일반 → 내 앱(웹) → SDK 설정 및 구성"에서 다음 값을 `.env.local`로 복사
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_DATABASE_URL`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
4. **보안 룰**은 `database.rules.json` 그대로 적용. CLI 사용 시:
   ```bash
   firebase deploy --only database
   ```
   콘솔에서 직접 붙여넣어도 동일.

## 설계 메모

### read model 분리: `lists` 대신 `active_lists`

대시보드는 모든 라이브 카드의 요약(타이틀/진행률/임박 데드라인/시청자 수)만 필요한데, 이걸 `lists/{shareId}` 전체 트리를 fan-out 구독으로 모으면 — 즉 카드 N개당 N번의 `lists/{shareId}` 트리 구독 — 클라이언트 메모리·네트워크 비용이 빠르게 커진다. 그래서 owner 클라이언트가 `useActiveListSync`에서 자기 리스트의 요약만 `active_lists/{shareId}`에 단독 갱신하고, 대시보드는 평평한 `active_lists` 한 노드만 구독한다. 카드 1장 = 요약 1행이라 비용이 카드 수에 선형으로만 늘어난다.

### `onDisconnect`로 라이브 큐레이션

별도 cleanup 워커 없이 "지금 살아있는 리스트만" 보여주는 트릭. owner가 페이지에 들어오면 `active_lists/{shareId}`를 set 하고, 같은 ref에 `onDisconnect().remove()`를 등록한다. owner의 모든 탭이 닫히거나 네트워크가 끊기면 RTDB가 알아서 그 노드를 지우고, 대시보드는 자동으로 그 카드를 떨어뜨린다. 서버사이드 cron 필요 없음. 등록 순서가 중요해서 `set` 응답을 받은 다음에만 `onDisconnect`를 등록한다 — race condition 방지용.

### transaction 사용 지점

두 곳에서 `runTransaction`을 쓴다.

1. **체크 토글** (`toggleTodoDone`): 여러 탭에서 동시에 같은 todo를 토글해도 `done`과 `status`가 어긋나지 않게.
2. **만료 처리** (`expireTodoIfNeeded`): 카운트다운이 0이 되는 순간 N명의 클라이언트가 동시에 같은 노드에 write하려는 상황을 멱등하게 처리. 이미 expired면 그대로 둔다.

### i18n 자체 구현

일본어 기본 + 한국어 토글, 두 개뿐이라 `next-intl` / `react-i18next` 같은 라이브러리는 과한 도입. `lib/i18n/`에 `Dictionary` 타입 + `LocaleProvider` 컨텍스트 + `useT()` 훅 정도면 충분. `{{count}}` 단순 placeholder 치환만 지원하고, 복수형/날짜 포맷팅은 비목표. 카피는 직역 안 하고 각 언어로 자연스럽게.

SSR/CSR hydration mismatch를 피하려고 초기 렌더는 항상 default(`ja`)로 고정하고, 마운트 후에 `localStorage.onair.locale`을 읽어 한국어면 교체한다.

### client-only 만료 처리의 한계

만료는 누군가 페이지를 보고 있어야만 transaction이 트리거된다. 모두 떠나 있으면 `status`가 `active` 그대로 남고, 다음 진입자가 들어와 sweep할 때야 비로소 `expired`로 바뀐다. 화면에는 카운트다운 0과 함께 시각적으로 만료처럼 보이지만, RTDB 상태는 지연될 수 있다. 서버 함수 없이 가는 트레이드오프.

또한 카운트다운은 클라이언트 시계로 계산하므로 시계 오차만큼 다른 디바이스 사이에 미세한 차이가 생길 수 있다. 같은 epoch deadline을 공유하므로 1~2초 단위 차이지만, 정밀 동기화는 비목표.

### 의도적으로 안 만든 기능

- **채팅/댓글**: 라이브 응원이라는 컨셉을 좁게 유지하기 위해. reaction 5개로 충분히 "보고 있어요" 시그널이 전달된다. 채팅을 붙이면 anonymous 환경에서 abuse 대응 비용이 즉시 커지고, 컨셉의 핵심인 "마감 카운트다운에 집중"이 흐려진다.
- 검색·태그·정렬, 좋아요/팔로우, 알림, 히스토리/통계, 차단/신고, 다중 owner, 모바일 최적화, 닉네임 변경, 드래그 정렬, 다크모드 외 테마, ja/ko 외 언어, E2E 테스트, 서버사이드 abuse 방지(클라 throttle로 충분).

## 30초 데모 시나리오

1. 탭 1 (owner): `/`에서 "약속 시작하기" 클릭 → 닉네임 1글자 + 이모지 입력 → 리스트 페이지 진입 → 제목 입력 + todo 2~3개 추가 (1개는 1분 뒤 데드라인). "URL 복사".
2. 탭 2 (watcher A): 복사한 URL 붙여넣기 → 닉네임/이모지 → 카드 owner의 todo가 read-only로 보임. 하단 reaction 버튼 두 번 탭.
3. 탭 3 (watcher B): 다른 브라우저(또는 시크릿)로 동일 URL 진입 → 화면 우측에 watcher chip이 +1 → reaction 한 번.
4. owner 화면: floating reaction 이모지가 위로 떠오르며 사라짐. watcher 수 chip 증가.
5. 우상단 `JA / KO` 토글 → 모든 텍스트가 즉시 일본어 ↔ 한국어 전환.
6. 1분 뒤 데드라인 todo의 카운트다운이 30초 이하로 진입하면 색상 강조 → 0이 되면 한 클라이언트가 transaction으로 `expired` 처리, 모두에게 동시에 반영.
7. owner의 모든 탭을 닫으면 다른 브라우저의 `/` 대시보드에서 카드가 자동으로 사라짐 (`onDisconnect` 동작 확인).

## 디렉터리 구조

```
app/
  layout.tsx                  # LocaleProvider + Header
  page.tsx                    # 대시보드
  list/[shareId]/page.tsx     # 리스트 페이지 (owner/watcher 분기)
  components/                 # 표현 책임만
hooks/
  useAnonAuth.ts
  useTodos.ts                 # CRUD + transaction
  usePresence.ts              # presence writer/list
  useReactions.ts             # push/throttle/floating
  useActiveLists.ts           # 대시보드 구독
  useActiveListSync.ts        # owner 단독 active_lists 갱신
  useUserProfile.ts
lib/
  firebase.ts                 # 단일 초기화
  types.ts / guards.ts        # any 금지, 타입 가드로 RTDB 응답 검증
  colors.ts / time.ts
  i18n/                       # 자체 구현
database.rules.json
```
