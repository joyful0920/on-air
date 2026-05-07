# OnAir

> あなたの締切を、ライブで

**🔴 Live: [https://on-air-tan.vercel.app/](https://on-air-tan.vercel.app/)**

[日本語](./README.md) ・ [한국어](./README.ko.md)

## サービス概要

OnAir は、締切のある Todo を公開し、ほかの人がリアルタイムで見守れるライブ Todo ダッシュボードです。

トップページでは、現在進行中のリストがカード形式で表示されます。各カードには、作成者の情報、進捗、もっとも近い締切、現在見ている人数が表示されます。カードをクリックするとその人の Todo リストに移動し、read-only で内容を見ながら reaction を送ることができます。

リストの owner は、自分のリストで Todo の追加、編集、完了、削除ができ、各 Todo に deadline を設定できます。owner のすべてのタブが閉じられると、そのリストはダッシュボードから自動的に消えます。

このアプリは、「締切をライブで公開する」というコンセプトで作りました。owner は締切を配信のように開き、watcher はその進捗を見守りながら reaction で応援します。カウントダウンが 0 になると配信終了、という流れです。受験勉強、締切直前の作業、運動・ダイエットチャレンジ、短い振り返りなど、今取り組んでいることを気軽に公開し、誰かに見守ってもらう場面を想定しています。

## 技術スタック

- Next.js 16 (App Router) / React 18 / TypeScript (strict)
- Firebase Realtime Database (RTDB) + Anonymous Auth (Web SDK v9 modular)
- Tailwind CSS / nanoid

依存関係は最小限に抑えています。状態管理、UI、i18n のライブラリはあえて導入していません。

## セットアップ

```bash
npm install
cp .env.local.example .env.local   # Firebase 設定値を埋める
npm run dev                         # http://localhost:3000
```

Firebase 側の準備:

1. **Realtime Database** インスタンスを作成
2. **Authentication → Sign-in method → Anonymous** を有効化
3. プロジェクト設定 → Web SDK の設定値を `.env.local` にコピー
4. `database.rules.json` をデプロイ

   ```bash
   firebase deploy --only database
   ```

   Firebase Console の Rules タブに直接貼り付けても同じです。

---

## 主な設計判断

このプロジェクトのポイントは、別途バックエンドサーバーや Cloud Functions を使わずに、Firebase Anonymous Auth と Realtime Database だけで「いまどのリストが開かれているか」「誰が見ているか」「締切の状態がどう変わるか」をリアルタイムに表現している点です。

機能としては Todo CRUD から出発していますが、RTDB の presence、`onDisconnect`、transaction、ダッシュボード用の read model を使い、ライブサービスらしい動きになるように設計しました。

### 1. ダッシュボード用の要約データを分ける: `lists` ではなく `active_lists` を購読

ダッシュボードに必要なのは、各リストのすべての Todo や reaction ではありません。カードに表示するタイトル、進捗、もっとも近い deadline、watcher 数などの要約情報だけです。

もしダッシュボードで `lists/{shareId}` 全体をカード数分そのまま購読すると、カードが増えるほどクライアントが読み込むデータ量とメモリ使用量も増えていきます。ダッシュボードには不要な Todo 本文や reaction まで、すべてのクライアントに流れてしまいます。

そこで、ダッシュボード専用の要約ノードとして `active_lists/{shareId}` を別に用意しました。

- **書き込み**: owner クライアントだけが、自分の要約情報を `active_lists/{shareId}` に 350ms debounce で書き込みます。(`hooks/useActiveListSync.ts`)
- **読み込み**: ダッシュボードは、フラットな `active_lists` ノード 1 つだけを購読します。(`hooks/useActiveLists.ts`)
- **競合の回避**: 書き込むのは owner だけなので、複数のクライアントが同じ要約データを同時に更新する構造にはなりません。watcher は read-only です。

考え方としては、CQRS における read model 分離に近いものです。画面に必要な要約データを別に持つことで、ダッシュボードは必要な情報だけを軽く読み込めます。

### 2. `onDisconnect` を使ってライブ中のリストを自動で整理する

このアプリでは、「いま開かれているリスト」だけをダッシュボードに表示します。そのために、別の cleanup job やサーバー cron は用意せず、RTDB の `onDisconnect()` を使いました。

owner がリストページに入ると、`active_lists/{shareId}` に要約情報を書き込みます。そして同じ ref に `onDisconnect().remove()` を登録します。その後、owner のすべてのタブが閉じられたりネットワークが切れたりすると、RTDB サーバーがそのノードを自動的に削除します。

その結果、ダッシュボード側では特別な cleanup 処理をしなくても、現在アクティブなリストだけを表示できます。購読していたカードが消えれば、画面上からも自然に削除されます。

race condition を避けるため、`onDisconnect` の登録は最初の `set` が完了したあとに 1 回だけ行います。コードでは `onDisconnectRegistered` ref を使い、重複登録されないようにしています。

`hooks/usePresence.ts` でも同じパターンを使っています。watcher の presence にも `onDisconnect().remove()` を登録し、異常終了やネットワーク切断が起きても古い watcher データが残らないようにしました。明示的な unmount 時にはすぐに `set(null)` を呼び、ページ遷移時にも watcher 数がすぐ反映されるようにしています。

### 3. 複数クライアントが同時に更新し得る箇所では `runTransaction` を使う

RTDB では、複数のクライアントが同じデータを同時に更新することがあります。そのため、状態がずれる可能性のある箇所では `runTransaction` を使いました。(`hooks/useTodos.ts`)

**`toggleTodoDone`** — owner が複数のタブを開いている状態で、同じ Todo の完了状態を切り替える可能性があります。このとき `done`、`status`、`completedAt` の 3 つのフィールドが食い違わないように、transaction の中でまとめて更新しています。

**`expireTodoIfNeeded`** — カウントダウンが 0 になった瞬間、ページを見ている複数のクライアントが同時に期限切れ処理を試みる可能性があります。transaction 内で、すでに `expired` になっている場合はそのまま返すようにし、何度実行されても結果が変わらない処理にしました。すでに処理済みのリクエストは、状態を再度変更せずに終了します。

### 4. owner だけが書き込み、debounce で write を抑える

`active_lists` を書き込むのは owner だけなので、write の競合はほとんど起きません。ただし Todo の text を編集中は、keystroke ごとに親コンポーネントが re-render され、`useActiveListSync` も再実行されることがあります。そのままにすると、短時間に何度も write が発生します。

これを抑えるため、`useActiveListSync.ts` では 350ms の debounce を入れました。入力が少し落ち着いたタイミングで 1 回だけ要約情報を書き込みます。ダッシュボード側では変更が少し遅れて見えることがありますが、その代わり不要な write を減らせます。

### 5. Reaction は短時間だけ残るイベントとして扱う

Reaction は累積の「いいね」ではなく、ライブ配信中に流れる応援エフェクトに近いものとして設計しました。ユーザーが絵文字を押すと RTDB に reaction イベントを一時的に書き込み、すべてのクライアントがそれを購読して floating animation として表示します。(`hooks/useReactions.ts`)

- **送信制限**: 1 クライアントあたり 2 秒に 1 回まで送信できます。(`THROTTLE_MS = 2000`)
- **受信処理**: `onChildAdded` で reaction のストリームを購読し、3.4 秒のアニメーションが終わったら React state から取り除きます。
- **RTDB の掃除**: 送信したクライアントが、5 秒後に自分で作成した reaction ノードを削除します。

この削除処理がないと、新しく入ってきたユーザーが過去の reaction を初期データとして受け取り、古いエフェクトを再生してしまうことがあります。そのため reaction は長く保存せず、送信者自身が後で削除する短命イベントとして扱っています。サーバー TTL や cron を使わずに、一時的なデータを処理するためのシンプルな方法です。

### 6. Security Rules で書き込み権限を制限する

`database.rules.json` では、ノードごとに書き込み権限を分けています。

| ノード                           | 書き込み権限                                  | 検証                            |
| -------------------------------- | --------------------------------------------- | ------------------------------- |
| `users/{uid}`                    | 自分の uid のみ                               | name / color / iconKey スキーマ |
| `lists/{shareId}/meta`           | 作成・更新・削除すべて `ownerId === auth.uid` | title の長さなど                |
| `lists/{shareId}/todos`          | `meta.ownerId === auth.uid` (他ノード参照)    | text / deadline / status        |
| `lists/{shareId}/presence/{uid}` | 自分の uid のみ                               | role enum                       |
| `active_lists/{shareId}`         | `ownerId === auth.uid`                        | summary フィールド              |

特に `todos` の write 権限は、`lists/{shareId}/meta/ownerId` を基準に判断しています。Todo ごとに owner 情報を重複して持たせず、リストの所有権を `meta` に集約するためです。所有権の判断基準が 1 か所にまとまるため、権限ルールもシンプルになります。

### 7. RTDB のレスポンスは型ガードで検証する

RTDB から読み込んだデータはそのまま信用せず、まず `unknown` として扱います。そのうえで、`lib/guards.ts` の `parseTodo`、`parsePresence`、`parseListMeta` などの型ガード関数を通してから使います。`any` は使っていません。

スキーマに合わないレコードは、アプリ側では無視する方針にしています。これには次のようなメリットがあります。

- アプリ内部では、型が絞り込まれた安全な値だけを扱えます。
- 過去のスキーマで保存された壊れたレコードが混ざっていても、アプリ全体が落ちにくくなります。
- 将来フィールドを追加するときも、guard 側で optional 扱いにしてから rules の validate を緩める、という順番で段階的に拡張できます。

実際に `iconKey`、`youtubeVideoId` などのフィールドもこの順番で追加しました。

### 8. クライアント時計に依存する部分と、そのトレードオフ

期限切れ処理は、誰かがリストページを開いているときだけ実行されます。誰も見ていないリストでは `status` が `active` のまま残り、次の訪問者が入ったときに sweep されることがあります。画面上では deadline を基準にすでに期限切れのように見えても、RTDB 上の `status` 反映は遅れる場合があります。

カウントダウンもクライアントのローカル時計をもとに計算しています。すべてのクライアントが同じ epoch deadline を共有しているため、基本的には同じように見えますが、デバイスの時計差によって 1〜2 秒程度ずれることがあります。

Cloud Functions を使えば、期限切れ処理や要約データの更新をサーバー側でより正確に扱えます。ただしこのプロジェクトでは、RTDB とクライアントだけでライブ感のある体験を作ることを目的にしたため、この制約を意図的に受け入れています。

---

## 意図的に作らなかったもの

- **Cloud Functions**: cold start やコスト管理を避け、RTDB とクライアントだけで実装範囲を絞るために使いませんでした。期限切れ処理は client-driven sweep で十分だと判断しました。
- **チャット**: 匿名環境では abuse 対応のコストが大きくなります。このプロジェクトでは、5 種類の reaction だけで「見ている」「応援している」というサインを伝えるようにしました。
- **検索 / タグ / フォロー / 通知 / 履歴 / 統計 / 複数 owner / E2E テスト**: コンセプトを「いま配信中の締切」に絞るために除外しました。

## i18n

対応言語は ja / ko の 2 言語だけなので、ライブラリは使わずに軽く自前実装しました。(`lib/i18n/`)

`Dictionary` 型、React Context、`useT()` フックで構成しています。`{{count}}` のような placeholder の単純置換だけをサポートし、複数形処理や日付フォーマットは今回の範囲では扱っていません。

SSR / CSR hydration mismatch を避けるため、初回レンダリングは常に `ja` に固定し、マウント後に `localStorage.onair.locale` を読んで `ko` であれば差し替えます。

## ディレクトリ構成

```txt
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

1. **タブ 1 (owner)**: `/` で「ライブを始める」→ ニックネーム入力 → リストページへ移動 → タイトルと Todo 2〜3 件を作成。このうち 1 件は 1 分後の deadline に設定 →「URL をコピー」
2. **タブ 2 (watcher A)**: URL を貼り付け → 同じようにニックネーム入力 → owner の Todo が read-only で表示されることを確認 → 下部の reaction を 2 回タップ
3. **タブ 3 (watcher B)**: 別ブラウザまたはシークレットウィンドウで同じ URL を開く → 右上の watcher chip が +1 されることを確認 → reaction を 1 回送信
4. owner 画面で reaction 絵文字が浮かび上がり、watcher chip 数も増えることを確認
5. 右上の `JA / KO` トグルで、すべてのテキストがすぐに切り替わることを確認
6. 1 分後の Todo がカウントダウン 30 秒以下になると色が強調され、0 になると 1 つのクライアントが transaction で `expired` を設定し、全員の画面に同期されることを確認
7. owner のすべてのタブを閉じると、別ブラウザのダッシュボードからカードが自動的に消えることを確認 (`onDisconnect` の動作)
