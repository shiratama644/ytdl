# Phase 0: 基盤構築(自宅サーバー基盤 + メタデータ API + web スキャフォールド)

> 対応 task-list ID: `P00-A` … `P00-F` (docs/task-list.md)
> 計画書テンプレート: docs/planning/_TEMPLATE.md 準拠
> 前提調査: [`research/SHIATUBE_DEEP_RESEARCH.md`](../research/SHIATUBE_DEEP_RESEARCH.md)(以下「しあTube 調査」)

---

## 1. 開始前確認

- 現在のブランチ / HEAD / `git status` を確認する(未コミット変更があれば停止)
- `docs/task-list.md` で依存タスクの完了を確認する
- 関連資料: しあTube 調査(§5 技術アーキテクチャ・§8 示唆)を読む
- 本計画書の §5(完了条件)と §7(停止条件)を再読する

## 2. 目的 (Why)

「しあTube 相当の閲覧機能を持つ」YouTube プロキシ閲覧サイトを、以下を特徴として構築する:

1. **再生: iframe 埋め込み**(`https://www.youtubeeducation.com/embed/{id}` を既定・公式 embed に差し替え可能。**2026-09-23 改訂 = D1**)
2. **構成: 最初から自宅サーバー**(**D10**。自宅 Proxmox(LXC/VM)上に Docker Compose = Nginx + Bun(Hono) API。**GAS 期は設けない**)
3. **メタデータ: youtubei.js(InnerTube クライアント)**(**D11**。第三者 API は使わない)。**yt-dlp は将来の DL 担当**(**D13**。現段階では導入しない)
4. **UI/UX: Material 3 Design Expressive**(+ GSAP モーション。スタック = Next.js(App Router, `output:'export'`)+ Tailwind CSS + Dexie.js)

**動画ダウンロード機能は 2026-09-23 のユーザー決定で保留**(目標から除外。設計・調査は docs に保存 = §10.8)。
本フェーズ(P0)では、**サーバー基盤(API + Docker Compose + Nginx)・メタデータ解決・web スキャフォールド**を
立ち上げ、**検索 → 視聴 → iframe 再生**の縦の一本が動くところまでを狙う。
**ページ抽出のアルゴリズムは V1(第 4 回 v1d)で実証済み**(`/watch/` ページからメタデータを取得)。
**検索・トレンドは V6 で確認する**(未確定の間は実装を保留)。証跡: `docs/research/VERIFICATION_P0.md` /
実コード確認: `docs/research/SIATUBE_CODE_VERIFICATION.md`。
## 3. 変更範囲 (Scope)

変更対象:
- リポジトリ再編成(cod-web 由来のゲーム関連ドキュメントは 2026-09-21 のユーザー指示で削除済み・git 履歴にのみ残存)
- **`apps/api`(Bun + Hono = メタデータ API)** + **`deploy/`(Docker Compose + Nginx 設定 + Proxmox 手順)**
- `apps/web`(Next.js)+ `packages/shared`(API client / types)
- `scripts/`(任意 = 単一 HTML ビルド。ミラー配布用)
- `docs/`(README 再編成、本計画書、task-list)

変更しない(境界外):
- 再生 UI の完成版(P1)、機能拡張(P3)は本フェーズの**設計のみ**含み、コードは置かない
- **動画ダウンロード機能は保留**(実装しない。旧設計 = §10.8 に保存)
- **GAS 版は実装しない**(旧 GAS キットと証跡は参考として保存 = §10.9)
## 4. 禁止事項

- 不明点は推測で埋めず、§7 の停止条件に従って質問する
- ~~サーバー側で映像・音声の結合(エンコード・ムキシング)をしない~~ = **DL 保留により当面対象外**(再開時に適用。表現規約は継続)
- **再生経路のサーバー中継をしない**(iframe 方式で確定 = 再生はブラウザ ↔ YouTube 系で完結)。
  DL 専用 relay は**保留**(旧設計 = §10.10 / DOWNLOAD_MECHANISM_RESEARCH.md 方式 A)
- YouTube 内部仕様の断定は、しあTube 調査・公式情報・実測の根拠がある場合のみとする
- コンテンツのサーバー側保存・二次配布・再配信をしない(法的境界、しあTube 調査 §6)

## 5. 完了条件 (DoD)

- [ ] `apps/api` が起動し、`/api/health` と `/api/video/{id}`・`/api/search?q=...` が実データを返す(vitest + 手動確認)
- [ ] **メタデータ解決**が動作する: youtubei.js(検索 / 動画 / チャンネル / プレイリスト)+ **O9**(キャッシュ / リトライ+バックオフ / single-flight)をテストで確認(クライアントは**ネットワークなしで生成できる**のでユニットテストが書ける)
- [ ] **O9 を実装**: キャッシュ(TTL)/ リトライ+バックオフ / 同一対象の single-flight がテストで確認できる
- [ ] `deploy/` の Docker Compose(`nginx` + `api`)が `docker compose config` を通り、**自宅 Proxmox(LXC/VM)で起動できる**(手順書 + 実測ログ)
- [ ] `apps/web` が build 成功(`output: 'export'`)+ Nginx 配信で画面が表示される
- [ ] `packages/shared` の API client が fetch 輸送で型付きの応答を返す(vitest でユニットテスト)
- [ ] M3 Design Expressive のテーマトークン(Tailwind `@theme`)と 2 画面(ホーム / watch スケルトン)が整う
- [ ] **iframe プレイヤーの描画・再生が実環境で確認できる**(ブラウザ。**V5 の結果を前提とする**)
- [ ] **V5(ブラウザ側)・V6(サーバー側)の結果が `verification/Verification-Results.md` に記録され、判定が本文書に反映される**
- [ ] `docs/task-list.md` の状態・証拠を更新
- [ ] タスク範囲外のファイルに意図しない変更がない
## 6. テスト方法

