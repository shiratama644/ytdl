---
name: tech-stack
description: ytdl のスタック（pnpm / Next.js export / Tailwind v4 / GSAP / Dexie / Bun + Hono API + youtubei.js / Docker Compose + Nginx / iframe 再生）の使いどころと実測ハマり。実装時に参照。仕様の正本は docs/。
---

# Tech Stack Skill — ytdl の技術構成を使いこなす

> **スキル**: 「どのライブラリをどこでどう使うか」と、このリポジトリで**実測で踏んだ地雷**。
> 設計の正本は [`../../../docs/planning/PHASE0_PLAN.md`](../../../docs/planning/PHASE0_PLAN.md)（§10.4 スタック）。
> Vite / R3F / Babylon のスタック知識（元リポジトリの別プロジェクト由来）は**本プロジェクトでは使わない**。
> **Bun は API ランタイムとして使う**（D10）が、元プロジェクトの bun 固有ノウハウは流用しない。

## スタック（確定・PHASE0_PLAN §10.4）

| 層 | 使うもの | 使わない / 注意 |
| :--- | :--- | :--- |
| パッケージ管理 | **pnpm (workspaces)** | **依存管理に bun/npm を使わない**（Bun は API の実行のみ。ロックは `pnpm-lock.yaml`） |
| フロントエンド | **Next.js（App Router、`output:'export'`）** | サーバー依存の機能（API routes / SSR 実行時）= 静的 export と相性悪い |
| スタイリング | **Tailwind CSS v4**（`@theme` で M3 トークン） | M3 ロール名でトークンを写像（PHASE0_PLAN §10.11） |
| モーション | **GSAP 3.13**（ScrollTrigger 任意） | `prefers-reduced-motion` 無効化トグルは必須 |
| 永続化 | **Dexie.js 4**（IndexedDB） | localStorage 主体でなく履歴・設定等は IndexedDB（**DL キューは保留**） |
| 再生 | **iframe 埋め込み**（`youtubeeducation.com/embed` 既定・公式 embed 差し替え可。`enablejsapi`/`controls`/`playsinline` 等を強制付与） | 直リンク DASH / hls.js / MSE = **保留**（D1 改訂 2026-09-23） |
| ~~DL muxer~~ | **保留**（mp4-muxer / webm-muxer = docs に保存） | 再開時のみ参照 |
| ~~DL 保存~~ | **保留**（StreamSaver / FSA / 直リンク = docs に保存） | 再開時のみ参照 |
| **API ランタイム** | **Bun + Hono**（TypeScript。`apps/api`） | Node 専用 API（`fs` の一部等）に依存しない / 依存管理は pnpm のまま（ランタイムだけ Bun） |
| **メタデータ解決** | **youtubei.js（InnerTube クライアント）**+ O9 | **クライアントをプロセスで 1 個使い回す**（毎リクエストで生成しない）。**ストリーム URL は返さない** |
| **リバースプロキシ / TLS** | **Nginx**（静的配信 + `/api/*` 転送 + 証明書） | アプリ側で TLS を持たない / 直接 api ポートを公開しない |
| **配備** | **Docker Compose**（nginx + api）+ 自宅 **Proxmox(LXC/VM)** | **youtubei.js は版を固定**（pin）。更新はイメージ再ビルド + 動作確認 |
| ~~GAS バックエンド~~ | **採用しない**（D10・2026-09-23）。実測知見のみ下記に保存 | GAS 固有の制約（UrlFetchApp / doGet / 6 分 / enum のみ）を持ち込まない |
| 品質 | TypeScript（strict）/ **biome** / **vitest** | ESLint/Prettier / `bun test` |

## メタデータ取得（サーバー側 = `apps/api` の核心。**youtubei.js**）

### 主経路 = youtubei.js（D11 改訂・2026-09-23 ユーザー指示）

- **現段階の YouTube クライアントは youtubei.js のみ**（ユーザー指示 2026-09-23）。
  **yt-dlp は将来のダウンロード機能の担当**（D13。現段階では導入しない）。
- `Innertube.create({ lang: 'ja', location: 'JP' })` を**プロセスで 1 個**生成して使い回す（毎リクエストで作らない）。
  - `search(q, { type })` / `getSearchSuggestions` / `getInfo` / `getBasicInfo` / `getComments` / `getChannel` /
    `getPlaylist` / `getHomeFeed` など（`youtubei.js@18.1.0` の型定義で確認済み）。
  - **Live Chat** = `getInfo(id).getLiveChat()`。**トレンド**（`/feed/trending` 相当）は専用メソッドが見当たらないため
    `yt.actions.execute('/browse', { browseId: 'FEtrending' })` を使う想定（**できるかは V6 で確認**）。
  - クライアント種別は `InnerTubeClient`（`WEB` 既定 / `MWEB` / `ANDROID` / `IOS` / `TV` / `WEB_EMBEDDED` など）で切替できる。
