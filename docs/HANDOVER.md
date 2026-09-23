# AI 引き継ぎドキュメント(ytdl)

> 作成: 2026-09-14 / **最終更新: 2026-09-23**(再生方式を iframe へ転換・動画 DL を保留 = DOC-2)
> 対象ブランチ: **セッション固定ブランチ**(Arena のセッションごとに `arena/<id>-ytdl`)。
> 必ず `git branch --show-current` で確認する(§10)
> **引き継ぐ AI へ: このファイルが第一のエントリポイントです。§1 → §13 の順で読み、
>  §9 に指定したファイル群をその優先順で読んでから作業を開始してください。**

---

## 1. 引き継ぐ AI への最初に読む 5 行

1. **このプロジェクトの全設計判断は確定済み**(§4)。再議論・再提案しないこと。ユーザーが確認済み。
2. **ユーザーとのコミュニケーションは日本語**(返信もドキュメントも)。
3. **ユーザーの常設指示: 「検証してから構築する」**(verify first, build second)。V1〜V2 = 完了(§6)。
   **2026-09-23 の方針転換で検証の位置づけが変わった**(§4・§6 の状態欄)。
4. **方針転換(2026-09-23・ユーザー決定)**: 再生は **iframe 埋め込み**(しあTube と同じ
   `youtubeeducation.com/embed`)+ **動画 DL は目標から除外して保留**(実装対象外・設計は docs に保存)。
   役割: 再生 = ブラウザが YouTube 系 embed を直接再生 / バックエンド = **メタデータ解決**。
   ストリーム URL 解決・signature decipherer・DL 機構 = **保留**。
   次の検証 = **V5**(iframe 到達性・検索/トレンド抽出 = ユーザー実行キット)/ 実装 = **P00 GO 待ち**。
5. **このサンドボックスはターン跨ぎにリポジトリを再クローンする**。作業のたびに必ず **commit して push**
   (復旧手順は §11)。push しない作業は消える。

## 2. プロジェクト概要

- **ytdl** = YouTube プロキシ閲覧サイト。「しあTube(静的サイト版)」と**同じ需要構造**(学校のフィルタ回避・
  アカウント不要・広告なし・高画質視聴)を持つ。**2026-09-23 のユーザー決定で再定義**:
  1. **再生 = iframe 埋め込み**(しあTube の既定方式と同じ。`youtubeeducation.com/embed`)
  2. **差別化 = Material 3 Design Expressive の UI + GSAP モーション**
  3. ~~動画ダウンロード機能~~ → **保留**(目標から除外。実装しないが設計・調査は docs に保存)
  - 機能範囲 = **しあTube 相当フル**(トレンド / 検索+サジェスト / 視聴+関連+コメント / チャンネル /
    プレイリスト / 履歴 / 登録 / 設定。DL を除く)
- **2 フェーズ運用**:
  - **Phase A(GAS 期・MVP)**: 静的単一 HTML + `script.google.com` の GAS Web アプリ(doGet が
    HTML 配信 + `?api=` JSON ディスパッチの 2 役)。学校環境でそのまま動く。
  - **Phase B(自宅サーバー期)= 将来オプション**: Proxmox VE / LXC + Bun(Hono)+ Nginx。
    **DL 保留に伴い主目的(relay / yt-dlp)が外れた**ため再定義(移行トリガー = GAS クォータ到達など)。
- **法的スタンス**: 個人視聴の私的使用(日本著作権法第 30 条圏)を前提。サーバーでの保存・再配信・
  再エンコードはしない(§4 の D6)。**iframe 方式は YouTube 公式 embed の利用に近い形**であり、
  直リンク再配布より露出が小さい(断定はしない。しあTube 実コードも同じ方式 = §7.8)。
- 前提調査: しあTube の完全調査(ソース精読 + API 実測)を完了済み
  → [`research/SHIATUBE_DEEP_RESEARCH.md`](research/SHIATUBE_DEEP_RESEARCH.md)

## 3. ユーザーの 4 設計原則(**原文のまま**・絶対表現の禁止を含む)

> ユーザーが明示した原則。**文書に書き記す際は絶対表現(「サーバー負荷ゼロ」「完全に」等)を禁止**され、
> 条件付き・検証可能な表現を使うよう指示されている。`docs/planning/PHASE0_PLAN.md` §10.2 に原文登記済み。
> **2026-09-23 追記**: 原則 2・3 は動画 DL(保留)に紐づく。DL を実装しない間も**表現規約は継続**。

1. **サーバー側で動画データを中継・変換しない限り**、動画処理に伴う CPU/メモリ負荷を最小化できる
   (※ 「サーバー負荷は完全にゼロ」は**禁止表現**)
2. **StreamSaver.js 等のストリーミングダウンロード機構を利用し**、巨大な Blob をメモリ上に保持することを避ける
   (※ 「StreamSaver.js でローカルストレージへ直接書き出す」は**禁止表現** = メモリ非保持が趣旨)
