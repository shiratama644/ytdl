# AI 引き継ぎドキュメント(ytdl)

> 作成: 2026-09-14 / 作成者: 前職 AI エージェント(Arena Agent Mode)
> 対象ブランチ: `arena/01a094ec-ytdl` / 最新コミット: ブランチ先端(`c53eddb` = ユーザーの
> V1-b 第 2 回結果 + v1c キット追加を必ず含む)
> **引き継ぐ AI へ: このファイルが第一のエントリポイントです。§1 → §13 の順で読み、
>  §9 に指定したファイル群をその優先順で読んでから作業を開始してください。**

---

## 1. 引き継ぐ AI への最初に読む 5 行

1. **このプロジェクトの全設計判断は確定済み**(§4)。再議論・再提案しないこと。ユーザーが確認済み。
2. **ユーザーとのコミュニケーションは日本語**(返信もドキュメントも)。
3. **ユーザーの常設指示: 「検証してから構築する」**(verify first, build second)。検証はほぼ完了(§6)。
4. **唯一の gating 項 = ユーザー実行の `v1c` キットの結果**(GAS 実環境での解決可行性・第 3 回)。
   `v1b`(第 2 回)は**既に実行済み = 全 client 失敗**(§6)。v1c の結果が来たら §8 のフローで判定 →
   P00-D 着手 or **アーキ分岐**(リゾラの置き場)。P00-B/C/E/F は v1c 非依存 = ユーザーの GO 次第で着手可。
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
| D2 | **リゾラ** | **youtubei.js(esbuild バンドル)による自前実装**。**siatube.com API の使用はしない**(第三者依存排除)。GAS 期 = GAS 内で youtubei.js を UrlFetchApp 経由で動作。NG 時は**自前解決の範囲内**で対策(D7) | 2026-09-14 |
| D3 | **DL(自宅サーバー期)** | **方式 A が主経路**: `/dl` **ダウンロード専用 relay(オンデマンド・DL 時のみ)** → ブラウザ fetch → **Web Worker 内で mp4-muxer/webm-muxer(再エンコードなし)** → **StreamSaver.js**(SW は自ドメイン配信)→ **進捗UI( % / 速度 / ETA / キャンセル / レジューム)**。**方式 B がフォールバック**: yt-dlp バッチ(ダウンロード+mux)→ 完成ファイルを Nginx 配信(Range)。A が不安定(bot チェック/PO token)になったときの補完 | 2026-09-13 |
| D4 | **DL(GAS 期)** | **720p 以下 muxed 直リンクのみ**(ブラウザネイティブ保存。進捗UI/ファイル名制御/キューなし = 縮小機能は承知済み) | 2026-09-13 |
| D5 | **DL(iOS/Firefox)** | 直リンクフォールバック(= D4 相当)。StreamSaver は **Chromium 系のみ対応**(公式)ため | 2026-09-13 |
| D6 | **relay の使用範囲** | **ダウンロードのときのみ。再生には一切使用しない**。自宅サーバーは siatube 型の「動画バイト全面プロキシ」**にはしない**(高負荷のため、ユーザー事前調査)。**常設制約** | 2026-09-13(14 に再確認) |
| D7 | **v1b 失敗時の対策ラダー**(自前解決の範囲内) | ① client 選択(ANDROID は bot チェックに寛容なことが多い) ② clientVersion 鮮度管理 ③ **PO token 生成**(youtubei.js の機能。実証要) ④ raw InnerTube(公開 API key + UrlFetchApp、shiatube v1 と同型) | 2026-09-14 |
| D8 | **v2b(CORS 確定テスト)** | **スキップ**(ユーザー判断)。理由: DL が自社サーバー経路になるため、googlevideo 直 fetch の有無は DL 設計を変えない | 2026-09-13 |
| D9 | **FSA(File System Access API)** | **DL 主経路にしない**(ユーザーが明示的に StreamSaver 主経路を指定)。Chromium での StreamSaver 補完/代替として保持 | 初期 |

## 5. 全体アーキテクチャ(確定版)

