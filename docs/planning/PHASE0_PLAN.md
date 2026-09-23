# Phase 0: 基盤構築(Next.js スキャフォールド + GAS 後端 MVP + 全体アーキテクチャ確定)

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

「しあTube と同じ構成(静的フロントエンド + JSON 解決バックエンド)」の YouTube Proxy サイトを、以下を特徴として構築する:

1. **再生: iframe 埋め込み**(`https://www.youtubeeducation.com/embed/{id}` を既定・公式 embed に差し替え可能。**2026-09-23 改訂 = D1**)
2. **UI/UX: Material 3 Design Expressive**(表現力の高い形状・タイポグラフィ・動画)+ GSAP によるモーション
3. **スタック: Next.js(App Router)+ Tailwind CSS + Dexie.js** によりしあTube(Vue 静的版)より高機能に
4. **運用: 最初は GAS で動かし、クォータ等の制限にぶつかったら自宅サーバー(Proxmox/LXC)へ移行**(自宅サーバー = 将来オプション)

**動画ダウンロード機能は 2026-09-23 のユーザー決定で保留**(目標から除外。設計・調査は docs に保存 = §10.8)。
本フェーズ(P0)では、リポジトリ再編成とスキャフォールドを完了する。GAS 上の可行性は**検証済み(V1・第 1〜6 回 2026-09-13〜15)**: `/player` エンドポイントは GAS IP から不可 / **`/watch/` ページ抽出は可行(playability OK / 30 形式)** → **P00-D = watch ページ抽出によるメタデータ解決 + O9(リトライ/キャッシュ/single-flight)**。ストリーム URL の復号(decipherer)は**保留**(証跡: `docs/research/VERIFICATION_P0.md` / 実コード確認: `docs/research/SIATUBE_CODE_VERIFICATION.md`)。

## 3. 変更範囲 (Scope)

変更対象:
- リポジトリ再編成(cod-web 由来のゲーム関連ドキュメントは退避済み → 2026-09-21 にユーザー指示でリポジトリから削除・git 履歴にのみ残存)
- `apps/web`(Next.js)+ `packages/shared`(API client / types)+ `backend/gas`(GAS ソース)+ `scripts/`(単一 HTML ビルド)
- `docs/`(README 再編成、本計画書、新 task-list)

変更しない(境界外):
- 再生 UI の完成版(P2)、機能拡張(P4)、自宅サーバー実装(P5)は本フェーズの**設計のみ**含み、コードは置かない
- **動画ダウンロード機能は保留**(実装しない。旧設計 = §10.8 に保存)

## 4. 禁止事項

- 不明点は推測で埋めず、§7 の停止条件に従って質問する
- ~~サーバー側で映像・音声の結合(エンコード・ムキシング)をしない~~ = **DL 保留により当面対象外**(再開時に適用。表現規約は継続)
- **再生経路のサーバー中継をしない**(iframe 方式で確定 = 再生はブラウザ ↔ YouTube 系で完結)。
  DL 専用 relay は**保留**(旧設計 = §10.10 / DOWNLOAD_MECHANISM_RESEARCH.md 方式 A)
- YouTube 内部仕様の断定は、しあTube 調査・公式情報・実測の根拠がある場合のみとする
- コンテンツのサーバー側保存・二次配布・再配信をしない(法的境界、しあTube 調査 §6)

## 5. 完了条件 (DoD)

- [ ] `apps/web` が build 成功(`output: 'export'`)+ `scripts/` が単一 HTML を生成(inline 済み)
- [ ] `backend/gas` が GAS Webアプリとしてデプロイでき、`/`(単一 HTML)と `/api/health`・`/api/video`・`/api/search?q=...`(doGet クエリディスパッチ)が動作することを実測で確認(`/api/search` は **V5 で抽出経路の確定後**)
- [ ] **V3(保留項目の参考)**: GAS ページからの SW スクリプト配信・登録可行性の確認(PWA/オフライン再開時の判断材料。V3-a は実測済み)
- [ ] **V5(新規・必須)**: iframe 到達性(`youtubeeducation.com` / 公式 embed)と GAS からの検索・トレンド抽出の実環境確認(`verification/v5*`。結果 = `verification/Verification-Results.md`)
- [x] **GAS 検証(2026-09-15 完了・V1 第 1〜6 回)**: `/player` = GAS IP から不可(3 ラウンド連続 ERROR/UNPLAYABLE/400)/ **`/watch/` ページ抽出 = 可行**(playability OK / 30 形式 / 1080p(137)+audio(140)・desktop+mobile UA)/ ストリーム URL = 全 30 形式 `signatureCipher`(復号要 → **2026-09-23 に保留**)。**429 レート制限 = O9**(リトライ+バックオフ / CacheService キャッシュ / single-flight を実装)
- [ ] `packages/shared` の API client が GAS 輸送(クエリ / google.script.run)と fetch 輸送の両モードを持つ(vitest でユニットテスト)
- [ ] M3 Design Expressive のテーマトークン(Tailwind `@theme`)と 2 画面(ホーム / watch スケルトン)が整う
- [ ] `docs/task-list.md` の状態・証拠を更新
- [ ] タスク範囲外のファイルに意図しない変更がない

