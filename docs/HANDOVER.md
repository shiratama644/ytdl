# AI 引き継ぎドキュメント(ytdl)

> 作成: 2026-09-14 / **最終整理: 2026-09-16**(AGENTS.md・.agent/・全ドキュメントを ytdl 現状に同期)
> 対象ブランチ: `arena/01a094ec-ytdl` / 最新コミット: ブランチ先端(`7761203` =
> v1f 結果分析 = **V1 検証完了** を必ず含む)
> **引き継ぐ AI へ: このファイルが第一のエントリポイントです。§1 → §13 の順で読み、
>  §9 に指定したファイル群をその優先順で読んでから作業を開始してください。**

---

## 1. 引き継ぐ AI への最初に読む 5 行

1. **このプロジェクトの全設計判断は確定済み**(§4)。再議論・再提案しないこと。ユーザーが確認済み。
2. **ユーザーとのコミュニケーションは日本語**(返信もドキュメントも)。
3. **ユーザーの常設指示: 「検証してから構築する」**(verify first, build second)。**V1〜V2 は完了(§6)**。
   V3-b / V4 = 任意(参考)。
4. **V1(GAS 解決)= ✅ 全項目完了(v1f・第 6 回 2026-09-15)**: Phase A リゾラ = **`/watch/` ページ
   抽出 + signature decipherer + O9**(リトライ+バックオフ / キャッシュ / single-flight)で**確定**。
   ストリーム URL は全 30 形式 `signatureCipher`(復号必須・youtube-dlp 型 transform 逆変換)。
   **P00-B/C/E/F と P00-D は全て着手可能 = ユーザーの GO 待ち**(P00-D 冒頭 = 復号済み URL の
   fetch 実動作スパイク)。
5. **このサンドボックスはターン跨ぎにリポジトリを再クローンする**。作業のたびに必ず **commit して push**
   (復旧手順は §11)。push しない作業は消える。

## 2. プロジェクト概要

- **ytdl** = YouTube プロキシサイト。「しあTube(静的サイト版)」と**同じ需要構造**(学校のフィルタ回避・
  アカウント不要・広告なし・高画質視聴)に、**2 つの差別化**を持つ:
  1. **動画ダウンロード機能**(拡張子 mp4/webm × 画質 144p〜4K × キュー管理。しあTube に無い)
  2. **Material 3 Design Expressive の UI + GSAP モーション**
- **2 フェーズ運用**:
  - **Phase A(GAS 期・MVP)**: 静的単一 HTML + `script.google.com` の GAS Web アプリ(doGet が
    HTML 配信 + `?api=` JSON ディスパッチの 2 役)。学校環境でそのまま動く。
  - **Phase B(自宅サーバー期)**: Proxmox VE / LXC + Bun(Hono)+ Nginx + yt-dlp。
    移行トリガー: GAS クォータ到達 / googlevideo ブロック / DL 本格利用 など。
- **法的スタンス**: 個人視聴の私的使用(日本著作権法第 30 条圏)を前提。サーバーでの保存・再配信・
  再エンコードはしない(§4 の D6)。
- 前提調査: しあTube の完全調査(ソース精読 + API 実測)を完了済み
  → [`research/SHIATUBE_DEEP_RESEARCH.md`](research/SHIATUBE_DEEP_RESEARCH.md)

## 3. ユーザーの 4 設計原則(**原文のまま**・絶対表現の禁止を含む)

> ユーザーが明示した原則。**文書に書き記す際は絶対表現(「サーバー負荷ゼロ」「完全に」等)を禁止**され、
> 条件付き・検証可能な表現を使うよう指示されている。`docs/planning/PHASE0_PLAN.md` §10.2 に原文登記済み。

1. **サーバー側で動画データを中継・変換しない限り**、動画処理に伴う CPU/メモリ負荷を最小化できる
   (※ 「サーバー負荷は完全にゼロ」は**禁止表現**)
2. **StreamSaver.js 等のストリーミングダウンロード機構を利用し**、巨大な Blob をメモリ上に保持することを避ける
   (※ 「StreamSaver.js でローカルストレージへ直接書き出す」は**禁止表現** = メモリ非保持が趣旨)