```
┌────────────────────────── Phase A: GAS(現在〜移行まで) ──────────────────────────┐
│  [学校LAN] ──HTTPS──▶ script.google.com/macros/s/<id>/exec                        │
│      doGet(e) が 2 役:  1) 単一 HTML 配信(Next.js export + inline)              │
│                        2) ?api= クエリディスパッチ / google.script.run RPC        │
│      ▼ (UrlFetchApp = サーバー間通信、CORS 不要)                                  │
│   youtube.com InnerTube(youtubei.js bundled、client = D7 により決定)              │
│      → JSON(メタ + 署名済み googlevideo URL + itag/codec/httpHeaders)            │
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
Dexie.js 4 / TypeScript / biome / vitest / pnpm workspaces。GAS 後端 = youtubei.js(esbuild バンドル)
または raw InnerTube。自宅サーバー = Bun + Hono + yt-dlp + Nginx。
(詳細: `docs/planning/PHASE0_PLAN.md` §10.4〜§10.6)

## 6. 検証の現状(証跡の正本: `docs/research/VERIFICATION_P0.md`)

| ID | 内容 | 状態 | 要点 |
|---|---|---|---|
| V1-a | youtubei.js バンドル + Node 初期化 | ✅ 完了 | v18.0.0・1.3MB バンドル・create() 到達(通信はサンドボックス遮断のため未実測) |
| **V1-b** | **GAS 実環境でのストリーム解決** | ⏳ **v1c 実行待ち(最重要)** | 第 1 回失敗 / **第 2 回(v1b・コミット `c53eddb`)も全 client 失敗**: C1/C2 embedded(最新 ver 2.20260911.01.00)= ERROR「この動画は再生できません」/ C3 WEB = UNPLAYABLE / C4 ANDROID = HTTP 400。**version 陳腐化は排除**。embed ページは 200/131KB で実取得可(=`/player` 単位の制限)→ **データセンター IP + PO token/visitorData 欠如の疑い**。→ **次 = `v1c-gas-test.gs`**(§8.1): **`/watch/` ページの `ytInitialPlayerResponse` 抽出が主経路**(PO token 不要の可能性)+ `/player` 改善版 + messages 詳細記録 |
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

## 8. ユーザー実行待ちのキットと、結果到着時の対応フロー

### 8.1 v1c(最重要・唯一の gating 項)
- **v1b(第 2 回)は実行済み = 全 client 失敗**(2026-09-13/14、`verification/Verification-Results.md`
  にコミット `c53eddb` で記録): C1/C2 WEB_EMBEDDED_PLAYER(最新 ver 2.20260911.01.00)=
  ERROR「この動画は再生できません」/ C3 WEB = UNPLAYABLE「動画を再生できません」/
  C4 ANDROID = HTTP 400。**version 陳腐化は排除**。embed ページは 200/131KB で実取得可
  (= 制限は `/player` エンドポイント単位)→ **データセンター IP + PO token/visitorData 欠如の疑い**。
- キット: **`verification/v1c-gas-test.gs`**(新規作成・構文+モックスモーク検証済み)。
  中身:
  1. **主経路候補: `/watch/` ページから `ytInitialPlayerResponse` を直接抽出**
     (desktop UA + mobile UA の 2 種)。**PO token を通さない別経路** = ここが OK なら
     GAS 解決は成立(本番リゾラ = watch 抽出)。
  2. `/player` POST を **visitorData + playbackContext + userAgent 付き**で改善
     (C2b embedded / C3b WEB / C4b ANDROID=アプリ UA)。
  3. playabilityStatus の **`messages` 配列**(bot チェック等の詳細が入る)を全部記録。
  4. bot チェック / consent ページの自動検知フラグ。
- **注意: ユーザーに渡すファイルは必ずブランチ先端のもの**(raw URL):
  `https://raw.githubusercontent.com/shiratama644/ytdl/arena/01a094ec-ytdl/verification/v1c-gas-test.gs`
  手元の古いコピーは setMimeType 例外で失敗する(過去に v3b・v1b で 2 回発生)。
  自己チェック: `doGet()` の最後の行が `.setMimeType(ContentService.MimeType.JSON);`(enum)。