| 層 | 実施 | 確認内容 |
|---|---|---|
| Unit (vitest) | packages/shared / apps/api | API client の URL 構築・レスポンス正規化・エラー分類 / 解決器(youtubei.js 応答の正規化・キャッシュ・single-flight・エラー分類) |
| 結合(vitest) | apps/api | **実ネットワークを使わず**、youtubei.js の**オフライン生成セッション**+ 保存済みレスポンス JSON で正規化ロジックを検証(**サンドボックスは YouTube に到達不可** = 実データは V6 と実機で確認) |
| Build | apps/web | `next build` が成功し `out/` が生成される |
| コンテナ | deploy | `docker compose config` + `docker compose up` で nginx/api が起動し `/api/health` が返る |
| 実環境(サーバー) | 自宅 Proxmox(LXC/VM) | 実際の YouTube へのアクセス(**InnerTube / youtubei.js**: 検索 / 動画 / チャンネル / プレイリスト / トレンド / Live Chat)= **V6 キット**で先行確認する |
| 実環境(ブラウザ) | Chrome / iOS Safari | 静的配信の画面表示 + **iframe プレイヤーの描画・再生**(V5)、エラー表示の正常性 |
## 7. 停止条件

次の場合は作業を停止し、変更せず報告する:
- 計画書・しあTube 調査・AGENTS.md 同士に矛盾がある
- task-list.md 記載の変更範囲を超える変更が必要
- 破壊的変更が必要
- ユーザー判断が必要な設計論点に到達した(例: youtubei.js / InnerTube が自宅回線から通らない場合の代替の選択 = **V6 の結果次第**)
- 開始時点で作業ツリーに未確認の変更がある

## 8. 完了時に行うこと

1. 差分を自己レビュー
2. §5 の各項目を検証(ドキュメントのみならリンク整合)
3. `docs/task-list.md` を更新
4. タスク ID を含むコミット
5. 証拠中心の完了報告(GAS の実測レスポンス例・build 成果物サイズ等)

## 9. サブタスク分割

| ID | テーマ | 主要成果物 | 依存 |
|---|---|---|---|
| P00-A | リポジトリ再編成(完了済み) | cod-web 文書の削除(2026-09-21)、`docs/README.md`・`docs/task-list.md`、トップ README 更新 | - |
| P00-B | **サーバー骨格** | `apps/api`(Bun + Hono: `/api/health` + ルーティング骨格 + 設定/環境変数)、`deploy/`(`docker-compose.yml`・`nginx.conf`・`.env.example`)、ローカル起動手順 | A |
| P00-C | web スキャフォールド | `apps/web`(Next.js App Router, `output:'export'`, Tailwind v4, GSAP 導入, M3 トークン, ルータ骨格)、`packages/shared`(API client + types)+ vitest | A |
| P00-D | **メタデータ解決の実装** | `apps/api/src/youtube/`(youtubei.js クライアントの生成と使い回し・検索 / 動画 / チャンネル / プレイリスト / トレンド)、正規化、**O9**(キャッシュ / リトライ+バックオフ / single-flight)、オフライン生成によるテスト | B,C |
| P00-E | **配備** | `deploy/` の完成版(Compose 一式 + Nginx + TLS 設定)、Proxmox LXC 配備手順書、起動確認の実測記録、運用手順(更新/監視/バックアップ) | B,D |
| P00-F | M3 Expressive 基線 | テーマ(色/形状/タイポ)、ホーム + watch スケルトン、GSAP トランジション 1 種、API 接続(検索 → 視聴 → iframe 再生の縦の一本) | C,D |

> 推奨順: **B → C → D → E → F**(B/C は V5・V6 の結果に依存しないため先行可能。D の検索・トレンドは V6 の結果を反映)。

---

## 10. 設計詳細・仕様

### 10.1 位置づけ・対象

- しあTube と**同じ需要構造**(学校のフィルタ回避・アカウント不要・広告なし・高画質)に、**M3 Design Expressive の UI** で差別化する(~~ダウンロード機能~~ = 2026-09-23 に**保留**)
- **構成は最初から自宅サーバー**(D10)。GAS 期を設けないため、GAS の制約(UrlFetchApp のみ / 6 分 / 日次クォータ / 旧版配信)を持ち込まずに設計できる
- 視聴側は YouTube 正規コンテンツの私的使用(日本著作権法第30条圏)を前提。運営は保存・再配信・再エンコードをしない(§4)
- **サーバーの役割はメタデータ解決とキャッシュに限定**(再生バイトは中継しない = D6)。配備先 = 自宅 Proxmox(LXC/VM)
- 対象環境: 学校の Chromebook/Windows(低スペック、4GB RAM 相当)、スマホ(Chrome/Safari)。デスクトップは任意
### 10.2 全体アーキテクチャ(2026-09-23 改訂 = サーバー一本)