## 6. テスト方法

| 層 | 実施 | 確認内容 |
|---|---|---|
| Unit (vitest) | packages/shared | API client の URL 構築・レスポンス正規化・エラーコード分類 |
| Build | apps/web | `next build` が成功し `out/` が生成される |
| 単一 HTML | scripts | 生成物が 1 ファイル(CDN 依存なし・オフラインで画面が出る) |
| 実環境(GAS) | script.google.com でデプロイ | /, /api/health, /api/video, /api/search(V5 で経路確定後)が実データ返却。実行時間・クォータ観察。SW 登録(V3)= 保留 |
| 実環境(ブラウザ) | Chrome / iOS Safari | 単一 HTML の表示 + **iframe プレイヤーの描画・再生**(V5 で先行確認)、エラー表示の正常性 |

## 7. 停止条件

次の場合は作業を停止し、変更せず報告する:
- 計画書・しあTube 調査・AGENTS.md 同士に矛盾がある
- task-list.md 記載の変更範囲を超える変更が必要
- 破壊的変更が必要
- ユーザー判断が必要な設計論点に到達した(例: youtubei.js の GAS 不適合時のフォールバック選択)
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
| P00-A | リポジトリ再編成 | cod-web 文書の退避(2026-09-21 にリポジトリから削除・git 履歴にのみ残存)、新 `docs/README.md`・`docs/task-list.md`、トップ README 更新 | - |
| P00-B | web スキャフォールド | `apps/web`(Next.js App Router, `output:'export'`, Tailwind v4, GSAP 導入, M3 トークン, ルータ骨格) | A |
| P00-C | shared パッケージ | `packages/shared`(API client 双方向輸送、types、定数、エラー分類)+ vitest | A |
| P00-D | GAS 後端(メタデータ) | `backend/gas`(doGet ディスパッチ、/api/health・video・search(V5 確定後)・channel・playlist・comments、**watch ページ抽出 = メタデータ解決**、**O9: リトライ+バックオフ / キャッシュ / single-flight**。**decipherer は実装しない = 保留**) | A,C |
| P00-E | 単一 HTML ビルド + GAS デプロイ | `scripts/build-single-file.ts`(Next export → inline → 単一 HTML)、GAS デプロイ手順書。SW ディスパッチは**保留**(PWA/オフライン用) | B,D |
| P00-F | M3 Expressive 基線 | テーマ(色/形状/タイポ)、ホーム + watch スケルトン、GSAP トランジション 1 種 | B |

---

## 10. 設計詳細・仕様

### 10.1 位置づけ・対象

- しあTube と**同じ需要構造**(学校のフィルタ回避・アカウント不要・広告なし・高画質)に、**ダウンロード機能と M3 Design Expressive の UI** で差別化する
- 視聴側は YouTube 正規コンテンツの私的使用(日本著作権法第30条圏)を前提。運営は保存・再配信・再エンコードをしない(§4)
- 対象環境: 学校の Chromebook/Windows(低スペック、4GB RAM 相当)、スマホ(Chrome/Safari)。デスクトップは任意

### 10.2 全体アーキテクチャ(2フェーズ)

