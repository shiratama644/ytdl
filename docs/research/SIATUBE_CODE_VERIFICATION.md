# しあTube 実コード確認（iframe 再生方式）— 2026-09-23

> **位置づけ**: 証跡（実コード照合）。ユーザー指示「iframe で動画プレイヤーを実装すれば良さそう。
> 実際のしあTube のコードを確認してください」(2026-09-23) に対する確認結果。
> **設計の正本は `docs/HANDOVER.md` §4（D1〜D9）**。本書はその判断根拠（実コード）を示す資料。
> 参考資料の性格: しあTube の調査全体は [`SHIATUBE_DEEP_RESEARCH.md`](SHIATUBE_DEEP_RESEARCH.md)（仕様正本ではない）。
> **2026-09-23 追記（DOC-4）**: メタデータ取得は **`youtubei.js`（InnerTube クライアント）に改訂**（D11）。しあTube の「GAS 中継 + スプレッドシート」方式は**採用しない**（GAS 期なし = D10）。

## 1. 確認方法（到達手段）

| 項目 | 内容 |
|---|---|
| 対象リポジトリ | `ajgpw/siatube`（= しあTube 静的サイト版 v2.1.8）/ `ajgpw/siatubeGAScode` |
| 照合コミット | `ajgpw/siatube` = `44ab1599`（2026-09-16 更新）/ ローカル深度 1 clone で全ソースを読了 |
| 取得手段 | `siatube.com` は Sandbox の egress ブロックで到達不可（SSL_ERROR_SYSCALL）→ **GitHub 実リポジトリを `gh api` / `gh repo clone` で取得**（`github.com` は到達可・`raw.githubusercontent.com` は curl 不可だが `gh api` の raw 取得は可） |
| ライセンス | 両リポジトリとも **MIT License**（Copyright (c) 2025 siawaseok）。参考利用は可能（出典明記の運用とする） |
| 未確認 | `siatube.com` の実行時挙動（閲覧・API 応答）は Sandbox から確認できない = ソースコードの照合のみ |

## 2. 確認結果（実コードで確定した事実）