```
┌──────────────── 自宅サーバー(最初から構築・Proxmox LXC/VM) ────────────────────┐
│ Docker Compose                                                                   │
│   nginx(443/TLS) ──┬──▶ 静的配信(Next.js export のビルド成果物)                │
│                    └──▶ /api/* を api コンテナへリバースプロキシ                 │
│   api(Bun + Hono) ──▶ メタデータ解決                                            │
│        ├─ youtubei.js(InnerTube クライアント。プロセスで使い回す)               │
│        │   ※ yt-dlp(将来の DL 担当 = D13)は現段階では導入しない                │
│        + O9: キャッシュ(TTL)/ リトライ+バックオフ / single-flight                │
│        → JSON(メタデータのみ: タイトル/投稿者/長さ/サムネイル/関連/コメント)     │
│        ※ ストリーム URL は取得・返却しない(iframe 再生では不要)                 │
│                                                                                  │
│  [ブラウザ] 再生: iframe ─▶ https://www.youtubeeducation.com/embed/{id}?{params} │
│        (ブラウザ ↔ YouTube 系で完結 = 再生にサーバーは関与しない)                │
└──────────────────────────────────────────────────────────────────────────────────┘
```

旧構成(GAS 期 = 単一 HTML + `?api=` ディスパッチ)は 2026-09-23 の決定で**採用しない**
(証跡 = §10.9 の参考 / `docs/research/VERIFICATION_P0.md`)。

**設計原則(ユーザー定義・絶対表現は禁止)**:
1. **サーバー側で動画データを中継・変換しない限り**、動画処理に伴う CPU/メモリ負荷を最小化できる(サーバーの役割 = メタデータ解決とキャッシュのみ。**DL 専用 relay は保留** = 2026-09-23)
2. **StreamSaver.js 等のストリーミングダウンロード機構を利用し**、巨大な Blob をメモリ上に保持することを避ける(※ **DL 保留に伴い当面対象外**。表現規約は継続)
3. **再エンコードを行わないため**、FFmpeg 等による再エンコードより CPU 負荷を大幅に低減できる(※ **DL 保留に伴い当面対象外**。表現規約は継続)
4. **ブラウザからの直接取得可否(CORS、Range、URL 有効期限、codec/container 対応等)を検証した上で利用する**。「生 URL を返せば再生できる」は前提にしない(再生 = iframe ではストリーム URL を扱わないため、**直リンク/DL 再開時に適用する**)
### 10.3 AI 推奨構成文書への修正点(本設計の根拠)

> **2026-09-23 追記(2 回目 = サーバー一本)**: C1〜C7 は 2026-09-13〜15 時点の設計記録。
> **C1(直リンク再生)・C2・C5・C6・C7 は DL / 直リンク(保留)に閉じた判断**、**C3(GAS の輸送制約)は
> GAS 非採用(D10)により参考**、**C4 は「第三者 API を使わない」方針の記録として有効**(実装手段は
> **youtubei.js(InnerTube クライアント)へ改訂 = D11(2026-09-23)**。yt-dlp は将来の DL 担当(D13)として整理。)
> なお表中の「GAS 期」「Phase B」は**当時の呼称**で、現在は「GAS 期 = 採用しない」「Phase B = 本体構成(サーバー一本)」に読み替える。