3. **再エンコードを行わないため**、FFmpeg 等による再エンコードより CPU 負荷を大幅に低減できる
   (※ 「CPU 負荷は数%〜10%程度」のような数値断定は**禁止表現**)
4. **ブラウザからの直接取得可否(CORS、Range、URL 有効期限、codec/container 対応等)を検証した上で利用する**
   (※ 「生 URL をブラウザへ返せば再生可能」は**禁止表現** = 必ず検証してから利用)

## 4. 確定した設計(全項目ユーザー承認済み・**2026-09-23 に改訂/保留を反映**)

> 状態の凡例: **【改訂】** = 2026-09-23 のユーザー決定で内容変更 / **【継続】** = 変更なし /
> **【保留】** = 実装対象外(docs は保存・再開時に参照)。**旧文面の全文**は git 履歴 +
> `docs/planning/PHASE0_PLAN.md` §10.8/§10.10 + [`research/DOWNLOAD_MECHANISM_RESEARCH.md`](research/DOWNLOAD_MECHANISM_RESEARCH.md) に残る。

| # | 判断 | 内容 | 確定日 |
|---|---|---|---|
| D1 | **再生経路** | **【改訂 2026-09-23】iframe 埋め込み**(`https://www.youtubeeducation.com/embed/{id}` を既定、公式 embed に差し替え可能な形)。直リンク再生(2 要素 DASH・hls.js・MSE)は**保留 = 実装しない** | 2026-09-23(改訂) |
| D2 | **バックエンド** | **自前実装**(siatube.com API 不使用 = 継続)。役割は**メタデータ解決**(`/watch/` 抽出 = V1 で実証済み / 検索・トレンド = V5 で検証)。**signature decipherer・ストリーム URL 解決は保留** | 2026-09-14(09-23 改訂) |
| D3 | **DL(自宅サーバー期)= 保留** | 旧設計: 方式 A 主(`/dl` DL 専用 relay → Worker で mp4/webm-muxer → StreamSaver → 進捗UI)+ 方式 B 補完(yt-dlp バッチ)。**2026-09-23 ユーザー決定で実装対象外**(設計は docs に保存) | 2026-09-13(09-23 保留) |
| D4 | **DL(GAS 期)= 保留** | 旧設計: 720p 以下 muxed 直リンクのみ(実測 = itag 22/37 なし → itag 18 のみ)。**実装対象外** | 2026-09-13(09-23 保留) |
| D5 | **DL(iOS/Firefox)= 保留** | 旧設計: 直リンクフォールバック(StreamSaver は Chromium 系のみ)。**実装対象外** | 2026-09-13(09-23 保留) |
| D6 | **relay の使用範囲** | **再生経路のサーバー中継はしない**(iframe 方式で確定 = 再生はブラウザ ↔ YouTube 系で完結)。**DL 専用 relay は保留**。自宅サーバーは siatube 型の動画全面プロキシにしない(常設) | 2026-09-13(09-23 改訂) |
| D7 | **対策ラダー = 保留** | 旧設計: client 選択 / clientVersion 鮮度 / PO token / decipherer churn 対策。**直リンク再開時に再開**(iframe 方式では不要) | 2026-09-14(09-23 保留) |
| D8 | **v2b(CORS 確定テスト)** | **スキップ**(ユーザー判断・変更なし)。**再提案しない** | 2026-09-13 |
| D9 | **FSA = 保留** | 旧設計: DL 主経路にしない(StreamSaver 指定)。**DL 保留に伴い対象外** | 初期(09-23 保留) |

## 5. 全体アーキテクチャ(2026-09-23 改訂)

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

**技術スタック(確定)**: Next.js(App Router, `output:'export'`)+ Tailwind CSS v4 + GSAP 3.13 +
Dexie.js 4 / TypeScript / biome / vitest / pnpm workspaces。GAS 後端 = **メタデータ解決
(`/watch/` 抽出 = V1 実証済み)+ O9**(プレーン JS・youtubei.js ランタイム不使用 = V1 で確定)。
再生 = **iframe 埋め込み**(再生は YouTube 系 embed が担う = プレイヤー実装は薄い)。
自宅サーバー = Bun + Hono + Nginx(**将来オプション**。DL 用 yt-dlp は保留)。
(詳細: `docs/planning/PHASE0_PLAN.md` §10.4〜§10.7)

## 6. 検証の現状(証跡の正本: `docs/research/VERIFICATION_P0.md`)

> **2026-09-23 更新**: 再生 = iframe 転換により、検証の**位置づけ**が変わった(下表の状態欄)。
> **次に実行するのは V5**(iframe 到達性・メタデータ抽出)。V3-a/V3-b/V4 = 保留項目の参考。