| # | 論点 | 実コードでの事実 | 根拠ファイル（siatube @ `44ab1599`） |
|---|---|---|---|
| 1 | **既定の再生方式** | 再生モードは 3 種（1=iframe / 2=直ストリーム / 3=DL）。**既定は Type1 = iframe**（`getDefaultStreamType()` が `"1"` を返す。prop → localStorage `defaultPlaybackMode` → Cookie `StreamType` → `"1"` の順で解決） | `client/src/components/StreamPlayer.vue` |
| 2 | **UI 上の位置づけ** | 切替メニュー =「通常」(= Type1) / **「再生できない場合こちら」(赤字 = Type2)**。Type1 選択中のラベル =「ブロックされた場合はこちら」 | `client/src/components/StreamTypeDropdown.vue` |
| 3 | **iframe の URL** | `https://www.youtubeeducation.com/embed/{videoId}?{params}`（`youtubeeducation.com` = YouTube 公式 embed プレイヤーのミラー DOM） | `client/src/utils/youtubeEducationPlayer.js` |
| 4 | **強制パラメータ** | `enablejsapi=1` / `controls=1` / `playsinline=1` / `autoplay=0\|1` / `widgetid=1` / `origin` / `forigin`（自 URL）を必ず上書き。シート由来の他パラメータはそのまま活かす（`&amp;` `&#38;` 等の実体参照は正規化） | 同上 |
| 5 | **iframe 属性** | `allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"` / `allowfullscreen` / `referrerpolicy="strict-origin-when-cross-origin"` / 16:9（`aspect-ratio`）で親要素に追従 | `client/src/components/StreamType1.vue` |
| 6 | **params の供給元** | Google スプレッドシート（`docs.google.com/spreadsheets/d/<id>/gviz/tq`、sheet = `Youtube-education-parameter`、**A1 = params 文字列 / A2 = Player API コード**）を **1 時間キャッシュ**で取得 → **再デプロイなしで埋め込み設定をホット更新** | `client/src/utils/youtubeEducationPlayer.js` |
| 7 | **Player API の読み込み** | **`youtube.com/iframe_api` を読みに行かない**。シート A2 のソースを `<script id="youtube-education-widget-api">` に**インライン注入**し、`window.YT.Player(既存 iframe)` で接続（50ms polling + **5 秒タイムアウト**） | 同上 |
| 8 | **縮退動作（重要）** | ① Player API 初期化失敗 → **iframe は残す**（コード内コメント「埋め込み自体は再生可能なので、API だけ失敗した場合は iframe を残す」）② シート取得失敗 → **自前 API `?stream={id}` の返す URL を iframe src に**（サーバー側が embed URL を供給する経路） | `client/src/utils/youtubeEducationPlayer.js` / `StreamType1.vue` |
| 9 | **再生制御** | `onReady` / `onStateChange`（playing=1 / cued=5 / ended=0）/ `onError`。ended → リピート（seek + 150/500/1000ms の再試行）または自動再生候補へ。自動再生時は未操作なら mute → **「ミュートを解除する」オーバーレイ**（操作済みフラグを localStorage `yt_user_gesture_v1` に保存） | `client/src/components/StreamType1.vue` |
| 10 | **GAS の役割** | **中継専用**。`?video=` `?stream=` `?stream2=` `?channel=` `?q=` `?comments=` `?trend` `?playlist=` を受け、自前サーバー API（primary = `siawaseok.duckdns.org` / fallback = `siatube.wjg.jp`）へ UrlFetchApp で転送（**3 リトライ**）→ JSON を `ContentService.MimeType.JSON` で返す。**GAS は YouTube 解決をしない** | `siatubeGAScode/code.gs`（MIT） |
| 11 | **配布形態** | ① 単一 HTML（`siatube-full.html.txt` = 約 500KB、JS/CSS インライン済み）② 約 40KB の HTML + **jsDelivr CDN**（`cdn.jsdelivr.net/gh/ajgpw/siatube@main/client/dist/...`）からバンドル読込。`worker.js` = Cloudflare Worker（`/api/*` → `siatube.com` 中継） | リポジトリ直下 / `worker.js` |
| 12 | **API 面** | `/health` / `/api/search` / `/api/suggest/` / `/api/video/{id}` / `/api/comments` / `/api/comment/replies` / `/api/channel/{id}` / `/api/playlist/{id}` / `/api/stream/{id}`（Type1 用は embed URL + params を返す）/ `/api/stream/{id}/type2` | `client/src/services/siatubeApi.js` / `siatubeGAScode/code.gs` |
| 13 | **API ホスト** | クライアントは `https://siatube.com` 固定（`client/src/api.js`）。中央 API 依存（D2 で私たちは依存しない判断のまま） | `client/src/api.js` |

### 2.1 主要コード抜粋（要点のみ・MIT 出典明記）

```js
// client/src/utils/youtubeEducationPlayer.js（要点抽出）
const EDUCATION_HOST = "https://www.youtubeeducation.com";
// シート: A1 = params / A2 = Player API コード（1 時間キャッシュ・gviz/tq 経由）
params.set("enablejsapi", "1");
params.set("controls", "1");
params.set("playsinline", "1");
params.set("autoplay", autoplay ? "1" : "0");
if (!params.has("widgetid")) params.set("widgetid", "1");
params.set("origin", window.location.origin);
params.set("forigin", window.location.href);
return `${EDUCATION_HOST}/embed/${encodeURIComponent(videoId)}?${params}`;
// → Player API は シート A2 のソースを <script> にインライン注入 → new YT.Player(iframe, {...})
```

```js
// client/src/components/StreamPlayer.vue（要点抽出）
// prop → localStorage "defaultPlaybackMode" → Cookie "StreamType" → "1"（= iframe）
```

```js
// siatubeGAScode/code.gs（要点抽出）
const primaryBase = "https://siawaseok.duckdns.org";
const fallbackBase = "https://siatube.wjg.jp";
// ?q= → /api/search2?q= / ?stream= → /api/stream/{id} … を UrlFetchApp で転送（3 リトライ）
// → ContentService.createTextOutput(response.getContentText()).setMimeType(ContentService.MimeType.JSON)
```

## 3. 本プロジェクトへの示唆（2026-09-23 のユーザー決定）