| # | 推奨文書の記述 | 修正 | 根拠 |
|---|---|---|---|
| C1 | 再生は MSE / dash.js / shaka-player | **DASH 再生は MSE 不要**。ネイティブ `<video>`(映像)+ `<audio>`(音声)の**2 要素シンクロ**で再生する(しあTube StreamType2 が実証済み)。fetch を経由しない経路でメモリ負荷が最小。MSE 系(dash.js/shaka)は後日の拡張候補のみ。**m3u8(ライブ)のみ hls.js**。いずれの経路もブラウザ直接取得可否は V2 で検証した上で利用 | しあTube 調査 §5.6(実コード読了) |
| C2 | 「GAS で動かし CORS が出たら移行」 | **V2 実測で確定(2026-09-13)**: googlevideo への `fetch()` は全 NG / `<video>` 再生は OK = CORS(ACAO 欠如)が成立。Piped 運用 issue(#3211)の同種実証・Invidious/Piped のサーバー中継実務も佐証。→ ブラウザ直接 fetch の DL は全フェーズで不可。~~**DL = 自社サーバーからの取得**~~(Phase B: 方式 A の DL 専用 relay / 方式 B の完成ファイル。GAS 期: 直リンクのみ)**(2026-09-23: DL = 保留により本判断は保留)** | V2 実測(VERIFICATION_P0.md) + Piped issue #3211 + Invidious/Piped 実務 |
| C3 | 「バックエンド(GAS / Next.js API)が JSON を返す」(fetch 前提) | **GAS は CORS ヘッダを設定できない + POST に対応しない(doGet のみ)**。よって GAS フェーズの API は**同一オリジン**(doGet のクエリ引数ディスパッチ / google.script.run RPC)で必須。`fetch('/api/...')` は Phase B 専用。API client は**双方向輸送**を先に抽象化する | GAS 仕様(公式ドキュメントの既知制限) |
| C4 | 「YouTubei.js 等のライブラリ」 | **2026-09-23 改訂(2 回目)**: **現段階のメタデータ取得は youtubei.js(InnerTube クライアント)**(D11。v18.1.0・MIT・ESM。サンドボックスで import とオフライン生成を実測 = HANDOVER §7.10)。**yt-dlp は将来の DL 担当**(D13)/ 自前ページ抽出は実装しない(証跡として保存)。第三者 API 不使用は維持 | 2026-09-23 ユーザー決定(D11/D13) + 実測(HANDOVER §7.10) |
| C5 | (未言及) | API が返す `httpHeaders`(カスタム UA 等)は**ブラウザの fetch では上書き不可**。高画質 DASH の fetch(ダウンロード)が UA を要求されれば失敗し得る。対処: 実測で確認、失敗時は Phase B の relay がヘッダを付与 | しあTube 調査 §5.5(実測レスポンスに httpHeaders 存在) |
| C6 | StreamSaver.js を採用(**ダウンロードの主経路**) | 指示どおり主経路に据える(= 方式 A / B での保存機構)。**SW の配信は Phase B(自宅サーバー・自ドメイン)= 制約なし**。GAS 期は DL が直リンクのため **StreamSaver は不使用**(2026-09-13 設計確定)→ 旧案「GAS が SW を配信」は不要になった。V3(GAS からの SW 配信)は**参考**(PWA/オフライン機能の将来判断)。**注意: StreamSaver は実質 Chromium 系のみ**(Safari/Firefox 非対応・公式)→ iOS/FF は常に直リンクフォールバック(方式 C)。フォールバック順: StreamSaver → FSA(Chromium)→ 直リンク | StreamSaver 公式(機構・対応表)・DOWNLOAD_MECHANISM_RESEARCH.md |
| C7 | (未言及) | 署名 URL の **`ip=` 束縛**。**V2 第 1 回で解決(2026-09-13)**: 解決元 IP(118.151.x)の URL が別 IP(ユーザー Android)で `<video>` 再生 OK = 再生経路では IP 縛りなし。_expire 失効(≈6h、O2)時の再解決_チェーンは防御として維持 | V2 実測(VERIFICATION_P0.md) |

### 10.4 スタック決定

| 層 | 採用 | 理由 |
|---|---|---|
| フロントエンド | **Next.js(最新安定版, App Router, React 19, `output: 'export'`)** | 指定。静的 export を **Nginx が配信**(サーバーは API 専任 = 障害分離しやすい) |
| スタイリング | **Tailwind CSS v4**(`@theme` で M3 トークン) | 指定。M3 Design Expressive のトークン運用と親和 |
| 動画 | **GSAP 3.13(+ ScrollTrigger 任意)** | 指定。ページ遷移・モーフ・スタッガー |
| ローカル永続化 | **Dexie.js 4**(IndexedDB) | 履歴・設定・購読(**DL キューは保留**) |
| 再生 | **iframe 埋め込み**(`https://www.youtubeeducation.com/embed/{id}` 既定・公式 embed に差し替え可能) | D1 改訂(2026-09-23)。直リンク / hls.js / MSE は**保留** |
| **API ランタイム** | **Bun + Hono**(TypeScript) | D10(2026-09-23 ユーザー選択)。CORS ヘッダ可 / キャッシュの自由度 / **youtubei.js をプロセス内で使える** |
| **メタデータ解決** | **youtubei.js(InnerTube クライアント)** + **O9**(リトライ+バックオフ / キャッシュ / single-flight) | D11(2026-09-23 ユーザー選択)。第三者 API は使わない。**v18.1.0 / MIT / ESM**。v1-a + 2026-09-23 の実測 = HANDOVER §7.10 |
| **リバースプロキシ / TLS** | **Nginx** | TLS 終端・静的配信・`/api/*` の転送。証明書の取得方法は P00-E で確定 |
| **配備** | **Docker Compose**(nginx + api)+ **自宅 Proxmox VE(LXC/VM)** | D10(ユーザー選択)。依存はイメージに固定。**yt-dlp は将来の DL 担当**(D13) |
| ダウンロード | **保留**(実装対象外・2026-09-23 ユーザー決定) | 旧設計(muxer / StreamSaver / FSA / 直リンク)は §10.8 に保存 |
| 言語・品質 | TypeScript, biome, vitest | 元リポジトリ由来の流儀(AGENTS.md §6.1 で固定) |
| パッケージ管理 | pnpm(workspaces) | 単一リポジトリ内 `apps/` + `packages/`(**ランタイムは Bun、依存管理は pnpm**) |
### 10.5 リポジトリ構成

```
ytdl/
├── apps/
│   ├── web/                  # Next.js (App Router, output:'export')
│   │   ├── src/app/          # /, /watch, /channel, /playlist, /search, /settings(downloads は保留)
│   │   ├── src/features/     # play / search / subs ... (機能別。download-queue は保留)
│   │   ├── src/components/   # M3 Design Expressive コンポーネント
│   │   └── public/
│   └── api/                  # Bun + Hono = メタデータ API
│       ├── src/index.ts      # 起動・ルーティング(/api/*)
│       ├── src/resolvers/    # ytdlp/(主)・page-extract/(副)・normalize
│       ├── src/cache/        # O9: TTL キャッシュ / single-flight
│       └── test/fixtures/    # 実ネットワーク不要のテスト用(保存済みレスポンス JSON)
├── packages/
│   └── shared/               # API client(fetch)+ types + 定数 + エラー分類
├── deploy/
│   ├── docker-compose.yml    # nginx + api
│   ├── nginx.conf            # TLS・静的配信・/api 転送
│   └── proxmox/              # LXC/VM 配備手順・更新/監視/バックアップ
├── scripts/                  # 任意: 単一 HTML ビルド(ミラー配布用)
└── docs/                     # planning / research / task-list / HANDOVER
```

> 旧構成の `backend/gas`(GAS バックエンド)と「GAS 用 単一 HTML ビルド」は**作らない**(D10・D12)。

### 10.6 API v1(エンドポイント設計)

しあTube 調査 §5.3 の実測形状を踏襲する(メタデータ中心)。**DL 需要のためのフィールドは保留**
(`/api/stream`・`/dl` は実装しない。旧設計は git 履歴 + DOWNLOAD_MECHANISM_RESEARCH.md に保存)。

| エンドポイント | 方法 | 説明 |
|---|---|---|
| `/api/health` | GET | `{"status":"ok"}` + バージョン(死活監視に使用) |
| `/api/search` | GET | `q`, `token`(continuation) |
| `/api/suggest/` | GET | `keyword` |
| `/api/video/{id}` | GET | メタ + related(continuation)。埋め込み depth 形式は必要なら導入 |
| `/api/comments` / `/api/comment/replies` | GET | `videoId`, `sort`, `continuation` |
| `/api/channel/{id}` / `/api/playlist/{id}` | GET | 一覧 + continuation |
| ~~`/api/stream/{id}`~~ | - | **保留**(iframe 再生ではストリーム URL を返さない。旧設計 = 解決結果の返却) |
| `/api/trend` | GET | トレンド(自前で取得。経路は **V6 の結果で確定**。旧案の「GitHub raw 自動更新 JSON」は**採用しない**) |
| `/api/bridge` | POST | 長い continuation(検索の続き・コメント等)用の中継 |
| ~~`/dl`~~ | - | **保留**(DL 専用 relay。旧設計 = §10.10 / DOWNLOAD_MECHANISM_RESEARCH.md) |

**輸送**:
- 同一オリジン: `https://<自ドメイン>/api/*`(Nginx が api コンテナへ転送)。CORS は**自ドメインのみ許可**
- 開発時: `apps/web` の dev サーバーから `/api` をローカル API へプロキシ(または相対パスのまま Nginx 経由)

### 10.7 再生設計(iframe・2026-09-23 改訂。P0 はスケルトン、P1 で実装)

1. **既定**: `https://www.youtubeeducation.com/embed/{id}?{params}` を **iframe** で表示(16:9・全画面対応)。
   しあTube 実装に合わせ、`enablejsapi=1` / `controls=1` / `playsinline=1` / `autoplay` / `widgetid` /
   `origin` / `forigin` を強制付与する(根拠 = `docs/research/SIATUBE_CODE_VERIFICATION.md`)
2. **埋め込み先は設定で差し替え可能**: 既定 = `youtubeeducation.com` / 代替 = 公式 embed
   (`youtube-nocookie.com` 等)。**到達性は V5 で確認する**(学校フィルタ次第 = 断定しない)
3. **Player API(YT.Player)は付加価値**: 取得できれば ended 検知・自動再生・リピートを有効化。
   **取得に失敗しても iframe は残す**(再生自体は成立する = しあTube 実装と同じ扱い)
4. **ブロック/不具合時**: 「公式 embed に切り替える」導線を提示する(埋め込みブロックは自動検知が
   難しいため、目視判断の導線 + 再読込みボタンを用意)
5. **画質・速度・字幕等は embed 側の UI に委ねる**(iframe 内は制御しない = プレイヤー実装を薄く保つ)
6. プレイヤー UX(自前): リピート / 自動再生(API 取得時)/ ミュート解除プロンプト / 読み込み表示


### 10.8 ダウンロード設計(**保留**・旧差別化機能)

> **2026-09-23 ユーザー決定で保留**(実装対象外)。以降の本文は 2026-09-13〜15 時点の設計記録であり、
> **再開時に参照するために保存**している(削除しない)。

**UX フロー**: 動画ページで「ダウンロード」→ シート(拡張子 **mp4 / webm** × 画質 144p〜4K × 音声のみ/動画のみ)→ **キューに追加**(複数可)→ 下段トレイ(Dexie 永続、ページ遷移で失われない)で逐次処理。進捗%(byte 基準)、一時停止/再開(リジェクト)、キャンセル、完了通知。

**フェーズ別パイプライン**(2026-09-13 確定。前提: googlevideo へのブラウザ直接 fetch は CORS で不可 = V2 実測。
詳細比較: [`research/DOWNLOAD_MECHANISM_RESEARCH.md`](../research/DOWNLOAD_MECHANISM_RESEARCH.md)):

**旧 GAS 期 — 方式 C(直リンクのみ)**(呼称は当時のもの = 参考):
```
720p 以下 muxed(itag 22/18 等)の直リンク → ブラウザネイティブで保存
(モバイル: メディアビューから「動画を保存」/ デスクトップ: タブから保存)
- fetch 系 DL(StreamSaver / muxer / 進捗UI)は GAS 期では非実装
  (CORS 不可 + GAS の ContentService はバイナリ/ストリーミング不向き)
- UX 縮小は承知済み: 進捗UI / ファイル名制御 / キューはなし(= 差別化機能は Phase B で成立)
```

**Phase B(自宅サーバー期)— 方式 A(主)+ B(補完)+ C(iOS/FF fallback)**:
```
[方式 A = 主経路(当初設計のまま・ユーザー承認済み)]
/api/stream から (video itag, audio itag) を選択
  → fetch(/dl?src=<videoUrl> / <audioUrl>) ×2   ← 自社サーバー(DL 専用 relay・ACAO 付き)
     ※ relay は DL 時のみ稼働。upstream 取得は Range チャンク付き(スロットリング回避)+
        required UA 付与可能(ブラウザ fetch のできないことに対応)+ host whitelist
  → Web Worker: mp4-muxer / webm-muxer
     (再エンコードを行わないため、FFmpeg 等による再エンコードより CPU 負荷を大幅に低減)
  → **StreamSaver.js(Service Worker 経由・SW は自ドメイン配信)**
     (巨大な Blob をメモリ上に保持することを避ける。
      メインスレッドは Worker の小バッファのみ保持し、ファイルは SW 側へ流す)
  → 進捗UI: %(受信バイト/総量 = 各ストリームの clen 合計)、速度、ETA、キャンセル(writer.abort)、レジューム(/dl の Range)

[方式 B = 補完(方式 A が不安定な場合: bot チェック・PO token 等)]
Dexie キュー → /jobs → yt-dlp でダウンロード+mux(再エンコードなし)→ 完成ファイルを Nginx 配信
  → クライアントは完成ファイルを fetch(静的・Range 完璧)→ StreamSaver / 通常 DL
  → 進捗は Content-Length 確定値で最も正確

[方式 C = iOS / Firefox フォールバック(StreamSaver は Chromium 系のみ)]
720p 以下 muxed 直リンク(方式 A/B が効かない環境で常に用意)
```

**拡張子 × コデック行列**(container は muxer の制約で決定):

| 選択 | 映像 | 音声 | muxer | 備考 |
|---|---|---|---|---|
| .mp4 | h264(itag 137/264 等) | aac(m4a: 140/251 相当) | mp4-muxer | 互換最優先 |
| .webm | vp9(248 等) / av1(313 等) | opus(251 等) | webm-muxer | 圧縮率優先 |
| 720p 以下 | muxed 直リンク(itag 22/18 等) | 同梱 | **muxer 不要** | 低スペック/iOS フォールバック。アンカーで直接 DL(ただし cross-origin 時は新タブ) |

**レジューム**: googlevideo の Range 対応を P3 冒頭で実測。offset は Dexie に保存、再開時は `Range: bytes=offset-`。

**メモリ予算**: 常時数十 MB(muxer のバッファのみ)。4GB 機で 1080p 50 分相当を連続で処理できることを E2E 目標とする。

### 10.9 サーバー構成の制約と設計(2026-09-23 改訂 = GAS 期を廃止)

| 制約・前提 | 設計上の影響 |
|---|---|
| 自宅回線からの**外向き HTTPS**(youtubei.js / InnerTube) | 出口 IP が GAS(Google DC)と異なるため、挙動が変わることがある → **V6 で確認**(断定しない) |
| youtubei.js は**ライブラリ**(プロセス内) | クライアントを**1 個生成して使い回す**(毎リクエストで作らない)。**メジャー更新で API が変わる**ため版を固定する(package.json の pin) |
| **レート制限(O9)** | キャッシュ(TTL = 対象別)+ リトライ+バックオフ + single-flight。**キャッシュ → YouTube 取得の順で、毎リクエストで叩かない** |
| **公開範囲** | 学校・自宅から到達できる必要がある(ドメイン / TLS / ポート公開)。設定は P00-E・§10.10・§10.12 |
| **認証なし前提**(まずは個人利用) | 公開範囲は最小にする。必要になったら Basic 認証 / IP 制限 / Cloudflare Tunnel 等を追加検討 |
| プロセス構成 | `nginx` + `api` の 2 コンテナ(**DB は置かない**。キャッシュはメモリ + 必要ならファイル) |
| 実行環境 | **Bun** で `apps/api` を実行(デプロイはイメージ固定)。品質ツールは vitest + biome(pnpm 管理) |

**旧 GAS 期の制約(参考・採用しない)**: UrlFetchApp の制限(URL 長 2000 字 / 50MB / ヘッダ設定可)/
doGet のみで CORS ヘッダ不可 / 実行 6 分・日次クォータ / **デプロイは旧版を配信し続ける(O5)** /
**`setMimeType` は enum のみ(O7)**。証跡 = `docs/research/VERIFICATION_P0.md`(V1・V3-a・V3-b・観察 O1〜O9)。

### 10.9.1 実行可否の検証リスト(P00-D/E と P1 冒頭で実施し §12 に結果を記録)

> **2026-09-23 更新(サーバー一本)**: V1〜V4 は**旧 GAS 期の証跡**(参考・実行不要)。
> **現行で実行するのは V5(ブラウザ側)と V6(サーバー側)**。キット = `verification/`(手順 = `verification/README.md`)。

| ID | 検証項目 | 方法 | 失敗時 |
|---|---|---|---|
| V1(参考) | GAS からのページ抽出 | **完了(第 1〜6 回 2026-09-13〜15)**: `/watch/` 抽出 = 成功(playability OK / 30 形式)/ **`/player` InnerTube = 3 ラウンド連続 dead → 使わない**。**抽出アルゴリズム(候補列挙 + 括弧バランス切片 + JSON.parse)はサーバー実装へ継承**。decipherer は保留 | - |
| V2(参考) | ブラウザ直接取得(CORS / Range / 期限 / codec) | 完了(第 1 回・2026-09-13・ユーザー Android): `<video>` 再生 OK / fetch 全 NG(**CORS 成立**)/ expire ≈5.9h | DL 保留のため参照情報 |
| V3(参考) | GAS からの Service Worker 登録 | GAS 非採用のため**対象外**(サーバー構成では SW は自ドメイン配信 = 通常の SW として扱える) | - |
| V4(参考) | iOS Safari の挙動 | **保留**(DL 再開時に実機確認) | - |
| **V5** | **iframe 到達性(ブラウザ側・必須)** | ユーザー実行キット(`verification/v5-browser-iframe-test.html`): ① `youtubeeducation.com/embed` の描画・再生 ② 公式 embed の到達性 ③ Player API 直接読込可否 ④ 広告/画質/ログインの目視 | NG なら方式再検討(`ask_user`)= 公式 embed のみ運用 / 直リンク再生の検討 など |
| **V6** | **InnerTube / youtubei.js の前提確認(必須・キット v2)** | ユーザー実行キット(`verification/v6-metadata-check.mjs`): ① youtubei.js の解決・クライアント生成(probe)② **InnerTube 生 fetch**(watch ページの API キー → `/player` → `/search`)③ youtubei.js の実機能(検索 / 動画 / チャンネル / プレイリスト / ホーム / トレンド / Live Chat)④ yt-dlp の有無(将来用の記録) | NG の部分は該当機能を**保留**し `ask_user` で相談(例: 検索が出ない → 検索を保留して視聴 + チャンネルから開始) |

### 10.10 自宅サーバー(本体構成・2026-09-23 改訂)

> **2026-09-23**: 「最初からサーバーを立てる」決定(D10)により、以前の「Phase B = 将来オプション」から
> **本体構成**へ変更した(DL を目的としていた部分は保留 = 下記)。

- **ホスト**: 自宅 **Proxmox VE(LXC/VM)**。**Docker Compose** で `nginx` + `api` を起動
- **公開**: ドメイン + **TLS**(取得方法は P00-E で確定。証明書自動更新 / Cloudflare Tunnel / 既存のリバースプロキシを候補として比較)
- **API**: `apps/api`(Bun + Hono)= **メタデータ解決のみ**(youtubei.js + O9)
- **youtubei.js**: 依存として固定(pnpm)。**更新はイメージ再ビルド + 動作確認**(メジャー更新は API 変更に注意)
- **運用**: 死活監視(`/api/health`)/ ログのローテーション / 更新手順 / バックアップ対象の整理(キャッシュは対象外)
- **保留(DL 関連・実装しない)**: `/dl` DL 専用 relay(方式 A)/ `/jobs` yt-dlp バッチ(方式 B)/
  StreamSaver 用 Service Worker / PO token 対策。再開時は `research/DOWNLOAD_MECHANISM_RESEARCH.md` を参照

### 10.11 UI/UX: Material 3 Design Expressive

- **トークン**: 色(primary/secondary/tertiary + container 系・on-* 群)、形状(Expressive の大 radii / squircle 感)、タイポ(強調の強いスケール)、Elevation/State。Tailwind `@theme` に M3 ロール名で写像し、Dark + Dynamic Color(壁紙連動は P3 以降)
- **画面**: ホーム(トレンド・登録) / **watch(プレイヤーをヒーローにした全画面 + 詳細 + 関連 + コメント)** / チャンネル / プレイリスト / 検索 / 設定(~~downloads(キュー管理)~~ = 保留)
- **GSAP ユースケース**(P1〜P3 へ):
  - ページ遷移(位置ベースの共有要素トランジション)
  - 動画カード → プレイヤーへのモーフ(形状変形)
  - リストのスタッガー表示・スケルトン → 本物のクロスフェード
  - ~~ダウンロードトレイの出し入れ(スプリング)~~ = 保留(DL 再開時)
- **アクセシビリティ**: M3 の state layer / contrast 準拠。`prefers-reduced-motion` で GSAP を無効化するトグルを必ず持つ

### 10.12 法的・運用

- しあTube 調査 §6 の前提を踏襲: 保存・再配信・再エンコードなし。利用規約グレーゾーンであることは承知の上、個人・教育利用規模を想定。
- **iframe 方式の位置づけ(2026-09-23 追記)**: YouTube 公式 embed の利用に近い形であり、署名 URL の
  再配布(直リンク)より露出が小さい(断定はしない)。公開時の免責文言は同じ方針で用意する。
- 免責文言をサイト内(設定画面)に明記。コンテンツ削除依頼への対応フローは P00-E(運用手順)で決める
- **自宅サーバーで公開する場合の追記(2026-09-23)**: ① **公開範囲**(誰でも / 知人のみ)を最初に決めて設定に
  反映する ② アクセスログは必要最小限にする(個人情報を増やさない)③ 連絡・削除依頼に応じられる連絡先を用意する
  ④ サーバーの所在が推測され得る点(ドメイン / IP)を認識しておく(Cloudflare Tunnel 等で軽減できる)

## 11. リスク・Gotchas

| ID | リスク | 影響 | 対処 |
|---|---|---|---|
| R1**(保留)** | signature deciphering の変更が頻発 | (直リンク再開時のみ問題) | **保留**。再開時は **yt-dlp を優先**(組込みで対応済み = D13) |
| R2 | bot チェック / PO token(高画質・大量アクセスで発生し得る) | メタデータ取得が失敗し得る | **youtubei.js の更新**(版の追従)+ **クライアント種別の切替**(`InnerTubeClient`)+ O9。**V6 で実挙動を確認**してから運用前提を決める |
| R3**(保留)** | googlevideo の CORS / UA / Range | (DL 再開時のみ) | **保留**(DL 再開時は自社サーバー経由 = 方式 A/B) |
| R4**(保留)** | iOS Safari の DL 制約 | (DL 再開時のみ) | **保留**(V4 = 参考) |
| R5 | **学校フィルタが自宅サーバーのドメインをブロック** | 対象環境で使えない | ドメインの選定(ブロックされにくい名前)/ 複数経路(Cloudflare Tunnel 等)を用意。**到達性は本人が使う環境で確認する**(断定しない) |
| R6 | 法的リスク(ToS) | 運営停止 | §10.12 の規律(保存・再配信なし・無名・小規模)。公開範囲を絞る |
| R7 | Next.js export の単一ファイル化の複雑さ | **任意**(ミラー配布用)。GAS 配布がなくなったため優先度は低い | `scripts/build-single-file.ts` は P1 以降の任意タスク。必要になった着手 |
| R8 | GAS の日次クォータ | **該当なし**(GAS 非採用) | 参考(旧計画の記録) |
| R9 | GAS の SW 配信が不可 | **該当なし**(サーバー構成では SW は自ドメイン配信) | 参考 |
| **R10** | **`youtubeeducation.com`(第三者ミラー)が学校フィルタでブロック / ミラー停止** | iframe 方式の根幹が崩れる | **V5 で到達性を確認**し、公式 embed への差し替え設定を用意(§10.7-2)。NG なら `ask_user` で方式再検討 |
| **R11** | **検索・トレンドの抽出が不可**(自宅 IP) | 検索 / ホームが作れない | **V6** で確認。不可なら該当機能を保留して `ask_user` で相談(視聴 + チャンネル + プレイリストから開始する案) |
| **R12** | **iframe 内の広告・ログイン要求・画質制限** | 体験の前提が変わる(「広告なし」を断定できない) | V5 の目視チェックで実挙動を記録してから UX を設計する |
| **R13** | **youtubei.js の破壊的更新・取得失敗**(YouTube 側 / ライブラリ側の変更) | メタデータ全般が縮退 | **版を固定**(package.json の pin)+ 更新手順(イメージ再ビルド)+ 失敗率の観測。**この場合は `ask_user`**(代替 = yt-dlp / ページ抽出の一時利用) |
| **R14** | **自宅サーバーの停止・回線断**(可用性) | サイト全体が停止 | 死活監視(`/api/health`)+ 復旧手順の文書化。静的アセットは Nginx 配信 = 依存を減らす |
| **R15** | **公開に伴うセキュリティ / IP 露出**(ポート公開・ドメイン) | 侵入・特定の懸念 | TLS + 最小構成コンテナ + 更新運用 +(必要なら)Cloudflare Tunnel / Basic 認証。公開範囲は §10.12 |

## 12. 実績と証拠(実装後に記入)

| ID | コミット | テスト | 実測値・備考 |
|---|---|---|---|
| P00-A | | | |
| P00-B | | | |
| P00-C | | | |
| P00-D | | | |
| P00-E | | | |
| P00-F | | | |
| V5 | | | 未実施(ブラウザ側 iframe 到達性) |
| V6 | | | 未実施(サーバー側メタデータ取得) |