```
┌────────────────────────── Phase A: GAS(現在・MVP) ───────────────────────────────┐
│  [学校LAN] ──HTTPS──▶ script.google.com/macros/s/<id>/exec   (GAS Web アプリ)     │
│      doGet(e) が 2 役: 1) 単一 HTML 配信(Next.js export + inline)                │
│                        2) ?api= クエリディスパッチ / google.script.run RPC        │
│      ▼ (UrlFetchApp = サーバー間通信、CORS 不要)                                  │
│   youtube.com /watch/ ページ抽出(desktop UA + ja-JP)                             │
│      → JSON(メタデータのみ: タイトル/投稿者/長さ/サムネイル/関連)                 │
│      ※ ストリーム URL は取得・返却しない(iframe 再生では不要)                   │
│      ※ 検索・トレンドの抽出経路 = 未検証(V5 で確認後に実装)                     │
│                                                                                   │
│  [ブラウザ] 再生: iframe ─▶ https://www.youtubeeducation.com/embed/{id}?{params}  │
│        (ブラウザ ↔ YouTube 系で完結 = 再生にサーバーは関与しない)                 │
└───────────────────────────────────────────────────────────────────────────────────┘

┌────────── Phase B: 自宅サーバー(将来オプション・DL 保留に伴い再定義) ───────────┐
│  Nginx(https) ─▶ Bun/Hono(メタデータ解決の強化・キャッシュ)                       │
│                 ─▶ 静的配信(Next.js export)                                      │
│  再生: 同じ iframe 方式(サーバー関与なし)                                        │
│  (旧 DL 設計 = 方式 A/B/C・relay・Service Worker は**保留**)                      │
└───────────────────────────────────────────────────────────────────────────────────┘
```

**設計原則(ユーザー定義・絶対表現は禁止)**:
1. **サーバー側で動画データを中継・変換しない限り**、動画処理に伴う CPU/メモリ負荷を最小化できる(サーバーの役割 = 解決のみ: 署名 URL + メタ。**例外: 自宅サーバー期の DL 専用 relay(方式 A)はダウンロード発生時のみのバイトポンプで、再生経路には関与しない** = 2026-09-13 ユーザー承認)
2. **StreamSaver.js 等のストリーミングダウンロード機構を利用し**、巨大な Blob をメモリ上に保持することを避ける
3. **再エンコードを行わないため**、FFmpeg 等による再エンコードより CPU 負荷を大幅に低減できる
4. **ブラウザからの直接取得可否(CORS、Range、URL 有効期限、codec/container 対応等)を検証した上で利用する**。「生 URL を返せば再生できる」は前提にしない(検証 = V1〜V4、§10.9)

### 10.3 AI 推奨構成文書への修正点(本設計の根拠)

> **2026-09-23 追記**: C1〜C7 は 2026-09-13〜15 時点の設計記録。**再生 = iframe(D1 改訂)・DL = 保留**に
> より、再生/DL に閉じた判断(C1・C2・C5・C6・C7)は**当面適用しない**。直リンク/DL 再開時に参照する。