| # | 示唆 | 反映先 |
|---|---|---|
| 1 | **iframe 再生だけで「サイトとして成立する」ことを実コードが示している**（しあTube の既定 = Type1。Type2 直ストリームは逃げ道の位置づけ） | D1 の改訂（HANDOVER §4） |
| 2 | iframe 方式では**ストリーム URL の解決（signature decipherer）が不要**になる（再生はブラウザ ↔ YouTube 系で完結）。バックエンドの役割は**メタデータ解決**に変わる | D2 の改訂 / P00-D の再定義 |
| 3 | **GAS は「中継」か「静的配信」のどちらでも成立**する。しあTube は中継（自前サーバーが解決元）だが、私たちの Phase A は自前サーバーを持たないため、**GAS がメタデータ解決の主体**になる（`/watch/` 抽出 = V1 で実証済み） | PHASE0_PLAN §10.2 / §10.6 |
| 4 | Player API を読み込まなくても**再生自体は成立**する（API 失敗時も iframe を残す実装）。API は「ended 検知・自動再生」の付加価値に限定できる | 再生設計（PHASE0_PLAN §10.7） |
| 5 | **動画 DL は iframe 方式と接続しない**（DL には解決済み URL と relay が必要）。ユーザー判断で DL は**保留**（実装対象外・docs は保存） | D3〜D5/D9 = 保留 |
| 6 | 未検証の前提が 3 つ残る → **V5 検証キット**で実環境確認する（下記） | `verification/v5*` |

## 4. 未検証項目（V5 / V6 で確認する — 断定禁止）

| # | 未検証事項 | なぜ重要か | 確認方法 |
|---|---|---|---|
| 1 | 学校/自宅の回線から **`www.youtubeeducation.com/embed/<id>` が描画・再生できるか** | iframe 方式の根幹。ブロックされると方式自体が成立しない | `verification/v5-browser-iframe-test.html` |
| 2 | **公式 embed（`youtube-nocookie.com` / `youtube.com`）の到達性**（代替経路の有無） | ミラーが死んだ/ブロックされた場合の逃げ道の有無 | 同上（切替 UI 付き） |
| 3 | **Player API を埋め込み先ホストから直接読み込めるか**（`/iframe_api` 相当） | シート方式（しあTube）を採らずに済むかの判断材料 | 同上 |
| 4 | **検索・トレンドなどのメタデータ取得** | メタデータ API（検索・ホーム・チャンネル・プレイリスト）の可否 | **`verification/v6-metadata-check.mjs`（サーバー側・キット v2 = V6-2 / V6-3）**。**`youtubei.js`（InnerTube クライアント）で確認**する（D11 改訂）。旧 `v5b-gas-test.gs` は GAS 不採用のため参考保存 |
| 5 | embed 再生時の**広告・画質・ログイン要求**の実挙動 | 体験/運用の前提（「広告なし」を断定しない） | ユーザーの目視（V5 のチェックリスト） |

## 5. 出典（GitHub・commit 固定）

- `client/src/utils/youtubeEducationPlayer.js`: <https://github.com/ajgpw/siatube/blob/44ab1599ff6e55feb21e45bc7c64ed431947c50d/client/src/utils/youtubeEducationPlayer.js>
- `client/src/components/StreamType1.vue`: <https://github.com/ajgpw/siatube/blob/44ab1599ff6e55feb21e45bc7c64ed431947c50d/client/src/components/StreamType1.vue>
- `client/src/components/StreamPlayer.vue`: <https://github.com/ajgpw/siatube/blob/44ab1599ff6e55feb21e45bc7c64ed431947c50d/client/src/components/StreamPlayer.vue>
- `client/src/components/StreamTypeDropdown.vue`: <https://github.com/ajgpw/siatube/blob/44ab1599ff6e55feb21e45bc7c64ed431947c50d/client/src/components/StreamTypeDropdown.vue>
- `siatubeGAScode/code.gs`: <https://github.com/ajgpw/siatubeGAScode/blob/main/code.gs>
- `client/src/api.js`: <https://github.com/ajgpw/siatube/blob/44ab1599ff6e55feb21e45bc7c64ed431947c50d/client/src/api.js>
- `worker.js`: <https://github.com/ajgpw/siatube/blob/44ab1599ff6e55feb21e45bc7c64ed431947c50d/worker.js>

> ライセンス: MIT License (c) 2025 siawaseok（siatube / siatubeGAScode）。本リポジトリへコードを
> 複製する場合は出典とライセンス表示を保持する（現時点では**方式の参考**に留め、複製はしていない）。