3. **再エンコードを行わないため**、FFmpeg 等による再エンコードより CPU 負荷を大幅に低減できる
   (※ 「CPU 負荷は数%〜10%程度」のような数値断定は**禁止表現**)
4. **ブラウザからの直接取得可否(CORS、Range、URL 有効期限、codec/container 対応等)を検証した上で利用する**
   (※ 「生 URL をブラウザへ返せば再生可能」は**禁止表現** = 必ず検証してから利用)

## 4. 確定した設計(全項目ユーザー承認済み・再議論禁止)

| # | 判断 | 内容 | 確定日 |
|---|---|---|---|
| D1 | **再生経路** | ネイティブ `<video>`(映像)+ `<audio>`(音声)の **2 要素 DASH シンクロ再生**(MSE/dash.js/shaka 不使用)。muxed 360p が既定、高画質は DASH。m3u8(ライブ)のみ hls.js。**全フェーズで googlevideo 直読み = サーバー関与ゼロ** | 2026-09-13 |
| D2 | **リゾラ** | **自前実装**。**siatube.com API の使用はしない**(第三者依存排除)。**V1 検証(2026-09-15)により Phase A の実装 = `/watch/` ページ抽出 + signature decipherer + O9 に確定**(GAS 後端に youtubei.js ランタイムは不要 = `/player` InnerTube 経路は GAS IP から不可、3 ラウンド検証。D7 ラダーの「raw InnerTube / watch 経路」が検証採用された形) | 2026-09-14(実装は 09-15 確定) |
| D3 | **DL(自宅サーバー期)** | **方式 A が主経路**: `/dl` **ダウンロード専用 relay(オンデマンド・DL 時のみ)** → ブラウザ fetch → **Web Worker 内で mp4-muxer/webm-muxer(再エンコードなし)** → **StreamSaver.js**(SW は自ドメイン配信)→ **進捗UI( % / 速度 / ETA / キャンセル / レジューム)**。**方式 B がフォールバック**: yt-dlp バッチ(ダウンロード+mux)→ 完成ファイルを Nginx 配信(Range)。A が不安定(bot チェック/PO token)になったときの補完 | 2026-09-13 |
| D4 | **DL(GAS 期)** | **720p 以下 muxed 直リンクのみ**(ブラウザネイティブ保存。進捗UI/ファイル名制御/キューなし = 縮小機能は承知済み) | 2026-09-13 |
| D5 | **DL(iOS/Firefox)** | 直リンクフォールバック(= D4 相当)。StreamSaver は **Chromium 系のみ対応**(公式)ため | 2026-09-13 |
| D6 | **relay の使用範囲** | **ダウンロードのときのみ。再生には一切使用しない**。自宅サーバーは siatube 型の「動画バイト全面プロキシ」**にはしない**(高負荷のため、ユーザー事前調査)。**常設制約** | 2026-09-13(14 に再確認) |
| D7 | **対策ラダー**(自前解決の範囲内) | ① client 選択 ② clientVersion 鮮度管理 ③ **PO token 生成**(実証要) ④ raw InnerTube / **watch ページ抽出(= V1 で Phase A の採用経路と確定)**。Phase A は④が主経路で固定。ラダーは Phase B(yt-dlp・組込み済み)および Phase A の鮮度維持(R1: decipherer が player JS 更新で壊れ得る)に対応するもの | 2026-09-14(15 に確定) |
| D8 | **v2b(CORS 確定テスト)** | **スキップ**(ユーザー判断)。理由: DL が自社サーバー経路になるため、googlevideo 直 fetch の有無は DL 設計を変えない | 2026-09-13 |
| D9 | **FSA(File System Access API)** | **DL 主経路にしない**(ユーザーが明示的に StreamSaver 主経路を指定)。Chromium での StreamSaver 補完/代替として保持 | 初期 |

## 5. 全体アーキテクチャ(確定版)