| # | 推奨文書の記述 | 修正 | 根拠 |
|---|---|---|---|
| C1 | 再生は MSE / dash.js / shaka-player | **DASH 再生は MSE 不要**。ネイティブ `<video>`(映像)+ `<audio>`(音声)の**2 要素シンクロ**で再生する(しあTube StreamType2 が実証済み)。fetch を経由しない経路でメモリ負荷が最小。MSE 系(dash.js/shaka)は後日の拡張候補のみ。**m3u8(ライブ)のみ hls.js**。いずれの経路もブラウザ直接取得可否は V2 で検証した上で利用 | しあTube 調査 §5.6(実コード読了) |
| C2 | 「GAS で動かし CORS が出たら移行」 | **V2 実測で確定(2026-09-13)**: googlevideo への `fetch()` は全 NG / `<video>` 再生は OK = CORS(ACAO 欠如)が成立。Piped 運用 issue(#3211)の同種実証・Invidious/Piped のサーバー中継実務も佐证。→ ブラウザ直接 fetch の DL は全フェーズで不可。**DL = 自社サーバーからの取得**(Phase B: 方式 A の DL 専用 relay / 方式 B の完成ファイル。GAS 期: 直リンクのみ) | V2 実測(VERIFICATION_P0.md) + Piped issue #3211 + Invidious/Piped 実務 |
| C3 | 「バックエンド(GAS / Next.js API)が JSON を返す」(fetch 前提) | **GAS は CORS ヘッダを設定できない + POST に対応しない(doGet のみ)**。よって GAS フェーズの API は**同一オリジン**(doGet のクエリ引数ディスパッチ / google.script.run RPC)で必須。`fetch('/api/...')` は Phase B 専用。API client は**双方向輸送**を先に抽象化する | GAS 仕様(公式ドキュメントの既知制限) |
| C4 | 「YouTubei.js 等のライブラリ」 | **V1 検証済み(2026-09-15)**: GAS フェーズ = **`/watch/` ページ抽出 + signature deciphering**(raw InnerTube / UrlFetchApp 経路・第三者 API 依存なし = D2 の自前実装方針を維持)。GAS 後端に youtubei.js ランタイムは不要(`player` InnerTube 経路は GAS IP から不可 = 3 ラウンド検証)。**yt-dlp は Phase B(自宅サーバー)専用**(復号・PO token 対応・堅牢性のため)。しあTube 生産版(v2.x)は yt-dlp ベース | しあTube 調査 §5.4/5.5 + V1 証跡(VERIFICATION_P0.md) |
| C5 | (未言及) | API が返す `httpHeaders`(カスタム UA 等)は**ブラウザの fetch では上書き不可**。高画質 DASH の fetch(ダウンロード)が UA を要求されれば失敗し得る。対処: 実測で確認、失敗時は Phase B の relay がヘッダを付与 | しあTube 調査 §5.5(実測レスポンスに httpHeaders 存在) |
| C6 | StreamSaver.js を採用(**ダウンロードの主経路**) | 指示どおり主経路に据える(= 方式 A / B での保存機構)。**SW の配信は Phase B(自宅サーバー・自ドメイン)= 制約なし**。GAS 期は DL が直リンクのため **StreamSaver は不使用**(2026-09-13 設計確定)→ 旧案「GAS が SW を配信」は不要になった。V3(GAS からの SW 配信)は**参考**(PWA/オフライン機能の将来判断)。**注意: StreamSaver は実質 Chromium 系のみ**(Safari/Firefox 非対応・公式)→ iOS/FF は常に直リンクフォールバック(方式 C)。フォールバック順: StreamSaver → FSA(Chromium)→ 直リンク | StreamSaver 公式(機構・対応表)・DOWNLOAD_MECHANISM_RESEARCH.md |
| C7 | (未言及) | 署名 URL の **`ip=` 束縛**。**V2 第 1 回で解決(2026-09-13)**: 解決元 IP(118.151.x)の URL が別 IP(ユーザー Android)で `<video>` 再生 OK = 再生経路では IP 縛りなし。_expire 失効(≈6h、O2)時の再解決_チェーンは防御として維持 | V2 実測(VERIFICATION_P0.md) |

### 10.4 スタック決定

| 層 | 採用 | 理由 |
|---|---|---|
| フロントエンド | **Next.js(最新安定版, App Router, React 19, `output: 'export'`)** | 指定。静的 export が GAS/単一 HTML 配布と相性良い |
| スタイリング | **Tailwind CSS v4**(`@theme` で M3 トークン) | 指定。M3 Design Expressive のトークン運用と親和 |
| 動画 | **GSAP 3.13(+ ScrollTrigger 任意)** | 指定。ページ遷移・モーフ・スタッガー |
| ローカル永続化 | **Dexie.js 4**(IndexedDB) | 履歴・設定・購読(**DL キューは保留**) |
| 再生 | **iframe 埋め込み**(`https://www.youtubeeducation.com/embed/{id}` 既定・公式 embed に差し替え可能) | D1 改訂(2026-09-23)。直リンク / hls.js / MSE は**保留** |
| ダウンロード | **保留**(実装対象外・2026-09-23 ユーザー決定) | 旧設計(muxer / StreamSaver / FSA / 直リンク)は §10.8 に保存 |
| バックエンド(GAS) | **`/watch/` ページ抽出によるメタデータ解決** + **O9**(リトライ+バックオフ / CacheService キャッシュ / single-flight) | C4, V1 検証。**decipherer は保留**。検索系 = V5 で検証 |
| バックエンド(自宅) | **Bun + Hono + Nginx** | **将来オプション**(DL 保留に伴い yt-dlp は保留) |
| 言語・品質 | TypeScript, biome, vitest | 元リポジトリ由来の流儀(AGENTS.md §6.1 で固定) |
| パッケージ管理 | pnpm(workspaces) | 単一リポジトリ内 `apps/` + `packages/` |

### 10.5 リポジトリ構成

```
ytdl/
├── apps/
│   └── web/                  # Next.js (App Router, output:'export')
│       ├── src/app/          # /, /watch, /channel, /playlist, /search, /settings(downloads は保留)
│       ├── src/features/     # play / search / subs ... (機能別。download-queue は保留)
│       ├── src/components/   # M3 Design Expressive コンポーネント
│       └── public/
├── packages/
│   ├── shared/               # API client(双方向輸送)+ types + itag/codec 定数 + エラー分類
│   └── ui/                   # (P4 以降) 共有 M3 コンポーネント
├── backend/
│   ├── gas/                  # GAS ソース: index.doGet, api/*.js, resolver/(watch 抽出 + decipherer)
│   └── home/                 # (P5・将来オプション) Bun/Hono + nginx.conf(旧: yt-dlp + /dl relay + sw は保留)
├── scripts/
│   └── build-single-file.ts  # Next export → JS/CSS inline → 単一 HTML(GAS 用)
└── docs/                     # arch(後日新規) / planning / research / task-list
```

### 10.6 API v1(エンドポイント設計)

しあTube 調査 §5.3 の実測形状を踏襲する(メタデータ中心)。**DL 需要のためのフィールドは保留**
(`/api/stream`・`/dl` は実装しない。旧設計は git 履歴 + DOWNLOAD_MECHANISM_RESEARCH.md に保存)。

| エンドポイント | 方法 | 説明 |
|---|---|---|
| `/health` | GET | `{"status":"ok"}` + バージョン |
| `/api/search` | GET | `q`, `token`(continuation) |
| `/api/suggest/` | GET | `keyword` |
| `/api/video/{id}` | GET | メタ + related(continuation)。埋め込み depth 形式は必要なら導入 |
| `/api/comments` / `/api/comment/replies` | GET | `videoId`, `sort`, `continuation` |
| `/api/channel/{id}` / `/api/playlist/{id}` | GET | 一覧 + continuation |
| ~~`/api/stream/{id}`~~ | - | **保留**(iframe 再生ではストリーム URL を返さない。旧設計 = 解決結果の返却) |
| `/api/trend` | GET | (任意)GitHub raw 自動更新 JSON 方式(shiatube 調査 §5.4) |
| `/api/bridge` | POST(Phase B) / RPC(GAS) | 長い continuation 用中継 |
| ~~`/dl`~~ | - | **保留**(DL 専用 relay。旧設計 = §10.10 / DOWNLOAD_MECHANISM_RESEARCH.md) |

**輸送**:
- GAS: 同一オリジン `?api=<path&query>` ディスパッチ(URL 長上限 ~1.8KB 超は google.script.run RPC)
- Phase B: 通常 `fetch`(CORS ヘッダ付き)

### 10.7 再生設計(iframe・2026-09-23 改訂。P0 はスケルトン、P2 で実装)

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

**Phase A(GAS 期)— 方式 C(直リンクのみ)**:
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

### 10.9 GAS フェーズの制約と設計

| 制約 | 設計上の影響 |
|---|---|
| doGet のみ(POST 不可)・CORS ヘッダ不可 | API は同一オリジン `?api=` ディスパッチ + google.script.run RPC。§10.6 |
| UrlFetchApp: URL 長 2000 字 / 1 リクエスト 50MB / ヘッダ UA 設定可 | 長い continuation は RPC 経由。UA・Sec-* は addHeaders で再現(shiatube v1 と同じ手法) |
| 実行時間 6 分 / CPU 10K ms / 日次クォータ(約 6 万ユニット) | 解決は軽量(JSON のみ)だが、**公開運用では日次クォータが移行トリガー**の筆頭 |
| 静的ファイル/SW 配信ができない | SW 配信は**保留**(`?_sw=1` → `MimeType.JAVASCRIPT` = V3-a 実測済み。PWA/オフライン再開時に参照) |
| V8 サンドボックス | **V1 検証済み(2026-09-15)**: watch ページ抽出 + 復号経路を採用(GAS V8 の UrlFetchApp + 文字列処理で成立・特殊依存なし) |

### 可行性検証リスト(P00-D/E と P2 冒頭で実施し §12 に結果を記録)

> **2026-09-23 更新**: V1〜V4 は完了/保留の記録。**次に実施するのは V5**(iframe 到達性・
> 検索/トレンド抽出。キット = `verification/v5*`)。

| ID | 検証項目 | 方法 | 失敗時 |
|---|---|---|---|
| V1 | ✅ 完了(第 1〜6 回 2026-09-13〜15): `/player` = GAS IP から不可(×3 ラウンド)/ **`/watch/` 抽出 = 可行**(30 形式・1080p+140)/ ストリーム URL = 全 signatureCipher(復号要)/ 429 = **O9** | **採用経路 = watch 抽出(メタデータ解決)**。decipherer は**保留**(iframe 再生ではストリーム URL を使わない) | 検索系が不可なら: V5 の結果で判断(自宅サーバー移行 or 経路再設計) |
| V2 | googlevideo のブラウザ直接取得: **CORS(ACAO 有無)・Range・URL 有効期限・codec/container・UA 依存** | **完了(第 1 回・2026-09-13・ユーザー Android 環境)**: `<video>` 再生 **OK** / fetch 全 NG(**CORS=最有力**) / expire ≈5.9h / O3(他 IP 再生)解決 → **DL は直接 fetch ではなく自社サーバー経由(方式 A/B)**。v2b(確定テスト)はユーザー判断でスキップ | - |
| V3 | GAS ページからの **Service Worker 登録**(doGet ディスパッチ + JAVASCRIPT MIME + scope `/macros/s/<id>/`) | **参考(DL には不要)**: GAS 期の DL が直リンクのため StreamSaver 不使用 → 重要性は PWA/オフライン機能の判断材料に降格。キットは `verification/v3b-gas-test.gs`(enum 修正版)で用意済み。GAS 制約: setMimeType は `MimeType` enum のみ(O7) | - |
| V4 | iOS Safari の挙動(SW 経由の DL トリガ、FSA 無、新タブ動作) | **保留**(DL 再開時に実機テスト) | 720p muxed 直リンク方針を iOS 既定に(保留) |
| **V5** | **iframe 到達性 + メタデータ抽出(新規・必須)** | ユーザー実行キット(`verification/v5-browser-iframe-test.html` / `v5b-gas-test.gs`)。① `youtubeeducation.com/embed` の描画・再生 ② 公式 embed の到達性 ③ Player API 直接読込可否 ④ GAS からの検索・トレンド抽出 ⑤ embed の広告/画質/ログイン挙動 | NG なら方式再検討(`ask_user`)= 公式 embed のみ運用 / 自宅サーバー移行 など |

### 10.10 自宅サーバー フェーズ(Phase B / P5・**将来オプション**)

> **2026-09-23 追記**: DL 保留に伴い主目的(relay / yt-dlp)が外れたため**将来オプション**に再定義。
> 以降の本文は旧設計の記録(再開時に参照)。

- **構成**: Proxmox VE / LXC + Bun(Hono)+ Nginx(TLS)+ 静的配信 + yt-dlp(子プロセス、`--js-runtimes` 対応)
- **追加機能**(DL 設計は 2026-09-13 ユーザー承認済み: A 主 + B 補完 + C fallback):
  1. CORS ヘッダ付き `/api/*`(通常の fetch で完結)
  2. **StreamSaver 用 Service Worker**(自ドメイン)
  3. **`/dl` ダウンロード専用 relay(方式 A = DL 主経路)**: **ダウンロード発生時のみのオンデマンド稼働・再生経路には一切使用しない**。host whitelist(googlevideo 系)・upstream は Range チャンク付き(スロットリング回避)・required UA 付与(C5)・返却は ACAO / Content-Length / Content-Disposition / Accept-Ranges。負荷 = バイトポンプのみ(低 CPU・ディスク不使用)
  4. **`/jobs` yt-dlp バッチ(方式 B = 補完)**: 方式 A が不安定になった場合(bot チェック / PO token 等)に、ダウンロード+mux(再エンコードなし)→ 完成ファイルを Nginx 配信(Range / Content-Length 確定)
  5. PO token / bot チェック対策(yt-dlp の solver。`WEB_EMBEDDED_PLAYER` を中心に)
- **移行トリガー**(推奨文書 §4 + 調査 §8.2 より): googlevideo 直結ブロック検出 / GAS クォータ到達 / PO token 必須化 / SW・CORS 要件 / 規模拡大

### 10.11 UI/UX: Material 3 Design Expressive

- **トークン**: 色(primary/secondary/tertiary + container 系・on-* 群)、形状(Expressive の大 radii / squircle 感)、タイポ(強調の強いスケール)、Elevation/State。Tailwind `@theme` に M3 ロール名で写像し、Dark + Dynamic Color(壁紙連動は P4 以降)
- **画面**: ホーム(トレンド・登録) / **watch(プレイヤーをヒーローにした全画面 + 詳細 + 関連 + コメント)** / チャンネル / プレイリスト / 検索 / 設定(~~downloads(キュー管理)~~ = 保留)
- **GSAP ユースケース**(P2〜P4 へ):
  - ページ遷移(位置ベースの共有要素トランジション)
  - 動画カード → プレイヤーへのモーフ(形状変形)
  - リストのスタッガー表示・スケルトン → 本物のクロスフェード
  - ~~ダウンロードトレイの出し入れ(スプリング)~~ = 保留(DL 再開時)
- **アクセシビリティ**: M3 の state layer / contrast 準拠。`prefers-reduced-motion` で GSAP を無効化するトグルを必ず持つ

### 10.12 法的・運用

- しあTube 調査 §6 の前提を踏襲: 保存・再配信・再エンコードなし。利用規約グレーゾーンであることは承知の上、個人・教育利用規模を想定。
- **iframe 方式の位置づけ(2026-09-23 追記)**: YouTube 公式 embed の利用に近い形であり、署名 URL の
  再配布(直リンク)より露出が小さい(断定はしない)。公開時の免責文言は同じ方針で用意する。
- 免責文言をサイト内(設定画面)に明記。コンテンツ削除依頼への対応フローは P5 で決める

## 11. リスク・Gotchas

| ID | リスク | 影響 | 対処 |
|---|---|---|---|
| R1**(直リンク保留)** | **signature deciphering アルゴリズムは変更が頻発**(YouTube の player JS が更新されると transform が変わる) | Phase A の解決が断絶し得る | decipherer は小規模更新を前提に分離実装(P00-D)。**Phase B = yt-dlp が組込み済み**。Phase A が壊れたら = 移行トリガー(R8 と併記) |
| R2 | bot チェック / PO token(Google IP でも高画質で発生し得る) | 1080p 解決失敗 | embedded client 中心、失敗時のフォールバック画質、Phase B で yt-dlp |
| R3**(DL 保留)** | googlevideo の CORS / UA / Range が想定と異なる | ダウンロード経路が縮小 | **CORS は確定済み(V2: fetch 不可)** = DL は自社サーバー経路(方式 A/B)へ転換済み。UA / Range は `/dl` relay で対処可能(required UA 付与可・Range チャンク)。Phase B 冒頭で relay の実挙動を実測 |
| R4**(DL 保留)** | iOS Safari(FSA 無、SW 経由の DL トリガも不安定) | iOS で高画質 DL が不可になり得る | 720p muxed 直リンク(新タブ)フォールバック(V4 実測で iOS 既定を確定) |
| R5 | 学校フィルタが script.google.com もブロックする | 製品が成立しない環境 | 対象学校の前提を明記。CF Workers / Pages 等への別経路配布を後日検討 |
| R6 | 法的リスク(ToS) | 運営停止 | §10.12 の規律。shiatube より露出を抑える(無名・小規模) |
| R7 | Next.js export の単一ファイル化(JS/CSS inline)の複雑さ | GAS 配布が煩雑化 | scripts/build-single-file.ts を P00-E で早期実装。代替は「GitHub Pages 版 + GAS が fetch して中継」(shiatube 方式) |
| R8 | GAS の日次クォータ | 公開利用で停止 | P0 からモニタリング(使用量ログ)。超過 = 移行トリガー |
| R9 | GAS の SW 配信(V3)が不可 | **保留**(PWA/オフラインの判断材料) | 参考検証(v3b)。再開時に参照 |
| **R10** | **`youtubeeducation.com`(第三者ミラー)が学校フィルタでブロック / ミラー停止** | iframe 方式の根幹が崩れる | **V5 で到達性を確認**し、公式 embed への差し替え設定を用意(§10.7-2)。NG なら `ask_user` で方式再検討 |
| **R11** | **GAS IP からの検索・トレンド抽出が不可** | 検索/ホームが作れない | **V5**(`v5b-gas-test.gs`)で確認。不可なら自宅サーバー移行 or 経路再設計 |
| **R12** | **iframe 内の広告・ログイン要求・画質制限** | 体験の前提が変わる(「広告なし」を断定できない) | V5 の目視チェックで実挙動を記録してから UX を設計する |

## 12. 実績と証拠(実装後に記入)

| ID | コミット | テスト | 実測値・備考 |
|---|---|---|---|
| P00-A | | | |
| P00-B | | | |
| P00-C | | | |
| P00-D | | | |
| P00-E | | | |
| P00-F | | | |