- 手順: 新しい GAS プロジェクト → 貼付 → デプロイ(Web アプリ / 自分 / 全員)→
  URL を開く → **JSON を丸ごと送付**(チャット貼付 or リポジトリコミット)。
- **JSON 到着時の判定フロー**:
  1. `watchPage`(desktop)と `watchPageMobile` の `playability` / `formatCount` /
     `botCheck` を見る。
     - **片方でも `playability=OK` かつ `formatCount>0`** → **GAS 解決成立**。
       主経路 = その watch 抽出(desktop か mobile)を本番リゾラに採用 → P00-D 着手。
       (`itags` で 1080p/140 の有無も確認: 144p〜4K の DL 需要に足りるか)
     - **両方とも bot-check 検出 or ERROR** → `/player` 改善版(`players.*`)も見て:
       - players 側で OK があれば → その client+context 構成を採用(ただし watch が死んでいる
         要因は残るので要評価)。
       - **全経路が dead(bot-check / 汎用 unplayable)** → **データセンター IP 壁と判定**。
         → **アーキテクチャ分岐(ユーザーと合意する)**: リゾラを**初期から自宅サーバー
         (yt-dlp・residential IP)へ**移動 = Phase A(GAS)は「リゾラなし」になる。
         この場合の Phase A 設計(例: GAS は配信/キャッシュのみでリゾラは自宅サーバーが
         常時稼働 / か、Phase A をスキップして直接 Phase B)をユーザーと相談して決定し、
         `docs/planning/PHASE0_PLAN.md` §10.2 と task-list を書き換えてから P00 着手。
  2. 判定結果を `docs/research/VERIFICATION_P0.md` V1-b セクションに証跡として追記し、
     `docs/task-list.md` と本 HANDOVER を更新してから次の一手に進む。

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
├── .agent/                          # cod-web 由来の AI エージェント scaffold(ユーザーは .agents/ と呼ぶ)
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
│   ├── Verification-Results.md      # ユーザーの第 1 回 + 第 2 回(v1b)実行結果(生データ)
│   ├── v1-gas-test.gs / v1b-gas-test.gs / v1c-gas-test.gs  # V1 キット(旧 / 中 / **最新=実行待ち**)
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
- **全作業はブランチ `arena/01a094ec-ytdl` にある(先端 = v1c キット追加 commit)。`main`
  は `69db5af`(Initial commit)のまま**。→ 引き継いだセッションでは、作業開始前に
  `git fetch origin` してこのブランチを起点にすること(新しい Arena セッションは
  別の `arena/<id>` ブランチを main から作られる場合がある = その場合は
  `origin/arena/01a094ec-ytdl` をマージ/リベースしてから作業)。
- 主要コミット(新しい順):
  - (先端) v1c キット追加 + v1b 第 2 回結果の分析記録(VERIFICATION_P0 / task-list / README)
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

1. **ユーザーに確認**: 「v1c(第 3 回・watch ページ抽出)は実行できましたか?」
   - 結果(JSON)が来ている場合 → §8.1 の判定フローに従う:
     - **watch OK** → 主経路確定 → 証跡追記(VERIFICATION_P0 / task-list / 本ファイル §6 §10)
       → **P00-D 着手可**。
     - **全経路 dead** → **アーキテクチャ分岐**(リゾラを初期から自宅サーバーへ)を
       ユーザーと相談(§8.1 のフローを踏襲。決定後は PHASE0_PLAN §10.2 と task-list を書き換え)。
   - 未実行の場合 → raw URL + 自己チェック行を再提示(§8.1)。
   - **v1c 結果が来るまで P00-D は着手しない**。