```
┌────────────────────────── Phase A: GAS(現在〜移行まで) ──────────────────────────┐
│  [学校LAN] ──HTTPS──▶ script.google.com/macros/s/<id>/exec                        │
│      doGet(e) が 2 役:  1) 単一 HTML 配信(Next.js export + inline)              │
│                        2) ?api= クエリディスパッチ / google.script.run RPC        │
│      ▼ (UrlFetchApp = サーバー間通信、CORS 不要)                                  │
│   youtube.com /watch/ ページ抽出(desktop UA + ja-JP) + signature decipherer      │
│      → JSON(メタ + 復号済み googlevideo URL 群 + itag/codec/contentLength/期限)  │
│  [ブラウザ] 再生: <video>/<audio> 直リンク(googlevideo 直)                        │
│           DL:   720p 以下 muxed 直リンク(D4)                                     │
└──────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────── Phase B: 自宅サーバー(Proxmox/LXC、移行後) ────────────┐
│  Nginx(https) ─▶ Bun/Node Hono API(yt-dlp subprocess, PO token)                 │
│                 ─▶ 静的配信(Next.js export)+ Service Worker(StreamSaver・自ド) │
│  再生: <video>/<audio> 直リンク(googlevideo 直 = サーバー関与ゼロ)               │
│  DL 主(A): /dl?src=... (DL 専用 relay・オンデマンド・host whitelist)              │
│            → ブラウザ fetch(ACAO/Content-Length/CD) → Worker mux → StreamSaver   │
│  DL 補完(B): yt-dlp バッチ → 完成ファイルを Nginx 配信(Range)                     │
│  DL fallback(C): 720p 以下 muxed 直リンク(iOS / Firefox)                         │
└──────────────────────────────────────────────────────────────────────────────────┘
```

**技術スタック(確定)**: Next.js(App Router, `output:'export'`)+ Tailwind CSS v4 + GSAP 3.13 +
Dexie.js 4 / TypeScript / biome / vitest / pnpm workspaces。GAS 後端 = **`/watch/` ページ抽出
+ signature decipherer + O9(プレーン JS・youtubei.js ランタイム不使用 = V1 で確定)**。
自宅サーバー = Bun + Hono + yt-dlp + Nginx。
(詳細: `docs/planning/PHASE0_PLAN.md` §10.4〜§10.6)

## 6. 検証の現状(証跡の正本: `docs/research/VERIFICATION_P0.md`)