- **オフラインでクライアント生成できる**（`generate_session_locally: true` / `retrieve_player: false` /
  `retrieve_innertube_config: false` = 2026-09-23 実測 73 ms）→ **ネットワーク不要のユニットテストが書ける**。
- **版は固定する**（メジャー更新で API が変わり得る）。更新はイメージ再ビルド + 動作確認。
- **返すのはメタデータのみ**。**ストリーム URL は取得・返却しない**（iframe 再生では不要）。復号もしない。
- **実ネットワークの可否 = V6 待ち**（自宅回線から InnerTube が通るか）。結果を見ずに運用前提を断定しない。

> **将来（DL 再開時）の主経路 = yt-dlp**（D13）: `yt-dlp --dump-single-json` を子プロセスで実行する形は
> **タイムアウトと同時実行数の上限**を必ず設け、更新はイメージ再ビルドで行う（設計は docs/planning に保存）。

### ~~フォールバック = ページ抽出~~ = **実装しない**（証跡として保存・参照実装 = `verification/v1f-gas-test.gs`）
> **2026-09-23 追記**: D11 改訂により**現段階では実装しない**。**将来 yt-dlp / 抽出を再検討する時の手順**として残す（アルゴリズム自体は V1-d で実証済み = VERIFICATION_P0.md）。

1. **取得**: `https://www.youtube.com/watch?v=<id>&hl=ja&gl=JP` を desktop UA +
   `Accept-Language: ja-JP` で取得する（サーバー = `fetch`。旧 GAS では `UrlFetchApp.fetch(muteHttpExceptions: true)`）。
2. **抽出**: 代入文 `ytInitialPlayerResponse\s*=\s*\{`（検索・トレンドは `ytInitialData`）を正規表現で
   **全候補列挙**（初回出現は `WIZ_global_data` 内の偽構文に当ることが実測あり）→ 括弧バランス切片
   （`balancedSlice`）→ `JSON.parse` → 期待キーを持つ実レスポンスを採用。
   （旧 GAS 期の記録。**現行構成では使わない**）。
3. **~~decipherer~~ = 保留（2026-09-23）**: formats は**全形式 `signatureCipher`**（`url` フィールドなし = 実測 v1f）。
   形式 = `s=<cipher>&sp=sig&url=<URL エンコード済みの videoplayback URL>`（base URL には
   `expire`/`ei`/`ip=` が既に含まれる = 欠落するのは署名のみ）。
   復号 = **youtube-dlp 型 signature transform 逆変換**: watch ページの player JS から transform
   関数群を抽出 → `s` に逆順適用 → `decode(url) + &sig=<復号値>`。
4. **O9（必須）**: 429/5xx のリトライ+バックオフ / **キャッシュ（TTL = 対象別）** / 同一対象の single-flight。
   優先順位 = **キャッシュ → （TTL 切れなら）YouTube 取得**（毎リクエストで叩かない）。
   （429 は旧 GAS 期に ~13 回/時で実発生 = O9 記録。自宅回線での実挙動は V6 で確認する）

### 旧 GAS 期の制約（参考・採用しない。実測・AGENTS.md §6.3）

- **doGet のみ**（POST 不可）+ CORS ヘッダ不可 → API は**同一オリジン** `?api=<path&query>`
  ディスパッチ（URL 長上限 ~1.8KB。超える continuation は `google.script.run` RPC）。
- `UrlFetchApp`: URL 長 2000 字 / 1 リクエスト 50MB / UA は `addHeaders` で設定可。
- **`setMimeType` は `ContentService.MimeType` 列挙型のみ**（String は例外を投げる = O7・実測 2 回）。
- 実行時間 6 分 / CPU 10K ms / 日次クォータ（公開運用の移行トリガー筆頭 = R8）。
- **デプロイは旧バージョンを配信し続ける** → ユーザー検証は常に**新しいプロジェクト**で。
- **`/player` InnerTube エンドポイントは GAS IP から dead**（3 ラウンド連続・ERROR/UNPLAYABLE/400）
  → **使わない・再テストしない**。
