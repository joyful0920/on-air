# OnAir

> あなたの締切を、ライブで

**🔴 Live: https://on-air-tan.vercel.app/**

[日本語](./README.md) ・ [한국어](./README.ko.md)

## サービス概要

締切を抱えた人のための、ライブ配信ダッシュボード。トップページにアクセスすると「いま誰が、どんな締切に追われているか」がカード一覧でリアルタイムに表示されます。カードをクリックすると、その人の todo リストを read-only で観戦でき、reaction を送れます。owner は自分のリストで todo CRUD と deadline 設定が可能。owner の全タブが閉じられると、ダッシュボードから自動で姿を消します。

ライブ配信のメタファーが軸: 締切を「配信」として点ける、watcher は「視聴者」、reaction は「ライブ応援」、カウントダウン 0 = 配信終了。受験勉強の自習配信、締切直前の作業実況、ダイエットチャレンジ、公開振り返りなど、短い射程の "放送" を気軽に on/off するためのツール。

## 技術スタック

- Next.js 16 (App Router) / React 18 / TypeScript (strict)
- Firebase Realtime Database (RTDB) + Anonymous Auth (Web SDK v9 modular)
- Tailwind CSS / nanoid

依存は最小。状態管理・UI・i18n のライブラリは入れない方針。

## セットアップ

```bash
npm install
cp .env.local.example .env.local   # Firebase 設定値を埋める
npm run dev                         # http://localhost:3000
```

Firebase 側の準備:

1. **Realtime Database** インスタンスを作成
2. **Authentication → Sign-in method → Anonymous** を有効化
3. プロジェクト設定 → Web SDK 設定値を `.env.local` にコピー
4. `database.rules.json` をデプロイ
   ```bash
   firebase deploy --only database
   ```
   または Firebase Console の Rules タブに直接貼り付け。

---

## バックエンド設計のキー

匿名認証 + RTDB のみという制約下で、サーバ関数を 1 行も書かずに「ライブ配信」のセマンティクスを成立させているのがこのプロジェクトの肝。以下、主要な設計判断。

### 1. Read model の分離: `lists` ではなく `active_lists` を見る

ダッシュボードはカード単位の要約 (タイトル / 進捗 / 直近 deadline / watcher 数) しか必要としない。にもかかわらず `lists/{shareId}` のサブツリーを N 件 fan-out 購読する素直な実装にすると、カード数に応じてクライアントの帯域・メモリが線形に膨らむ。todo 本文や reaction まで全クライアントに流れる。

そこで read 用の薄い射影を別ノードに分けた:

- **書き込み**: owner クライアントのみが自分の要約を `active_lists/{shareId}` に 350ms debounce で書く (`hooks/useActiveListSync.ts`)
- **読み出し**: ダッシュボードは `active_lists` というフラットなノード 1 つだけを購読 (`hooks/useActiveLists.ts`)
- **競合**: owner 単独 write なので write 衝突は構造的に発生しない。watcher は read only

CQRS の軽量版。書き込み元を 1 人に絞ることで RTDB の楽観ロックすら不要になる。

### 2. `onDisconnect` でライブ in/out を自動キュレーション

サーバ cron なしで「いま生きている配信だけ」を出すトリック:

- owner がリストページに入ると `active_lists/{shareId}` を `set` し、**同じ ref に `onDisconnect().remove()` を登録**
- owner の全タブが閉じる、もしくはネットワークが切れると、RTDB サーバが当該ノードを削除
- ダッシュボードは別途 cleanup を回さなくても、購読が自然に「消えたカード」として反応する

レース対策として `onDisconnect` の登録は **最初の `set` の resolve 後にのみ 1 回だけ** 行う (`onDisconnectRegistered` ref で一度きりに固定)。

`hooks/usePresence.ts` でも同じパターン。視聴者の presence にも `onDisconnect().remove()` を貼り、ハードクラッシュやネットワーク断で残骸が残らないようにしている。明示的な unmount 時は即時 `set(null)` するため、画面遷移時のラグも 0。

### 3. `runTransaction` を使う 2 箇所

楽観ロックで多端末 write の冪等性を担保している箇所が 2 つある (`hooks/useTodos.ts`)。

**`toggleTodoDone`** — owner が複数タブを開いた状態で同じ todo をトグルしたとき、`done` / `status` / `completedAt` の 3 フィールドが「片方は完了、片方は未完了」のように歪まないように、トランザクション内で 3 フィールドを同時にアトミック更新する。

**`expireTodoIfNeeded`** — カウントダウンが 0 を切る瞬間、ページを開いている N 人のクライアントが同時に「自分が expire を立てる」と走り出す。トランザクション内で `if (current.status === 'expired') return current` の早期 return を入れ、すでに expired ならノータッチで終わる冪等処理にした。RTDB 側で N - 1 件は no-op として弾かれる。

### 4. Owner 単独書き込み + debounce

`active_lists` への書き込みは owner だけが行うため write 競合は発生しないが、todo の text を編集している最中は keystroke ごとに親コンポーネントが re-render し、`useActiveListSync` も再走する。素直に書くと write が秒間複数回発生する。

`useActiveListSync.ts` で 350ms の debounce を挟むことで、入力が落ち着いた瞬間に 1 回だけ要約を書き込む。watcher 側のダッシュボードからは「タイトルがちょっと遅れて反映される」程度の体感で、コスト削減効果のほうが圧倒的に大きい。

### 5. Reaction の TTL を「送信元クライアントの責任」で実装する

reaction は floating animation 用に RTDB に短期間 push し、不要になったらクライアントが自分で消す短命データ (`hooks/useReactions.ts`)。