2. **P00-B/C/E/F は v1c に依存しない** = ユーザーの GO 次第で着手可。前職 AI は 2 回
   「着手してよいですか」と確認したが、まだ明示的な GO は無い = 引き継いだら最初に確認すること:
   - P00-B: `apps/web` スキャフォールド(Next.js App Router + `output:'export'` + Tailwind v4 +
     GSAP 導入 + M3 トークン + ルータ骨格)
   - P00-C: `packages/shared`(API client 双方向輸送: GAS の `?api=`/google.script.run と
     Phase B の fetch。types・itag/codec 定数・エラー分類)+ vitest
   - P00-F: M3 Expressive 基線(テーマ + ホーム/watch スケルトン + GSAP 1 種)
   - P00-E: 単一 HTML ビルド(`scripts/build-single-file.ts`)+ GAS デプロイ手順書
   - P00-D: GAS 後端(v1c 結果に基づく主経路の採用 = watch 抽出 or player client)+
     doGet ディスパッチ + `/api/*`
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
3. 作業ブランチの確認: 全作業は GitHub のブランチ `arena/01a094ec-ytdl`(先端 = v1c キット追加
   commit、`c53eddb` ユーザーの v1b 結果を含む)にある。main は古い。自分のセッションブランチに
   `origin/arena/01a094ec-ytdl` を取り込むことを最初にやる(HANDOVER §10・§11 の手順)。

現状の要約:
- 設計は全部確定済み(再生=googlevideo 直読み / リゾラ=youtubei.js 自前(siatube API 不使用)/
  DL=自宅サーバー期は「DL 専用 relay + クライアント側 mux + StreamSaver」主経路、GAS 期は 720p 以下
  直リンク)。HANDOVER §4 を再議論せず踏襲すること。
- ユーザーの 4 設計原則(HANDOVER §3)と禁止表現を守ること。
- 検証の現状: V2(CORS)= 確定 / V1(GAS 解決)= **v1b 第 2 回で全 client 失敗**(version 陳腐化は排除、
  データセンター IP 壁の疑い)。唯一の未完了 = ユーザー実行の検証キット **`v1c`**
  (`/watch/` ページの `ytInitialPlayerResponse` 抽出が主経路。PO token 不要の別経路)。
  結果が来たら HANDOVER §8.1 の判定フローに従う:
  - **watch OK** → GAS 解決成立 → P00-D 着手。
  - **全経路 dead** → **アーキテクチャ分岐**(リゾラを初期から自宅サーバーへ)。ユーザーと合意すること。
- ユーザーから「P00 開始の GO」が来たら P00-B(Next.js スキャフォールド)から着手
  (P00-B/C/E/F は v1c 非依存、P00-D のみ v1c 待ち)。まだ GO が無いなら最初に確認すること。

作業ルール:
- ユーザーとのやり取りは全部日本語。
- 検証してから構築(ユーザーの常設指示)。
- このサンドボックスはターン跨ぎにリポジトリを再クローンする: 変更のたびに必ず
  git commit + git push(HANDOVER §11 の復旧手順を知っておくこと)。
- docs/task-list.md を常に最新に保つ。

最初に、(a) 理解した状況の要約 1 段落、(b) 最初に確認したいこと(v1c の結果の有無、
P00 開始の GO)を日本語で答えてください。
```

---

## 付: 引き継ぎ時点での未完了リスト(明確化)

| # | 項目 | 誰が | 状態 |
|---|---|---|---|
| 1 | **v1c** の実行 + JSON 送付 | ユーザー | **実行待ち**(v1b は完了=全 client 失敗、次は watch ページ抽出の v1c) |
| 2 | P00-B/C/E/F の開始 GO | ユーザー | 前職 AI が 2 回確認済み・GO 未回答 |
| 3 | P00-B ~ P00-F の実装 | AI(P00-D は v1c 後) | 未着手 |
| 4 | **アーキテクチャ分岐の判断**(v1c が全経路 dead の場合のみ発生) | ユーザー + AI | 未発生(判断フローは §8.1) |
| 5 | v3b / V4(iOS)の実行 | ユーザー | 任意・未実施(v3b は DL には不要=参考のみ) |
| 6 | main へのマージ | ユーザー | 未実施(全作業は arena/01a094ec-ytdl にある) |