- 静的ファイル/SW 配信は不可 → 必要なら doGet で配信（`?_sw=1` → `MimeType.JAVASCRIPT`、V3 参考）。

## iframe 再生（D1 改訂 2026-09-23・しあTube 実コード確認済み）

- **URL**: `https://www.youtubeeducation.com/embed/{videoId}?{params}`（16:9 の親要素に追従させる）。
  `allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"` /
  `allowfullscreen` / `referrerpolicy="strict-origin-when-cross-origin"` を付ける。
- **強制パラメータ**: `enablejsapi=1` / `controls=1` / `playsinline=1` / `autoplay=0|1` / `widgetid=1` /
  `origin`（自オリジン）/ `forigin`（自 URL）。
- **Player API（`window.YT.Player`）は付加価値**: ended 検知・自動再生・リピート用。**取得失敗時も iframe は残す**
  （再生自体は成立する = しあTube 実装と同じ）。API ソースは外部から読む前提で、失敗時は `console.warn` に留める。
- **自動再生のミュート解除**: ユーザー操作前は `mute()` で開始し、「ミュートを解除する」導線を出す
  （操作済みフラグを localStorage に保存する実装が有効 = しあTube 方式）。
- **埋め込み先は設定で差し替え可能に**（`youtubeeducation.com` 既定 / 公式 embed 代替）。
  **どちらが到達可能かは V5 で確認する**（学校フィルタ次第 = 断定しない）。
- しあTube の詳細（params のシート供給・コード出典 URL）= `docs/research/SIATUBE_CODE_VERIFICATION.md`。

## フロントエンド / 単一 HTML

- **`output:'export'`** = 完全静的（**Nginx が配信**。任意の静的ホストでも可）。`next build` → `out/`。
- **単一 HTML ビルド = 任意（ミラー配布用）**: `scripts/build-single-file.ts` で `out/` の JS/CSS を inline →
  1 ファイル（CDN 依存なし）。**GAS 配布がなくなったため必須ではない**（P1 以降に必要なら着手）。
- **ライブプレビュー（e2b.app）**: dev server は `0.0.0.0` バインド +
  `allowedDevOrigins`/`allowedHosts` にプレビューホストを許可しないと 403 / HMR 切断。
  ブラウザ向けコードは localhost 直叩きせず**相対 URL** で。
- ~~DASH 2 要素再生（P1）~~ = **保留**（直リンク再開時の記録: `<video>`+`<audio>` のシグナル同期・
  シーク時の `currentTime` 合わせ・`<video>` は CORS 対象外 = googlevideo 直読みで成立 = V2 実測）。

## DL パイプライン（**保留**・旧設計の記録 = 2026-09-23 に実装対象外）

- **方式 A（自宅サーバー期の主経路）= 保留**: `fetch(/dl?src=<googlevideo URL>)` ×2（video+audio）→
  Worker 内で mp4-muxer/webm-muxer（**再エンコードなし**）→
  `res.body.pipeTo(createWriteStream(filename, size))`（StreamSaver）。
  - `size` = 各ストリームの `clen` 合計 → Content-Length → 進捗UI（%/速度/ETA）+ `writer.abort()`（キャンセル）。
  - relay（`/dl`）の実装注意（先行 OSS の知見・DOWNLOAD_MECHANISM_RESEARCH.md）:
    **upstream は Range チャンク付き取得**（なしだと googlevideo スロットリング = Invidious #3302）/
    **host を googlevideo 系に whitelist 限定**（オープンプロキシ化防止 = Invidious #1605）/
    `required.httpHeaders` の UA は relay 側で付与可 / 返却は ACAO・Content-Length・
    Content-Disposition・Accept-Ranges。
- **StreamSaver は実質 Chromium 系のみ**（Safari/Firefox 非対応・公式）→
  `supported` フラグで検出してフォールバック（FSA → 直リンク）。
- **URL 有効期限 ≈6h**（`expiresInSeconds`・実測 5.9h）→ キューは失効前に処理 / 失効したら再解決。
- **`ip=` パラメータは再生経路で縛りを実効しない**（別 IP 再生 OK = V2 実測）。
  googlevideo URL のパスに `clen/<bytes>` が入る（進捗の総量算出に使う）。

## API を記憶で書かない

Bun / Hono / Next.js / GSAP / youtubei.js / Docker Compose はメジャー更新で API が変わる。
公式ドキュメントを検索して確認し、存在しないメソッドを発明しない（AGENTS.md §7.4）。