| ID | 内容 | 状態 | 要点 |
|---|---|---|---|
| V1-a | youtubei.js バンドル + Node 初期化 | ✅ 完了 | v18.0.0・1.3MB バンドル・create() 到達(通信はサンドボックス遮断のため未実測) |
| **V1-b** | **GAS 実環境でのストリーム解決** | ✅ 完了(第 1〜6 回 2026-09-13〜15) / **位置づけ変更** | 第 1 回失敗 / 第 2 回 = 全 client 失敗(version 陳腐化は排除)/ 第 3 回 = キット側バグ 2 点(v1c)/ **第 4 回(v1d)= ✅ watch 抽出成功**(playability OK / 30 形式 / 1080p+140)/ 第 5 回(v1e)= 429(O9)/ 第 6 回(v1f)= **全 30 形式 `signatureCipher`**。**`/player` InnerTube = 3 ラウンド連続 dead(使わない)**。**2026-09-23 改訂: 抽出の知見 = メタデータ供給源として活用 / 復号(decipherer)は保留**(iframe 再生ではストリーム URL を使わない) |
| V2 | ブラウザ直接取得 | ✅ 部分判定で確定(記録として保持) | 第 1 回(ユーザー Android): `<video>` 再生 **OK** / fetch 全 **Failed to fetch** → **CORS(ACAO 欠如)成立**。expire ≈5.9h / 他 IP 再生 OK。v2b は D8 でスキップ。**DL 保留により決定打ではなくなったが、直リンク再開時の判断材料** |
| V3-a | GAS `?_sw=` の HTTP 契約 | ✅ 完了(記録) | ローカル模倣で HTML/JS MIME 同居確認。**DL/PWA 保留に伴い当面用途なし** |
| V3-b | GAS からの SW 登録 | ⏳ 任意(保留項目の参考) | 第 1 回 = text/plain 配信(旧デプロイ)/ 第 2 回 = setMimeType 例外(修正済み)。用途 = 将来の PWA/オフライン判断のみ |
| V4 | iOS Safari 挙動 | ⏳ 任意(保留項目の参考) | iOS の DL fallback(直リンク)の裏取り。**DL 保留に伴い後回し** |
| **V5** | **iframe 到達性 + メタデータ抽出(検索/トレンド)** | **未着手(次に実行する必須キット)** | ① `youtubeeducation.com/embed` が学校/自宅で描画・再生できるか ② 公式 embed(`youtube-nocookie.com` 等)の到達性 ③ 埋め込み先からの Player API 直接読込可否 ④ GAS からの検索結果/トレンド抽出 ⑤ embed の広告・画質・ログイン要求の挙動。キット: `verification/v5-browser-iframe-test.html`(①②③⑤)/ `verification/v5b-gas-test.gs`(④) |

**GAS 実行で判明した制約(本プロジェクトの GAS 実装に直接効く)**:
- **O7: GAS の `ContentService.TextOutput.setMimeType` は `ContentService.MimeType` 列挙型のみ
  受け付け、**String は例外を投げる**。「パラメータ（String）が ... setMimeType のメソッドの
  シグネチャと一致しません」。本番 GAS コードでは必ず enum で書く。
- **GAS のデプロイは古いバージョンを配信し続ける**(コード更新後に新しいデプロイを作らないと
  旧版のまま)→ ユーザーには常に「新しいプロジェクト」で実行させる運用にしている。
  本番コードにも `?probe=` 型の自己診断 ping を組み込むべき(VERIFICATION_P0.md O5)。
- **O9: YouTube 側レート制限(HTTP 429)**: v1e 試行 1 で発生(累計 ~13 回/1 時間・同じ
  Google DC IP)。一時的だが、**本番リゾラは ① 429/5xx リトライ+バックオフ ② 解決結果の
  キャッシュ(CacheService・TTL)③ 同一動画 single-flight が必須**(ユーザーの毎リクエストで
  watch ページを再 fetch しない)。

## 7. 技術的事実(調査済み・再調査・再議論不要)

> **2026-09-23 追記**: §7.1〜§7.5 は **DL / 直リンク設計(保留)の記録**として保存する。
> iframe 再生の実コード確認は **§7.8** と [`research/SIATUBE_CODE_VERIFICATION.md`](research/SIATUBE_CODE_VERIFICATION.md) を参照。

### 7.1 googlevideo.com の CORS
- **`Access-Control-Allow-Origin` を返さない** → ブラウザの `fetch()` は必ずブロックされる。
  根拠: 本検証 V2 実測 + **Piped 運用 issue #3211 の同種エラー記録** + Invidious/Piped が
  全てサーバー側中継(relay)で解決している実務。
- **`<video>` 要素は CORS 対象外** → 再生は直読みで成立(V2 実測・他 IP でも OK)。
- 結論: **ブラウザが googlevideo を直接 fetch してファイルをもらう経路は全フェーズで不可**。
  DL のバイトは必ず「自社サーバーからブラウザへ」(= 方式 A の relay か B の完成ファイル)。

### 7.2 StreamSaver.js(機構・制約)
- 機構 = **Service Worker + `fetch()` + ReadableStream + `respondWith()`**。
  典型: `fetch(url).then(res => res.body.pipeTo(createWriteStream(filename, size)))`。
  **fetch が本文を読み取れる(CORS 許可)ことが前提** = googlevideo 直結では使えない(7.1)。