- **送信レート制限**: 1 クライアントあたり 2 秒に 1 回 (`THROTTLE_MS = 2000`)
- **受信**: `onChildAdded` でストリーム購読し、3.4 秒のアニメーション後に React state からドロップ
- **RTDB クリーンアップ**: 送信した本人が 5 秒後に自分の push 済 child を `remove`
  - これがないと、新規入場者が `onChildAdded` の初回リプレイで「他人が打ったエフェクト」を再生してしまい、紙吹雪の二度がけが起きる
  - 送信者にクリーンアップを担わせることで、サーバ TTL や cron なしに自然消滅させる

サーバレス制約下で「揮発データ」を扱うときの定石。

### 6. Security Rules で 4 つの境界を引く

`database.rules.json`:

| ノード | 書き込み権限 | 検証 |
|---|---|---|
| `users/{uid}` | 自身の uid のみ | name / color / iconKey スキーマ |
| `lists/{shareId}/meta` | 作成・更新・削除すべて `ownerId === auth.uid` | title 長さ等 |
| `lists/{shareId}/todos` | `meta.ownerId === auth.uid` (他ノード参照) | text / deadline / status |
| `lists/{shareId}/presence/{uid}` | 自身の uid のみ | role enum |
| `active_lists/{shareId}` | `ownerId === auth.uid` | summary フィールド |

注目点: **`todos` の write 権限が `meta.ownerId` を参照している**。これにより「リスト所有権」を `meta` に集中できる。owner を変えるには `meta` を上書きすれば済むし、todo 一つひとつに owner フィールドを冗長保存する必要がない。

### 7. RTDB 応答は型ガードで検証する

`any` 禁止。RTDB から返る `unknown` は `lib/guards.ts` の `parseTodo` / `parsePresence` / `parseListMeta` などの narrowing 関数を必ず通す。スキーマ違反のレコードは握りつぶして読み捨てる方針。これにより:

- アプリ側コードはすべて完全型で書ける
- 過去スキーマで書かれた壊れたレコードが混ざっても落ちない
- 将来フィールドを追加するときに、guard で `optional` 扱いにする → rules で `validate` を緩める、の 2 段階で安全に拡張できる (実例: `iconKey` / `youtubeVideoId` の追加はこの順で入れた)

### 8. クライアント時計依存のトレードオフ

期限切れ判定は **誰かがページを開いているとき** にしか transaction が走らない。誰も見ていないリストは `status` が `active` のまま残り、次の訪問者が sweep する。視覚的にはカウントダウンが 0 で「expired っぽく見える」が、RTDB 上の `status` は遅延し得る。

カウントダウン自体もクライアントローカル時計で計算する。共有しているのは epoch deadline なのでデバイス間誤差は 1〜2 秒程度。これらは Cloud Functions を導入しないことの代償として明示的に許容している。

---

## 意図的に作らなかったもの

- **Cloud Functions**: cold start とコスト管理を避けるため。期限切れは client-driven sweep で十分
- **チャット**: 匿名環境で abuse 対応コストが跳ねる。reaction 5 種で "見ているよ" は十分伝わる
- **検索 / タグ / フォロー / 通知 / 履歴 / 統計 / 多 owner / E2E**: コンセプトを "配信中の締切" に絞るため

## i18n

ja / ko の 2 言語しかないため、自前で薄く実装 (`lib/i18n/`)。`Dictionary` 型 + React Context + `useT()` フック。`{{count}}` のような placeholder 単純置換のみサポート、複数形・日付フォーマットは非対応。

SSR / CSR hydration mismatch を避けるため、初期描画は **常に `ja` で固定**し、マウント後に `localStorage.onair.locale` を読んで `ko` なら差し替える。

## ディレクトリ構成

```
app/
  layout.tsx                    LocaleProvider + Header
  page.tsx                      ダッシュボード
  list/[shareId]/page.tsx       リストページ (owner / watcher 分岐)
  components/
hooks/
  useAnonAuth.ts                匿名サインイン + プロフィール購読
  useTodos.ts                   todo CRUD + transaction
  usePresence.ts                presence writer / list
  useReactions.ts               reaction push / throttle / floating
  useActiveLists.ts             ダッシュボード購読
  useActiveListSync.ts          owner 単独 active_lists 更新 (debounced)
  useUserProfile.ts
lib/
  firebase.ts                   単一初期化
  types.ts / guards.ts          RTDB 応答を型ガードで narrowing
  nicknames.ts                  ランダムニックネーム + 名詞インデックス連動アバター
  avatarIcons.tsx               20 種ライン SVG
  i18n/                         自前実装
database.rules.json
```

## デモシナリオ

1. **タブ 1 (owner)**: `/` で「ライブを始める」→ ニックネーム入力 → リストページ進入 → タイトル + todo 2〜3 件 (うち 1 件は 1 分後 deadline) →「URL をコピー」
2. **タブ 2 (watcher A)**: URL を貼り付け → 同様に入力 → owner の todo が read-only で見える。下部 reaction を 2 回タップ
3. **タブ 3 (watcher B)**: 別ブラウザ (またはシークレット) で同 URL → 右上に watcher chip が +1 → reaction を 1 回
4. owner 画面に reaction 絵文字が浮かび上がり、watcher chip 数も増加
5. 右上 `JA / KO` トグルで全テキストが即時切替
6. 1 分後の todo がカウントダウン 30 秒以下で色強調 → 0 になると 1 つのクライアントが transaction で `expired` を立て、全員に同期
7. owner の全タブを閉じると、別ブラウザのダッシュボードからカードが自動消失 (`onDisconnect` 動作確認)
