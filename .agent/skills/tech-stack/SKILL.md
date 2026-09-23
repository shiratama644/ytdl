---
name: tech-stack
description: ytdl のスタック（pnpm / Next.js export / Tailwind v4 / GSAP / Dexie / GAS プレーンJS / iframe 再生）の使いどころと実測ハマり。実装時に参照。仕様の正本は docs/。
---

# Tech Stack Skill — ytdl の技術構成を使いこなす

> **スキル**: 「どのライブラリをどこでどう使うか」と、このリポジトリで**実測で踏んだ地雷**。
> 設計の正本は [`../../../docs/planning/PHASE0_PLAN.md`](../../../docs/planning/PHASE0_PLAN.md)（§10.4 スタック）。
> bun / Vite / R3F / Babylon のスタック知識（元リポジトリの別プロジェクト由来）は**本プロジェクトでは使わない**。

## スタック（確定・PHASE0_PLAN §10.4）

| 層 | 使うもの | 使わない / 注意 |
| :--- | :--- | :--- |
| パッケージ管理 | **pnpm (workspaces)** | bun / npm 単体（ロックは `pnpm-lock.yaml`） |
| フロントエンド | **Next.js（App Router、`output:'export'`）** | サーバー依存の機能（API routes / SSR 実行時）= 静的 export と相性悪い |
| スタイリング | **Tailwind CSS v4**（`@theme` で M3 トークン） | M3 ロール名でトークンを写像（PHASE0_PLAN §10.11） |
| モーション | **GSAP 3.13**（ScrollTrigger 任意） | `prefers-reduced-motion` 無効化トグルは必須 |
| 永続化 | **Dexie.js 4**（IndexedDB） | localStorage 主体でなく履歴・設定等は IndexedDB（**DL キューは保留**） |
| 再生 | **iframe 埋め込み**（`youtubeeducation.com/embed` 既定・公式 embed 差し替え可。`enablejsapi`/`controls`/`playsinline` 等を強制付与） | 直リンク DASH / hls.js / MSE = **保留**（D1 改訂 2026-09-23） |
| ~~DL muxer~~ | **保留**（mp4-muxer / webm-muxer = docs に保存） | 再開時のみ参照 |
| ~~DL 保存~~ | **保留**（StreamSaver / FSA / 直リンク = docs に保存） | 再開時のみ参照 |
| バックエンド(GAS) | **プレーン JS**（GAS V8。npm パッケージ不可）: UrlFetchApp + 文字列処理 + CacheService = **メタデータ抽出** | GAS への youtubei.js バンドル（不要 = V1 確定）/ 外部サービス呼び出し（GAS クォータを食う） |
| バックエンド(自宅・P5) | **Bun + Hono + Nginx**（将来オプション） | 全面プロキシをしない（D6 常設）。yt-dlp / DL relay は**保留** |
| 品質 | TypeScript（strict）/ **biome** / **vitest** | ESLint/Prettier / `bun test` |

## GAS バックエンド（Phase A・P00-D の核心 = メタデータ抽出・全て実測済み）

### メタデータ抽出の実装（V1 検証で確定・参照実装 = `verification/v1f-gas-test.gs`）

1. **取得**: `https://www.youtube.com/watch?v=<id>&hl=ja&gl=JP` を desktop UA +
   `Accept-Language: ja-JP` で `UrlFetchApp.fetch`（`muteHttpExceptions: true`）。
2. **抽出**: 代入文 `ytInitialPlayerResponse\s*=\s*\{` を正規表現で**全候補列挙**（初回出現は
   `WIZ_global_data` 内の偽構文に当ることが実測あり）→ 括弧バランス切片（`balancedSlice`）→
   `JSON.parse` → `playabilityStatus`/`streamingData`/`videoDetails` を持つ実レスポンスを採用。
   キー抽出は `"INNERTUBE_API_KEY":"..."` の引用符+コロン形式にも対応する（3 段 fallback）。
3. **~~decipherer~~ = 保留（2026-09-23）**: formats は**全形式 `signatureCipher`**（`url` フィールドなし = 実測 v1f）。
   形式 = `s=<cipher>&sp=sig&url=<URL エンコード済みの videoplayback URL>`（base URL には
   `expire`/`ei`/`ip=` が已含む = 欠落するのは署名のみ）。
   復号 = **youtube-dlp 型 signature transform 逆変換**: watch ページの player JS から transform
   関数群を抽出 → `s` に逆順適用 → `decode(url) + &sig=<復号値>`。
4. **O9（必須）**: 429/5xx のリトライ+バックオフ / **CacheService キャッシュ**
   （TTL = `streamingData.expiresInSeconds` × 安全係数例 0.5）/ 同一動画の single-flight。
   （429 は ~13 回/時で実発生 = O9 記録）

### GAS 平台制約（実測・AGENTS.md §6.3）

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

- **`output:'export'`** = 完全静的（GAS / 任意の静的ホストで配信可）。`next build` → `out/`。
- **単一 HTML ビルド（P00-E）**: `scripts/build-single-file.ts` で `out/` の JS/CSS を inline →
  1 ファイル（CDN 依存なし）。GAS の `doGet` がその HTML を `MimeType.HTML` で返す。
  生成物は毎回「1 ファイル・サイズ」を確認・記録。
- **ライブプレビュー（e2b.app）**: dev server は `0.0.0.0` バインド +
  `allowedDevOrigins`/`allowedHosts` にプレビューホストを許可しないと 403 / HMR 切断。
  ブラウザ向けコードは localhost 直叩きせず**相対 URL** で。
- ~~DASH 2 要素再生（P1）~~ = **保留**（直リンク再開時の記録: `<video>`+`<audio>` のシグナル同期・
  シーク時の `currentTime` 合わせ・`<video>` は CORS 対象外 = googlevideo 直読みで成立 = V2 実測）。

## DL パイプライン（**保留**・旧設計の記録 = 2026-09-23 に実装対象外）

- **方式 A（Phase B 主経路）**: `fetch(/dl?src=<googlevideo URL>)` ×2（video+audio）→
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

GAS / Next.js / GSAP / StreamSaver / muxer 系はメジャー更新で API が変わる。
公式ドキュメントを検索して確認し、存在しないメソッドを発明しない（AGENTS.md §7.4）。