- 進捗: `createWriteStream(filename, size)` の `size` が `Content-Length` になる →
  ブラウザネイティブ進捗 + 自前 UI(チャンク計数 / 総量)で %・速度・ETA 算出可能。
- **ブラウザ対応: 実質 Chromium 系のみ**(Chrome/Edge/Opera/Samsung)。Safari・Firefox は非対応
  (公式対応表: SW の streams 欠落)。`supported` フラグで検出してフォールバック必須。
- メモリ非保持(SW がディスクへ直接ストリーム書き込み)= 設計原則 2 と一致。

### 7.3 「直リンク」で何ができて何ができないか
- クロスオリジンの `download` 属性は **Chrome 65+ でファイル名ヒント破棄、Firefox/Safari で
  属性ごと無視**(ナビゲート = 動画タブが開く)。
- 直リンクは**ナビゲーション**なのでページ JS が転送に関与できない →
  **ページ内の進捗UI / キャンセル / ファイル名制御 / キューは原理的に不可**。
- 得られるもの = ブラウザネイティブの保存のみ(モバイル: メディアビューから「動画を保存」)。
- → これが D4(D4/D5)の根拠。

### 7.4 自宅サーバー relay(方式 A)の実装上の注意(先行 OSS の知見)
- **upstream(googlevideo)取得は Range ヘッダ付きでやる** — なしだと Google 側でスロットリング
  (Invidious issue #3302 の実証。チャンク分割取得が定石)。
- **host を googlevideo 系に whitelist 限定** — 任意 URL を中継するとオープンプロキシ化して
  脆弱性になる(Invidious issue #1605)。
- ストリーム URL の `required.httpHeaders` に**カスタム User-Agent** がある場合、ブラウザ fetch は
  UA を上書きできないが **relay(サーバー側 fetch)は指定どおりに送れる** = relay が有利な場面。
- 返却ヘッダ: `Access-Control-Allow-Origin` / `Content-Length` /
  `Content-Disposition: attachment; filename=...` / `Accept-Ranges`。
- 参照実例: Invidious `/videoplayback?local=true`、Piped の proxy ドメイン(nginx で
  `/videoplayback` を中継)。

### 7.5 googlevideo 署名 URL の性質(実測・調査)
- **`expire` ≈ 6 時間**(実測 5.9h)。DL キューは「失効前に処理 / 失効したら再解決」。
- **`ip=` パラメータはあるが再生経路では縛りを実効しない**(別 IP で再生 OK = V2 実測)。
  (DL relay では解決元 = 中継元 = 自宅サーバー IP で一致するため非問題。)
- URL パスに **`clen/<bytes>`**(コンテンツ長)が入る → 進捗 UI の総量算出に使える。

### 7.6 siatube.com 中央 API(現在は依存しないが知見として保持)
- しあTube 元アーキ = 静的 Vue SPA + 中央 API(siatube.com、yt-dlp + InnerTube ベース)。
  ストリーム URL = 署名済み googlevideo 直リンク(本検証でその挙動を実測)。
- **第三者から連続アクセスすると 2 回目で空 HTML が返る現象を確認**(O1)= 中央 API 依存の
  脆弱性。D2 で依存しないことにした根拠の一つ。
- API 応答形状(`counts` / `streams.{muxed,videoOnly,audioOnly}` / `httpHeaders` /
  `audioOnly` 配列に null エントリを含むクセ=O4 等)は**本プロジェクトの API 設計・
  応答正規化の参考資料**として有効(§10.6 API v1 はこれに準拠)。

### 7.7 V1 検証の最終知見(2026-09-15・実測・再確認不要)
- **`/player` InnerTube エンドポイントは GAS(Google DC)IP から 3 ラウンド連続で dead**
  (WEB_EMBEDDED_PLAYER/WEB = 200 だが playability ERROR/UNPLAYABLE・汎用 reason /
  ANDROID = HTTP 400 Precondition check failed / visitorData+playbackContext 付きでも同様)
  → **使わない**。
- **`/watch/` ページの HTML スクレイピングは完全に開いている**(200 / ~700KB / ja-JP /
  consent でも botCheck でもない / fetch 1.3 秒)。
- **watch ページの player response の formats は全形式 `signatureCipher`**(`url` フィールド
  は無い): `s=<暗号化シグネチャ>&sp=sig&url=<URL エンコード済みの videoplayback URL>`。
  `url` 部分には **`expire` / `ei` / `ip=<GAS 出口 IP>`** が已含む = 欠落するのは署名のみ。
  復号 = **youtube-dlp 型の signature transform 逆変換**(watch ページの player JS から
  transform 関数群を抽出 → `s` に逆順適用 → `decode(url) + &sig=<復号値>`)。
- `streamingData` の実キー = **`expiresInSeconds`**(≒ 6 時間の失効)。**`serverAbrStreamingUrl`**
  も存在(内部 ABR 用と推測・クライアント直接用は想定しない)。
- **429 レート制限は実在**(O9): キット累計 ~13 回/1 時間で発生 / 約 13 時間後には解消。
  本番リゾラは**リトライ+バックオフ / CacheService キャッシュ / single-flight が必須**。
- googlevideo URL の `ip=<解決元 IP>` は**再生経路では縛りを実効しない**(O3・V2 実測)。
  → ブラウザが別 IP から `<video>` で取得しても再生 OK。

### 7.8 しあTube 実コード確認(2026-09-23・iframe 方式)
- しあTube の**既定の再生方式は iframe**(`https://www.youtubeeducation.com/embed/{id}?{params}`)。
  実コード(`ajgpw/siatube@44ab1599`): `StreamPlayer.vue`(既定 = "1")/ `StreamType1.vue` /
  `youtubeEducationPlayer.js`(params と Player API コードを Google スプレッドシートから 1h キャッシュで
  取得 → `<script>` にインライン注入)/ `StreamTypeDropdown.vue`(Type2 = 「再生できない場合こちら」= 逃げ道)。
- **GAS の役割 = 中継**(`siatubeGAScode/code.gs`: 自前サーバー API へ UrlFetchApp 転送・3 リトライ・
  JSON 返却)。**GAS では YouTube 解決をしない**。私たちの Phase A は自前サーバーを持たないため、
  逆に **GAS がメタデータ解決の主体**になる(V1 の `/watch/` 抽出を活用)。
- **Player API 初期化に失敗しても iframe は残す**実装 = 再生自体は API なしで成立する。
- 詳細(コード抜粋・出典 URL・未検証項目) = [`research/SIATUBE_CODE_VERIFICATION.md`](research/SIATUBE_CODE_VERIFICATION.md)。

## 8. 検証キットの状態と、P00-D の仕様(着手時にこれ)

### 8.1 V5(次に実行する必須キット)= iframe 到達性 + メタデータ抽出
- **2026-09-23 の転換により、次に実環境で確認すべきは V5**(V1〜V2 の完了状況は §6)。
- キット① `verification/v5-browser-iframe-test.html`(ブラウザで開く)= ① `youtubeeducation.com/embed`
  の描画・再生 ② 公式 embed(`youtube-nocookie.com` 等)の到達性 ③ 埋め込み先からの Player API
  直接読込可否 ⑤ 広告・画質・ログイン要求の挙動(目視)。`?probe=1` 内蔵。
- キット② `verification/v5b-gas-test.gs`(GAS)= ④ GAS からの検索結果ページ抽出とトレンド取得。
  **1 実行 = 1 fetch**(`?probe=1` / `?test=search` / `?test=trend` で切替)。
- 手順 = `verification/README.md`。結果 = `verification/Verification-Results.md`(1 ファイル = 最新のみ)。

### 8.2 P00-D(GAS 後端)の仕様(2026-09-23 改訂)
1. **メタデータ解決 = `/watch/` ページ抽出**(V1 で実証済みのアルゴリズム):
   `https://www.youtube.com/watch?v=<id>&hl=ja&gl=JP` を desktop UA(+ `Accept-Language: ja-JP`)で
   UrlFetchApp 取得 → 代入文 `ytInitialPlayerResponse = {` を正規表現で全候補列挙 →
   括弧バランス切片 → JSON.parse → `playabilityStatus/videoDetails` を持つ実レスポンスを採用
   (`verification/v1f-gas-test.gs` に参照実装)。**返すのはメタデータのみ**(タイトル・投稿者・
   長さ・サムネイル・関連)。**ストリーム URL は返さない**。
2. **検索・トレンド = V5 の結果次第**(未確定の間は実装しない)。可なら同じ「ページ抽出」方式で実装。
3. **O9 を必ず実装**: 429/5xx のリトライ+バックオフ / **CacheService キャッシュ** / 同一対象の single-flight。
4. doGet ディスパッチ: `/`(単一 HTML)+ `?api=health|video|search|channel|playlist|comments...`
   (+ `?probe=1` 自己診断)。`/player` InnerTube は使わない(§7.7)。
5. **iframe のパラメータはクライアント側の設定定数**で持つ(しあTube のスプレッドシート方式は採用しない。
   ブロック等で必要になった場合に再検討 = §7.8)。
- **保留**(実装しない): signature decipherer / ストリーム URL 解決 / DL 機構(D3〜D5/D9)。
  再開時は VERIFICATION_P0.md の V1 解析 + `DOWNLOAD_MECHANISM_RESEARCH.md` を参照する。

### 8.3 v3b(任意・保留項目の参考)
- キット: `verification/v3b-gas-test.gs`(修正版 = enum 使用。行 50 が
  `.setMimeType(ContentService.MimeType.HTML);` であること。
  raw: `https://raw.githubusercontent.com/shiratama644/ytdl/<セッション固定ブランチ>/verification/v3b-gas-test.gs`
  = ブランチ名は `git branch --show-current` で確認)`
- 手順: 新プロジェクト → 貼付 → **まず `?probe=1` を開いて** `{"test":"V3b",...}` が出ることを確認
  → その URL を開く。ページが描画されたら「結果をコピー」、**文字として表示されたら画面下部の
  コンソールコマンドを F12 コンソールに貼付**して結果を送る。
- 用途: 将来の PWA/オフライン機能(GAS からの SW 配信可否)の判断材料のみ。**DL には不要**。

### 8.4 V4(任意・保留項目の参考)
- `verification/v2b-browser-test.html` を **iOS(Safari)** で開いて実行 → 「結果をコピー」。
- 用途: iOS の DL fallback(直リンク)の UX 裏取り。

### 8.5 v2b — **スキップ済み(D8)。ユーザーに再提案しない**(ファイルは残置物)。

## 9. リポジトリ構造と正本ファイル

```
ytdl/
├── AGENTS.md / README.md           # エージェント規約・リポジトリ説明
├── .agent/                          # Agent 記憶システム(hooks/skills/logs)
├── docs/
│   ├── task-list.md                 # ★ 進捗の唯一の正本(検証 + P00 各タスクのステータス)
│   ├── README.md                    # docs 導覧
│   ├── planning/
│   │   ├── PHASE0_PLAN.md           # ★ 設計正本(P00 計画・§10 で全体設計・§11 リスク・§5 DoD)
│   │   ├── README.md / _TEMPLATE.md
│   ├── research/
│   │   ├── VERIFICATION_P0.md       # ★ 検証証跡(V1〜V5・設計への影響・観察 O1〜O9)
│   │   ├── SIATUBE_CODE_VERIFICATION.md    # ★ しあTube 実コード確認(iframe 方式・2026-09-23)
│   │   ├── DOWNLOAD_MECHANISM_RESEARCH.md  # DL 機構調査(**保留**。StreamSaver/方式 A・B・C の記録)
│   │   ├── SHIATUBE_DEEP_RESEARCH.md       # しあTube 完全調査(参考資料・仕様正本ではない)
│   │   └── README.md                # 調査 index
│   └── HANDOVER.md                  # 本ファイル
├── verification/
│   ├── README.md                    # ★ 検証キットの実行手順(ユーザー向け)
│   ├── Verification-Results.md      # ユーザー管理の生データファイル(= 現在 **v1f の JSON**・1 ファイル = 最新の結果のみ)
│   │                                #   第 1〜3 回の生データは git 履歴 + VERIFICATION_P0.md の証跡に残る
│   ├── v1〜v1f の .gs               # V1 キット系(実行済み・完了)
│   ├── v2-browser-test.html / v2b-browser-test.html  # V2 キット(v2b はスキップ済み)
│   ├── v3-gas-test.gs / v3b-gas-test.gs      # V3 キット(保留項目の参考)
│   ├── v5-browser-iframe-test.html            # ★ V5 キット(iframe 到達性・次に実行)
│   ├── v5b-gas-test.gs                        # ★ V5 キット(GAS: 検索/トレンド抽出・次に実行)
└── (P00-B 以降で) apps/web, packages/shared, backend/gas, backend/home, scripts/
```

**読む優先順(引き継ぎ時)**:
1. `docs/HANDOVER.md`(本ファイル)
2. `docs/task-list.md`(どこまでやったか)
3. `docs/planning/PHASE0_PLAN.md`(何をどう作るか・§5 DoD・§7 停止条件)
4. `docs/research/VERIFICATION_P0.md`(なぜそう設計したか=証跡)
5. `docs/research/SIATUBE_CODE_VERIFICATION.md`(iframe 方式の実コード根拠・2026-09-23)
6. 必要に応じて `SHIATUBE_DEEP_RESEARCH.md` / `DOWNLOAD_MECHANISM_RESEARCH.md`(保留) / `verification/README.md`

## 10. git / ブランチ状況(2026-09-23 時点)

- リポジトリ: `shiratama644/ytdl`(GitHub。認証はこの環境で設定済み)。
- **作業ブランチ = セッション固定ブランチ**(`arena/<id>-ytdl`)。**必ず `git branch --show-current` で確認**する。
  **過去セッションのブランチ名は本ドキュメントに残さない**(別セッションのブランチを触る事故を防ぐため)。
- **`main` は PR #3 まで取り込み済み**(`12aeef8`)。現セッションの作業はその先端から始まっている
  (= 「main が古いので取り込む」作業は**完了済み・不要**)。
- 主要コミット(新しい順):
  - (2026-09-23) **DOC-2 = 再生方式を iframe へ転換・DL 保留**(本改訂 + V5 キット)
  - `fab6fdc` **DOC-1 = cod-web 期ログの SKILL 化 + 残骸削除**(skills 5 件化・logs 45 件削除・.archive 削除)
  - `12aeef8` PR #3 マージ(前セッションのドキュメント整理・検証完了状態)
  - `6143012` ユーザー: V1f 実行結果(全 30 形式 signatureCipher = V1 完了の証跡)
  - `7761203` v1f 結果分析 = V1 検証完了(※当時の P00-D 仕様は DOC-2 で改訂済み)
  - それ以前(v1c〜v1e の分析・ユーザー実行結果等)は git 履歴を参照。
- **ユーザーは GitHub Web UI で直接コミットする**(検証結果の送付等)。
  コミット前に必ず `git fetch origin '+refs/heads/*:refs/remotes/origin/*'` で同期し、
  ユーザーが変更・削除したファイルを worktree に反映する(`git add -A` が旧コピーを復活させる罠)。
- **`origin` には他セッションの `arena/<別 id>-ytdl` ブランチが存在し得る** = **触らない**(fetch 表示のみ)。


## 11. 環境固有の注意点(Arena サンドボックス)

1. **リポジトリの再クローン**: ターン(ユーザー返信)の間に環境がリポジトリを再クローンし、
   **ローカルブランチが初期コミット `69db5af` にリセットされる**(作業ツリーのファイルは残る)。
   本プロジェクトでは**少なくとも 4 回**発生済み。
   - **対策: 変更があるたびに必ず `git add -A && git commit && git push origin <ブランチ>`**。
   - **復旧**: `git fetch origin '+refs/heads/*:refs/remotes/origin/*'` →
     `git reset --soft origin/<ブランチ>` → `git add -A` →
     `git status`(差分が自分の変更のみか確認)→ commit → push。
   - **push が rejected になったら** = 上に原因。fetch してから同じ手順。
   - `git fetch origin <branch>`(refspec なし)は FETCH_HEAD だけを更新する罠。
     常に `'+refs/heads/*:refs/remotes/origin/*'` を付ける。
2. **サンドボックスの outbound 通信制限**: `youtube.com` / `googlevideo.com` / `siatube.com` への
   直接接続はブロック(SSL_ERROR_SYSCALL)。ウェブページ取得は `fetch_page` ツールを使用。
   **2026-09-23 実測**: `github.com` は curl 可(200)/ `raw.githubusercontent.com` は curl 不可
   (SSL_ERROR_SYSCALL)/ **GitHub の内容取得は `gh api`・`gh repo clone` が確実**(認証済み)。
   しあTube の実コード確認はこの経路で実施した(§7.8)。
3. **ファイル取得の落とし穴**: ユーザーから「実行結果」が届くのは**チャットへの貼付**の形。
   `uploads/` ディレクトリは同期されない場合がある → 貼付が来たら必ずファイル化してコミットする。
4. **ツール癖**:
   - `node --check` は `.gs` 拡張子が通らない → `/tmp/*.js` にコピーしてから。
   - GAS の .gs 内の JS 構文チェック = `new Function(code)` で十分。
   - `edit_file` は**バックスラッシュ(`\n` 等)を含むブロックの fuzzy 匹配で失敗しやすい** →
     その場合は `read_file` で正確なテキストを取得し、必要なら `write_file` で全文書き換え。
   - **minified JS を 1 行に手書きすると括弧不整合のバグが起きやすい**(実際に 1 回発生)→
     多行配列 `join('\n')` で書く + `new Function` で必ず検証。
5. **ユーザーが実行する GAS キットへの修正は、常にリポジトリの最新版で管理**し、
   ユーザーには **raw URL + 自己チェック行(どの行に何があるべきか)を伝える**(ファイルのコピー
   漏れ・旧版混入が実際に 2 回起きた: v3b 試行 1 と v1b 試行 1)。

## 12. ユーザーとの付き合い方(立ち回りルール)

- **日本語で**、短く、具体例・表を交えて答える。ユーザーは技術的に詳しく、短文指示が多い。
- **指示の例(そのまま反映済み)**:
  - 「実際にサイトを構築するために**先に検証だけ**してください」= verify first, build second
  - 「FSA/直接ディスク書き出しを**主経路にしない**。StreamSaver.js(ストリーミング)を主経路に」
  - 「自宅サーバーは siatube と同じ感じで動画をプロキシするわけでは**ない**(高負荷)」、
    「ダウンロード**だけ**自宅サーバー Relay を使うようにしたい」
  - 「siatube の api は**使わずに** youtubei.js で**自前実装**にします」
  - (2026-09-23)「iframe を使って動画プレイヤーを実装すれば良さそう。**実際の siatube のコードを
    確認して**」「今の目標から**動画ダウンロードは削除(コメントアウト)**し、**完全に機能する
    YouTube プロキシ閲覧サイト**を構築するのを目標にして」= **iframe 転換 + DL 保留**
- ユーザーは**検証キットを実際に自分で実行して結果を貼付**してくれる(GAS デプロイ・スマホ操作まで
  協力してくれる)。手順は `verification/README.md` に書いてあるので「README を見て実行」で足りる。
- ユーザーの端末環境(参考): Android 10 + SamsungBrowser 30(第 1 回 V2 実行に使用)。
  自宅サーバーは Proxmox/LXC を構想中。
- **設計原則(§3)の禁止表現を守ること**(文書レビューで指摘される)。
- 大きな判断(アーキ変更等)は `ask_user` 系の質問ツールで選択肢付きで聞くのが有効だった。
  小さい修正は説明だけで進んでよい。

## 13. 次の一手(引き継いだらこれ)

1. **V5 キットの実環境実行をお願いする**(2026-09-23 の新規必須検証 = §8.1):
   - `verification/v5-browser-iframe-test.html`(ブラウザで開く。`?probe=1` で自己チェック)
   - `verification/v5b-gas-test.gs`(新しい GAS プロジェクト → `?probe=1` → `?test=search` / `?test=trend`)
   - 目的: **iframe 方式の成立可否**(`youtubeeducation.com` の描画・再生)と、**GAS からの
     検索・トレンド抽出可否**の確定。NG の場合は方式の再検討が必要 = 結果を見て `ask_user` で相談する。
2. **P00 の GO 待ち**(V5 の結果に依存しない P00-B/C/F は先行着手も可):
   - P00-B: `apps/web` スキャフォールド(Next.js + Tailwind v4 + GSAP + M3 トークン + ルータ骨格)
   - P00-C: `packages/shared`(API client 双方向輸送 + types + エラー分類)+ vitest
   - P00-F: M3 Expressive 基線(ホーム / watch スケルトン)
   - **P00-D: GAS 後端 = メタデータ解決**(§8.2。**decipherer は実装しない**)+ O9
   - P00-E: 単一 HTML ビルド + GAS デプロイ手順
   - 推奨順: **B → C → F → E → D**(V5 の結果が D の検索系に効くため D は後半)
3. **作業のたびに commit+push**(§11)。タスク ID をコミットメッセージに含める。
4. `docs/task-list.md` は**常に最新に**(進捗の正本)。


## 14. 引き継ぎプロンプト(新しい AI に初回で貼るもの)

```text
ytdl リポジトリ(shiratama644/ytdl)の開発を引き継いでもらえます。
YouTube プロキシ閲覧サイト(しあTube 相当の閲覧機能 + M3 Design Expressive UI)です。
2026-09-23 に方針転換があり、「再生 = iframe 埋め込み」「動画ダウンロード = 保留(実装対象外)」に
なりました。設計の正本は HANDOVER §4 です。

最初にやること:
1. リポジトリの `docs/HANDOVER.md` を全部読む(コンテキストの唯一の入口)。
2. その指示に従い docs/task-list.md → docs/planning/PHASE0_PLAN.md →
   docs/research/VERIFICATION_P0.md → docs/research/SIATUBE_CODE_VERIFICATION.md の順に読む。
3. ブランチ確認: 作業はセッション固定ブランチ(`git branch --show-current`)。
   main は PR #3 まで取り込み済み。同期手順は §10・§11。

現状の要約:
- 再生 = iframe(`https://www.youtubeeducation.com/embed/{id}` を既定・公式 embed に差し替え可能)。
  しあTube の実コード(ajgpw/siatube@44ab1599)で同方式を確認済み(D1 改訂)。
- バックエンド = 自前の GAS。役割はメタデータ解決(`/watch/` 抽出 = V1 実証済み)。
  signature decipherer / ストリーム URL 解決 / DL 機構 = 保留(D3〜D5/D7/D9)。
- 次の検証 = V5(iframe 到達性 + 検索・トレンド抽出)。ユーザーがキットを実行して結果を貼付する。
- その後は P00 の GO 待ち(推奨順 B → C → F → E → D)。

作業ルール:
- ユーザーとのやり取りは全部日本語。検証してから構築(常設指示)。
- このサンドボックスはターン跨ぎに再クローンする: 変更のたびに commit + push(§11)。
- 絶対表現の禁止(§3 の設計原則)を守る。docs/task-list.md を常に最新に保つ。

最初に、(a) 理解した状況の要約 1 段落、(b) 次に確認したいこと(V5 実行の依頼 / P00 開始の GO)
を日本語で答えてください。
```


---

## 付: 引き継ぎ時点での未完了リスト(明確化)

| # | 項目 | 誰が | 状態 |
|---|---|---|---|
| 1 | ~~V1 検証(v1〜v1f)~~ | ユーザー + AI | **✅ 完了(2026-09-15)** = 抽出の知見はメタデータ経路で活用(復号は保留) |
| 2 | **V5(iframe 到達性 + メタデータ抽出)** | ユーザー + AI | **未着手 = 次に依頼するキット**(§8.1) |
| 3 | **P00 開始の GO** | ユーザー | **待機中** |
| 4 | P00-B ~ P00-F の実装 | AI | 未着手(GO が来たら着手可・推奨順 B → C → F → E → D) |
| 5 | 動画 DL 機能 | - | **保留(実装対象外)**。設計・調査は docs に保存(再開時に参照) |
| 6 | v3b / V4(iOS)の実行 | ユーザー | 任意(保留項目の参考) |
| 7 | PR(main 向け)の作成・マージ | ユーザー | セッション固定ブランチごとに判断 |