| ID | 内容 | 状態 | 要点 |
|---|---|---|---|
| V1-a | youtubei.js バンドル + Node 初期化 | ✅ 完了 | v18.0.0・1.3MB バンドル・create() 到達(通信はサンドボックス遮断のため未実測) |
| **V1-b** | **GAS 実環境でのストリーム解決** | **✅ 完了(第 1〜6 回 2026-09-13〜15)** | 第 1 回失敗 / 第 2 回(v1b・`c53eddb`)= 全 client 失敗(version 陳腐化は排除)/ 第 3 回(v1c・`bf513ab`)= キット側の抽出バグ 2 点で未了(ただし **watch ページは 200/718KB で取得成功 + マーカー存在 + botCheck なし** = IP 壁は確定せず)/**第 4 回(v1d・`37b3b94`)= ✅ 成功**: `/watch/` ページの `ytInitialPlayerResponse` 抽出で **playability OK / formats 30 種 / 1080p(137)+ audio(140) 取得成功**(desktop・mobile UA 両方)。**本番リゾラ = watch ページ抽出(Invidious 同型)で確定**。**`/player` エンドポイントは 3 ラウンド連続 dead**(ERROR / UNPLAYABLE / ANDROID 400)→ 使わない。**アーキ分岐(リゾラを初期から自宅サーバーへ)= 不採用**。itags: **itag 22/37(mp4 muxed)なし** → D4(DL・GAS 期)の muxed 直リンクは **itag 18(360p)のみ**(「720p 以下」上限内、高画質 DL は Phase B)。**第 5 回(v1e)= 429(=O9)→ 試行 2 長待ち化(設計ミス)→ 第 6 回(v1f・`6143012`)= ✅ 完了: ストリーム URL = 全 30 形式 `signatureCipher`**(`url`=0 / `ciphertext`=0)→ **復号必須 = Phase A リゾラ = watch 抽出 + signature decipherer + O9(リトライ+バックオフ / キャッシュ / single-flight)で確定**。P00-D 冒頭 = 復号済み URL の fetch 実動作スパイク |
| V2 | ブラウザ直接取得 | ✅ 部分判定で確定 | 第 1 回(ユーザー Android): `<video>` 再生 **OK** / fetch 全 **Failed to fetch** → **CORS(ACAO 欠如)成立**。expire ≈5.9h / 他 IP 再生 OK(ip= 縛りなし)。v2b は D8 でスキップ |
| V3-a | GAS `?_sw=` の HTTP 契約 | ✅ 完了 | ローカル模倣で HTML/JS MIME 同居確認 |
| V3-b | GAS からの SW 登録 | ⏳ 任意(参考) | DL 設計確定で **GAS 期は StreamSaver 不使用** → 「最重要」から**降格**。PWA/オフライン判断用のみ。第 1 回 = text/plain 配信(旧デプロイ)、第 2 回 = setMimeType 例外(私のバグ、修正済み) |
| V4 | iOS Safari 挙動 | ⏳ 任意 | iOS の DL fallback(直リンク)の裏取り。後で |

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

## 8. 検証キットの状態と、P00-D の仕様(着手時にこれ)

### 8.1 V1 = ✅ 完了 → P00-D 着手可能(ユーザー GO 待ち)
- **GAS 実行の検証キットはすべて完了**(v1〜v1f 計 6 ラウンド)。生データ =
  `verification/Verification-Results.md`(現在 = v1f の JSON)。**ユーザーに実行を依頼する
  必須キットは残っていない**(v3b / V4 = 任意・後回し)。
- **P00-D(GAS 後端)の確定仕様**(V1 検証の結果から):
  1. **リゾラ = `/watch/` ページ抽出**: `https://www.youtube.com/watch?v=<id>&hl=ja&gl=JP`
     を desktop UA(+ `Accept-Language: ja-JP`)で UrlFetchApp 取得 → 代入文
     `ytInitialPlayerResponse = {` を正規表現で全候補列挙 → 括弧バランス切片 → JSON.parse →
     `playabilityStatus/streamingData/videoDetails` を持つ実レスポンスを採用
     (v1d/v1f で実証済みのアルゴリズム。`verification/v1f-gas-test.gs` に参照実装あり)。
  2. **signature decipherer**: formats 全形式が `signatureCipher`
     (`s=<cipher>&sp=sig&url=<encoded>`)→ youtube-dlp 型 transform 逆変換で復号
     (player JS からの transform 抽出 → `s` 逆変換 → `decode(url) + &sig=<復号値>`)。
     → **冒頭のスパイク: 復号済み URL を GAS から Range 1 チャンク取得して 200 を確認**
     (ここが通れば設計確定のまま進める)。
  3. **O9 を必ず実装**: 429/5xx のリトライ+バックオフ / **CacheService で解決結果をキャッシュ**
     (TTL = `expiresInSeconds` の数値×安全係数、例: 0.5) / 同一動画の single-flight。
  4. doGet ディスパッチ: `/`(単一 HTML)+ `?api=health|video|search...`(+ `?probe=1` 自己診断)。
     `/player` InnerTube は使わない(§7.7)。
  5. API 返却 = メタ + **復号済み googlevideo URL 群**(itag/codec/qualityLabel/
     approxDurationMs/contentLength)+ `expiresInSeconds`。
- 失敗時のフォールバック: D7 ラダー(別 client / PO token)→ それでも不可なら
  Phase B 早期移行(§11 R1)。

### 8.2 v3b(任意・参考)
- キット: `verification/v3b-gas-test.gs`(修正版 = enum 使用。行 50 が
  `.setMimeType(ContentService.MimeType.HTML);` であること。
  raw: `https://raw.githubusercontent.com/shiratama644/ytdl/arena/01a094ec-ytdl/verification/v3b-gas-test.gs`)
- 手順: 新プロジェクト → 貼付 → **まず `?probe=1` を開いて** `{"test":"V3b",...}` が出ることを確認
  → その URL を開く。ページが描画されたら「結果をコピー」、**文字として表示されたら画面下部の
  コンソールコマンドを F12 コンソールに貼付**して結果を送る。
- 用途: 将来の PWA/オフライン機能(GAS からの SW 配信可否)の判断材料のみ。**DL には不要**。

### 8.3 V4(任意)
- `verification/v2b-browser-test.html` を **iOS(Safari)** で開いて実行 → 「結果をコピー」。
- 用途: iOS の DL fallback(直リンク)の UX 裏取り。

### 8.4 v2b — **スキップ済み(D8)。ユーザーに再提案しない**(ファイルは残置物)。

## 9. リポジトリ構造と正本ファイル

```
ytdl/
├── AGENTS.md / README.md           # エージェント規約・リポジトリ説明
├── .agent/                          # Agent 記憶システム(hooks/skills/logs。※ logs に cod-web 由来の過去ログ = 参照のみ)
├── .archive/cod-web-docs/           # cod-web(別プロジェクト=FPS ゲーム)由来文書。**変更禁止**
├── docs/
│   ├── task-list.md                 # ★ 進捗の唯一の正本(検証 + P00 各タスクのステータス)
│   ├── README.md                    # docs 導覧
│   ├── planning/
│   │   ├── PHASE0_PLAN.md           # ★ 設計正本(P00 計画・§10 で全体設計・§11 リスク・§5 DoD)
│   │   ├── README.md / _TEMPLATE.md
│   ├── research/
│   │   ├── VERIFICATION_P0.md       # ★ 検証証跡(V1〜V4 全記録・設計への影響テーブル・観察 O1〜O7)
│   │   ├── DOWNLOAD_MECHANISM_RESEARCH.md  # ★ DL 機構調査(StreamSaver/直リンク/方式 A・B・C 比較+決定記録 §6)
│   │   ├── SHIATUBE_DEEP_RESEARCH.md       # しあTube 完全調査(API 形状実測等=参考資料)
│   │   └── README.md                # 調査 index
│   └── HANDOVER.md                  # 本ファイル
├── verification/
│   ├── README.md                    # ★ 検証キットの実行手順(ユーザー向け)
│   ├── Verification-Results.md      # ユーザー管理の生データファイル(= 現在 **v1f の JSON**・1 ファイル = 最新の結果のみ)
│   │                                #   第 1〜3 回の生データは git 履歴 + VERIFICATION_P0.md の証跡に残る
│   ├── v1〜v1f の .gs               # V1 キット系(旧→新 / **最新 = v1f = 実行済み・完了**)
│   ├── v2-browser-test.html / v2b-browser-test.html  # V2 キット(旧 / 最新・v2b はスキップ)
│   ├── v3-gas-test.gs / v3b-gas-test.gs      # V3 キット(旧 / 最新)
└── (P00-B 以降で) apps/web, packages/shared, backend/gas, backend/home, scripts/
```

**読む優先順(引き継ぎ時)**:
1. `docs/HANDOVER.md`(本ファイル)
2. `docs/task-list.md`(どこまでやったか)
3. `docs/planning/PHASE0_PLAN.md`(何をどう作るか・§5 DoD・§7 停止条件)
4. `docs/research/VERIFICATION_P0.md`(なぜそう設計したか=証跡)
5. 必要に応じて `DOWNLOAD_MECHANISM_RESEARCH.md` / `SHIATUBE_DEEP_RESEARCH.md` / `verification/README.md`

## 10. git / ブランチ状況(2026-09-14 時点)

- リポジトリ: `shiratama644/ytdl`(GitHub。認証はこの環境で設定済み)
- **全作業はブランチ `arena/01a094ec-ytdl` にある(先端 = `7761203` 以降)**。
  **2026-09-21 に PR #3 経由で `main` へマージ済み**(マージコミット `12aeef8` = main は
  `6143012` / `7761203` / `2944672` 等の証跡 SHA を含む全履歴を保有)。
  → 引き継いだセッションでは、作業開始前に
  `git fetch origin '+refs/heads/*:refs/remotes/origin/*'` してセッションブランチを
  起点にすること(新しい Arena セッションは別の `arena/<id>` ブランチを main から
  作られる場合がある = その場合は main に本作業が已包含されており追加マージは不要)。
- **ユーザーは GitHub Web UI で直接コミットする**(`c53eddb` / `bf513ab` / `0c65cb4` /
  `37b3b94` …)。
  **worktree にユーザーが変更したファイルの古いコピーが残っていることがある** →
  コミット前に必ず `git checkout origin/<ブランチ> -- <ファイル>` で同期し、
  ユーザーが削除したファイルは worktree 側も削除すること(`git add -A` が復元してしまう罠)。
  - 例 1: `bf513ab` で `Verification-Results.md` が削除され `v1c-res.md` がリポジトリ直下に
    追加されていた(Web UI リネ名の事故)→ 整理済み。
  - 例 2: `0c65cb4` で `verification/v1c-res.md` が削除され(結果を
    `Verification-Results.md` に統合)、`37b3b94` で同ファイルに **V1d 結果(JSON)** が書き込まれた
    = **ユーザーの結果管理方針: 1 ファイル = 最新の生結果**。古い生データは git 履歴 +
    `VERIFICATION_P0.md` の証跡に依存してよい。
- **`origin` に `arena/01a0778c-ytdl` という別ブランチがある** = ユーザーの別セッション由来。
  **触らない**(本セッションの作業は `arena/01a094ec-ytdl` のみ)。
- 主要コミット(新しい順):
  - (2026-09-16) ドキュメント全面整理 + AGENTS.md / .agent/ を ytdl 用に全面書き換え(セッション移行準備)
  - `7761203` **v1f 結果分析 = V1 検証完了**(signatureCipher 確定 → P00-D 仕様確定)+ 設計正本更新
  - `6143012` ユーザー: **V1f 実行結果**(= ✅ 全 30 形式 signatureCipher) = **V1 完了の証跡**
  - (8d4bc6b) v1e 試行 2 = 長待ち化の分析 + **v1f 再設計**(probe + 1 fetch/実行)+ 証跡群更新
  - (b520d89) v1e 試行 1 = 429 の分析 + O9 記録
  - `3dcfce9` ユーザー: V1e 試行 1 結果(= HTTP 429)
  - (617d378) v1d 結果分析(= **GAS 解決成立**)+ v1e キット追加 + 証跡群更新
  - `37b3b94` ユーザー: **V1d 実行結果**(`Verification-Results.md` = ✅ watch 抽出成功)
  - `0c65cb4` ユーザー: `v1c-res.md` 削除(結果ファイル統合)
  - (e79d9f7) v1d キット追加 + v1c 結果分析(抽出バグ・watch ページ取得は OK)
  - `bf513ab` ユーザー: v1c 実行結果(抽出バグで未了)
  - (8ba00f8) v1c キット追加 + v1b 第 2 回結果の分析記録
  - `c53eddb` ユーザー: V1-b 第 2 回実行結果(生 JSON)の記録(= **全 client 失敗**)
  - `768f6b0` 本 HANDOVER 作成 + docs/README index 更新
  - `329d902` V1-b 試行 1(旧ファイルによる例外)の記録
  - `7fc320a` 最終判断の記録(リゾラ = youtubei.js 自前 / relay = DL のみ)
  - `8838a68` DL アーキテクチャ確定(A 主 + B フォールバック)
  - `e39c4bc` DL 機構調査書
  - `a2d7bbb` setMimeType enum 修正(v1b/v3b)+ 第 2 回例外の記録
  - `6d35048` 第 1 回結果の記録 + 第 2 回キット追加
  - `071f7e5` ユーザーの第 1 回結果(生データ)
  - `54eef82` 検証ラウンド 1 の準備 / `387fe5d` 設計原則の改述 / `5f8c19e` 基線

## 11. 環境固有の注意点(Arena サンドボックス)

1. **リポジトリの再クローン**: ターン(ユーザー返信)の間に環境がリポジトリを再クローンし、
   **ローカルブランチがクローン起点コミットにリセットされる**(このセッションでは `69db5af`。
   新規セッションでは当時の main 先端)(作業ツリーのファイルは残る)。
   本プロジェクトでは**少なくとも 4 回**発生済み。
   - **対策: 変更があるたびに必ず `git add -A && git commit && git push origin <ブランチ>`**。
   - **復旧**: `git fetch origin '+refs/heads/*:refs/remotes/origin/*'` →
     `git reset --soft origin/<ブランチ>` → `git add -A` →
     `git status`(差分が自分の変更のみか確認)→ commit → push。
   - **push が rejected になったら** = 上に原因。fetch してから同じ手順。
   - `git fetch origin <branch>`(refspec なし)は FETCH_HEAD だけを更新する罠。
     常に `'+refs/heads/*:refs/remotes/origin/*'` を付ける。
2. **サンドボックスの outbound 通信制限**: `youtube.com` / `googlevideo.com` / `siatube.com` への
   直接接続はブロック(SSL_ERROR_SYSCALL)。ウェブページ取得は `fetch_page` ツールで
   (raw.githubusercontent.com は可)。**ユーザーの GAS デプロイ URL の検証も fetch_page で可能**
   (ただしレスポンスヘッダは取れない = allorigins 経由で 1 回だけ取れた実績あり・不安定)。
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
- ユーザーは**検証キットを実際に自分で実行して結果を貼付**してくれる(GAS デプロイ・スマホ操作まで
  協力してくれる)。手順は `verification/README.md` に書いてあるので「README を見て実行」で足りる。
- ユーザーの端末環境(参考): Android 10 + SamsungBrowser 30(第 1 回 V2 実行に使用)。
  自宅サーバーは Proxmox/LXC を構想中。
- **設計原則(§3)の禁止表現を守ること**(文書レビューで指摘される)。
- 大きな判断(アーキ変更等)は `ask_user` 系の質問ツールで選択肢付きで聞くのが有効だった。
  小さい修正は説明だけで進んでよい。

## 13. 次の一手(引き継いだらこれ)

1. **ユーザーに確認: 「P00 開始の GO」**(検証はすべて完了 = §6。ユーザー GO 待ちのみ):
   - **V1(GAS 解決)= ✅ 完了**(v1f で signatureCipher 確定 = P00-D 仕様確定・§8.1)。
     V2(CORS)= 確定 / V3-b・V4 = 任意(後回しで可)。
   - GO が来たら: **P00-B → P00-C → P00-F → P00-E → P00-D** の順で進める
     (P00-D 冒頭 = **復号済み URL の fetch 実動作スパイク** = §8.1 の手順 2)。
   - GO がまだなら → 最初に確認すること(前職 AI は複数回確認済み・未回答)。
2. **P00-B/C/E/F は V1 残作業に依存しない(検証は全完了)** = ユーザーの GO 次第で着手可。
   前職 AI は複数回「着手してよいですか」と確認したが、まだ明示的な GO は無い
   = 引き継いだら最初に確認すること:
   - P00-B: `apps/web` スキャフォールド(Next.js App Router + `output:'export'` + Tailwind v4 +
     GSAP 導入 + M3 トークン + ルータ骨格)
   - P00-C: `packages/shared`(API client 双方向輸送: GAS の `?api=`/google.script.run と
     Phase B の fetch。types・itag/codec 定数・エラー分類)+ vitest
   - P00-F: M3 Expressive 基線(テーマ + ホーム/watch スケルトン + GSAP 1 種)
   - P00-E: 単一 HTML ビルド(`scripts/build-single-file.ts`)+ GAS デプロイ手順書
   - P00-D: GAS 後端(主経路 = **watch ページ抽出**(v1d で確定)+ **signature decipherer**
     (必須 = v1f で全形式 signatureCipher を確認)+ O9)+ doGet ディスパッチ + `/api/*`
   - 各タスクの DoD は `docs/planning/PHASE0_PLAN.md` §5、作業手順は §8(完了時に行うこと)。
3. **作業のたびに commit+push**(§11)。タスク ID をコミットメッセージに含める。
4. `docs/task-list.md` は**常に最新に**(進捗の正本)。

## 14. 引き継ぎプロンプト(新しい AI に初回で貼るもの)

```text
ytdl リポジトリ(shiratama644/ytdl)の開発を引き継いでもらえます。
YouTube プロキシサイト(しあTube 同等 + ダウンロード機能 + M3 Design Expressive UI)の
P0(基盤構築)前の検証フェーズを完了し、設計判断が全部確定した状態からの引き継ぎです。

最初にやること:
1. リポジトリの `docs/HANDOVER.md` を全部読む(これがコンテキストの唯一の入口)。
2. その指示に従って、docs/task-list.md → docs/planning/PHASE0_PLAN.md →
   docs/research/VERIFICATION_P0.md の順に読む。
3. 作業ブランチの確認: 全作業は GitHub のブランチ `arena/01a094ec-ytdl`(先端 = 2026-09-16 の
   ドキュメント整理 commit 以降。`6143012` ユーザーの v1f 結果 + `7761203` 分析を含む)にある。
   2026-09-21 に main へマージ済み(PR #3)= main 起点の新セッションなら本作業は已包含。
   セッションブランチに本作業が含まれていない場合、`origin/arena/01a094ec-ytdl` を
   取り込むことを最初にやる(HANDOVER §10・§11 の手順)。

現状の要約:
- 設計は全部確定済み(再生=googlevideo 直読み / リゾラ=自前実装(siatube API 不使用)= Phase A:
  `/watch/` ページ抽出 + signature decipherer + O9(V1 検証済み)/ DL=自宅サーバー期は
  「DL 専用 relay + クライアント側 mux + StreamSaver」主経路、GAS 期は 720p 以下直リンク)。
  HANDOVER §4 を再議論せず踏襲すること。
- ユーザーの 4 設計原則(HANDOVER §3)と禁止表現を守ること。
- 検証の現状: V2(CORS)= 確定 / **V1(GAS 解決)= ✅ 全項目完了**(第 1〜6 回・2026-09-13〜15、
  最終 = v1f): `/watch/` ページの `ytInitialPlayerResponse` 抽出で **playability OK /
  formats 30 種 / 1080p+140 取得成功**(第 4 回・v1d)→ ストリーム URL = **全 30 形式
  signatureCipher**(v1f)→ **本番リゾラ = watch ページ抽出 + signature decipherer + O9
  (リトライ/キャッシュ/single-flight)で確定**(HANDOVER §7.7/§8.1)。
  `/player` エンドポイントは dead(使わない)。**アーキ分岐(リゾラを初期から自宅サーバーへ)=
  不採用**。**ユーザーに実行していただく検証キットは残っていない**(v3b/V4 = 任意)。
- ユーザーから「P00 開始の GO」が来たら P00-B(Next.js スキャフォールド)から着手
  (P00-B → C → F → E → **D**(冒頭 = 復号済み URL の fetch 実動作スパイク))。
  検証は完了しているので GO 次第で全部着手可。まだ GO が無いなら最初に確認すること。

作業ルール:
- ユーザーとのやり取りは全部日本語。
- 検証してから構築(ユーザーの常設指示)。
- このサンドボックスはターン跨ぎにリポジトリを再クローンする: 変更のたびに必ず
  git commit + git push(HANDOVER §11 の復旧手順を知っておくこと)。
- docs/task-list.md を常に最新に保つ。

最初に、(a) 理解した状況の要約 1 段落、(b) 最初に確認したいこと(P00 開始の GO の有無)
を日本語で答えてください。
```

---

## 付: 引き継ぎ時点での未完了リスト(明確化)

| # | 項目 | 誰が | 状態 |
|---|---|---|---|
| 1 | ~~V1 検証(v1〜v1f)~~ | ユーザー + AI | **✅ 完了(2026-09-15)** = Phase A リゾラ確定(watch 抽出 + decipherer + O9) |
| 2 | **P00 開始の GO** | ユーザー | **待機中**(前職 AI が複数回確認済み・未回答) |
| 3 | P00-B ~ P00-F の実装 | AI | 未着手(**GO が来たら全部着手可**・P00-D 冒頭 = 復号済み URL の fetch スパイク) |
| 4 | **アーキテクチャ分岐の判断** | ユーザー + AI | **不要**(GAS 解決は成立) |
| 5 | v3b / V4(iOS)の実行 | ユーザー | 任意・未実施(v3b は DL には不要=参考のみ) |
| 6 | ~~main へのマージ~~ | ユーザー + AI | **✅ マージ済み(2026-09-21・PR #3 / マージコミット `12aeef8`)** |
