# AI 引き継ぎドキュメント(ytdl)

> 作成: 2026-09-14 / **最終更新: 2026-09-23**(DOC-3 = 「最初からサーバーを立てて構築する」方針へ転換。DOC-2 = iframe 転換 + DL 保留)
> 対象ブランチ: **セッション固定ブランチ**(Arena のセッションごとに `arena/<id>-ytdl`)。
> 必ず `git branch --show-current` で確認する(§10)
> **引き継ぐ AI へ: このファイルが第一のエントリポイントです。§1 → §13 の順で読み、
>  §9 に指定したファイル群をその優先順で読んでから作業を開始してください。**

---

## 1. 引き継ぐ AI への最初に読む 5 行

1. **このプロジェクトの全設計判断は確定済み**(§4)。再議論・再提案しないこと。ユーザーが確認済み。
2. **ユーザーとのコミュニケーションは日本語**(返信もドキュメントも)。
3. **常設指示: 「検証してから構築する」**(verify first, build second)、**「最初からサーバーを立てて作る」**
   (2026-09-23 追記)。現在の必須検証 = **V5(ブラウザ側 iframe 到達性)・V6(サーバー側メタデータ取得)**。
4. **確定した方向(2026-09-23)**: ① 再生は **iframe 埋め込み**(しあTube と同じ `youtubeeducation.com/embed`)
   ② **最初から自宅サーバーで構築**(Proxmox + Docker Compose = Nginx + Bun/Hono API。**GAS 期は設けない**)
  ③ メタデータ解決 = **youtubei.js(InnerTube クライアント)** ④ **動画 DL は目標から除外して保留**(将来の DL は yt-dlp が担当)
   (実装対象外・設計は docs に保存) ⑤ ストリーム URL 解決 / signature decipherer = **保留**。
5. **このサンドボックスはターン跨ぎにリポジトリを再クローンする**。作業のたびに必ず **commit して push**
   (復旧手順は §11)。push しない作業は消える。
## 2. プロジェクト概要

- **ytdl** = YouTube プロキシ閲覧サイト。「しあTube(静的サイト版)」と**同じ需要構造**(学校のフィルタ回避・
  アカウント不要・広告なし・高画質視聴)を持つ。**2026-09-23 のユーザー決定で再定義**:
  1. **再生 = iframe 埋め込み**(しあTube の既定方式と同じ。`https://www.youtubeeducation.com/embed/{id}`)
  2. **最初からサーバーを立てて構築**(自宅 **Proxmox(LXC/VM)** 上に **Docker Compose** で
     **Nginx + Bun(Hono) API** を配備する。**GAS 期は設けず、GAS は実装しない**(検証資産のみ保存)
  3. **メタデータ解決 = youtubei.js**(InnerTube の JavaScript クライアント。サーバー側で実行し、再生バイトは中継しない)。**yt-dlp は将来のダウンロード機能で使う**(現段階では導入しない)
  4. **差別化 = Material 3 Design Expressive の UI + GSAP モーション**
  5. ~~動画ダウンロード機能~~ → **保留**(目標から除外。実装しないが設計・調査は docs に保存)
  - 機能範囲 = **しあTube 相当フル**(トレンド / 検索+サジェスト / 視聴+関連+コメント / チャンネル /
    プレイリスト / 履歴 / 登録 / 設定。DL を除く)
- **構成(2026-09-23 確定 = §4 の D10〜D12)**: クライアント(Nginx が配信する静的 export)+ 自前 API という、
  **しあTube の生産アーキに近い形**。GAS / 単一 HTML 配布は採用しない。
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
| D2 | **バックエンド** | **自前実装**(第三者 API 不使用 = 継続)。役割は**メタデータ解決**。**2026-09-23 改訂(2 回目): メタデータは youtubei.js(InnerTube クライアント)で取得する**(検索 / 動画 / チャンネル / プレイリスト / 統計 / Live Chat)。**signature decipherer・ストリーム URL 解決は保留** | 2026-09-14(09-23 改訂) |
| D3 | **DL(自宅サーバー期)= 保留** | 旧設計: 方式 A 主(`/dl` DL 専用 relay → Worker で mp4/webm-muxer → StreamSaver → 進捗UI)+ 方式 B 補完(yt-dlp バッチ)。**2026-09-23 ユーザー決定で実装対象外**(設計は docs に保存) | 2026-09-13(09-23 保留) |
| D4 | **DL(GAS 期)= 保留** | 旧設計: 720p 以下 muxed 直リンクのみ(実測 = itag 22/37 なし → itag 18 のみ)。**実装対象外** | 2026-09-13(09-23 保留) |
| D5 | **DL(iOS/Firefox)= 保留** | 旧設計: 直リンクフォールバック(StreamSaver は Chromium 系のみ)。**実装対象外** | 2026-09-13(09-23 保留) |
| D6 | **relay の使用範囲** | **再生経路のサーバー中継はしない**(iframe 方式で確定 = 再生はブラウザ ↔ YouTube 系で完結)。**2026-09-23 追記: サーバーは最初から立てる**(D10)が、役割はメタデータ解決とキャッシュに限定し、siatube 型の動画全面プロキシにはしない(常設)。**DL 専用 relay は保留** | 2026-09-13(09-23 改訂) |
| D7 | **対策ラダー = 保留** | 旧設計: client 選択 / clientVersion 鮮度 / PO token / decipherer churn 対策。**直リンク再開時に再開**(iframe 方式では不要) | 2026-09-14(09-23 保留) |
| D8 | **v2b(CORS 確定テスト)** | **スキップ**(ユーザー判断・変更なし)。**再提案しない** | 2026-09-13 |
| D9 | **FSA = 保留** | 旧設計: DL 主経路にしない(StreamSaver 指定)。**DL 保留に伴い対象外** | 初期(09-23 保留) |
| **D10** | **サーバー一本(2026-09-23 新規)** | 自宅 **Proxmox(LXC/VM)** 上に **Docker Compose(Nginx + Bun/Hono API)** を**最初から**構築する。**GAS 期を設けず、GAS 版は実装しない**(GAS の検証資産 = `verification/v1*`・`v3*`・`v5b-gas-test.gs` は参考として保存) | 2026-09-23 |
| **D11** | **メタデータ取得(2026-09-23 新規・09-23 改訂)** | **youtubei.js(InnerTube クライアント)で取得する**(検索 / 動画 / チャンネル / プレイリスト / 統計 / Live Chat)。第三者 API 不使用は維持。**自前のページ抽出は実装しない**(アルゴリズムは V1-d の証跡として保存) | 2026-09-23 |
| **D12** | **クライアント配信(2026-09-23 新規)** | **Nginx による静的配信**(Next.js `output: 'export'`)。単一 HTML 化は**任意**(ミラー配布用。GAS 配布がなくなったため必須ではない) | 2026-09-23 |
| **D13** | **yt-dlp の役割(2026-09-23 新規)** | **将来のメディア取得・ダウンロード担当**(動画/音声の DL・HLS/DASH ストリーム・複雑なフォーマット選択と結合・ライブ配信の取得など、youtubei.js だけでは扱いにくい処理)。**現段階では導入しない**(DL = 保留 = D3 のため)。DL を再開する時に導入する | 2026-09-23 |

## 5. 全体アーキテクチャ(2026-09-23 改訂 = サーバー一本)

```
┌──────────────── 自宅サーバー(最初から構築・Proxmox LXC/VM) ────────────────────┐
│ Docker Compose                                                                   │
│   nginx(443/TLS) ──┬──▶ 静的配信(Next.js export のビルド成果物)                │
│                    └──▶ /api/* を api コンテナへリバースプロキシ                 │
│   api(Bun + Hono) ──▶ メタデータ解決(youtubei.js = InnerTube クライアント)     │
│        ├─ 検索 / 動画 / チャンネル / プレイリスト / 統計 / Live Chat              │
│        └─ + O9: キャッシュ(TTL)/ リトライ+バックオフ / single-flight              │
│        → JSON(メタデータのみ: タイトル/投稿者/長さ/サムネイル/関連/コメント)     │
│        ※ ストリーム URL は取得・返却しない(iframe 再生では不要)                 │
│        ※ yt-dlp(将来の DL 担当 = D13)は現段階では導入しない                     │
│                                                                                  │
│  [ブラウザ] 再生: iframe ─▶ https://www.youtubeeducation.com/embed/{id}?{params} │
│        (ブラウザ ↔ YouTube 系で完結 = 再生にサーバーは関与しない)                │
└──────────────────────────────────────────────────────────────────────────────────┘

旧構成(GAS 期 + 単一 HTML 配布)は 2026-09-23 の決定で**採用しない**(証跡 = §6 / docs/research/)。
```

**技術スタック(確定)**: クライアント = Next.js(App Router, `output:'export'`)+ Tailwind CSS v4 +
GSAP 3.13 + Dexie.js 4 / TypeScript / biome / vitest / pnpm workspaces。
API = **Bun + Hono**(TypeScript)+ **youtubei.js**(InnerTube クライアント)/ **Nginx**(TLS・静的配信・リバースプロキシ)/
**Docker Compose** / 配備先 = 自宅 **Proxmox VE(LXC/VM)**。
再生 = **iframe 埋め込み**(再生は YouTube 系 embed が担う = プレイヤー実装は薄い)。
(詳細: `docs/planning/PHASE0_PLAN.md` §10.4〜§10.7・§10.9)
## 6. 検証の現状(証跡の正本: `docs/research/VERIFICATION_P0.md`)

> **2026-09-23 更新(サーバー一本)**: GAS 期を設けないため、V1〜V4 は「GAS 期の証跡 = 参考
> (ページ抽出アルゴリズムはサーバー実装へ継承)」。**現行で必要なのは V5(ブラウザ側)と V6(サーバー側)**。

| ID | 内容 | 状態 | 要点 |
|---|---|---|---|
| V1-a | youtubei.js バンドル + Node 初期化 | ✅ 完了(参考 → **現行の前提**)| v18.0.0 のバンドル(1.3MB)と create() 到達を実測。**2026-09-23 追記: v18.1.0 を Node 22 で直接 import し、ネットワークなしで `Innertube.create()` が成立することを実測**(§7.10) |
| **V1-b** | **GAS からのページ抽出** | ✅ 完了(参考) | 第 1〜6 回(2026-09-13〜15)。**第 4 回(v1d)= `/watch/` ページ抽出成功**(playability OK / 30 形式)/ 第 6 回(v1f)= 全 30 形式 `signatureCipher`。**`/player` InnerTube = GAS(Google DC)IP から 3 ラウンド連続 dead**(この結果は当時の GAS IP に限る = **自宅 IP での可否は V6 で確認**)。抽出アルゴリズムは V1-d の証跡として保存(**現段階では実装しない**)。decipherer は保留 |
| V2 | ブラウザ直接取得 | ✅ 完了(参考) | 第 1 回(ユーザー Android): `<video>` 再生 **OK** / fetch 全 **Failed to fetch** = **CORS(ACAO 欠如)**。**DL 保留により決定打ではない**(直リンク再開時の判断材料) |
| V3-a | GAS `?_sw=` の HTTP 契約 | ✅ 完了(参考) | ローカル模倣で HTML/JS MIME 同居確認。GAS を採用しないため当面用途なし |
| V3-b | GAS からの SW 登録 | ⏳ 参考(DL/PWA 再開時) | 第 1 回 = text/plain 配信(旧デプロイ)/ 第 2 回 = setMimeType 例外(修正済み)。**サーバー構成では SW は自ドメイン配信 = 制約なし**(自前サーバーで試す場合は V3-b の代わりに通常の SW として検証) |
| V4 | iOS Safari 挙動 | ⏳ 参考(DL 再開時) | iOS の DL fallback(直リンク)の裏取り。**DL 保留に伴い後回し** |
| **V5** | **iframe 到達性(ブラウザ側・実行待ち)** | **未着手** | ① `youtubeeducation.com/embed` が学校/自宅の回線で描画・再生できるか ② 公式 embed(`youtube-nocookie.com` 等)の到達性 ③ 埋め込み先からの Player API 直接読込可否 ④ 広告・画質・ログイン要求の挙動(目視)。キット = `verification/v5-browser-iframe-test.html`(`?probe=1` 内蔵)。**サーバー有無に依存しない検証** |
| **V6** | **サーバー側メタデータ取得(新規・実行待ち = youtubei.js の前提確認)** | **未着手** | ① youtubei.js の解決・クライアント生成 ② **InnerTube(生 fetch)が自宅回線から通るか**(watch ページの API キー取得 / `/player` / `/search`)③ youtubei.js の実機能(検索 / 動画 / チャンネル / プレイリスト / ホーム / トレンド / Live Chat)④ yt-dlp の有無(将来の DL 用の記録)。キット = `verification/v6-metadata-check.mjs`(**v2**・Node/Bun・依存なし + `--mode=youtubei` は youtubei.js が必要) |

**旧 GAS 期に判明した制約(参考・サーバー構成では影響しない)**:
- **O7**: `ContentService.TextOutput.setMimeType` は `MimeType` 列挙型のみ(String は例外)。GAS を使わないため参考。
- **O5**: GAS のデプロイは旧版を配信し続ける → 旧 GAS キット運用の話。現在は該当なし。
- **O9(HTTP 429 レート制限)**: 実在(キット累計 ~13 回/1 時間で発生)。**サーバー API でも
  「リトライ+バックオフ / キャッシュ(TTL)/ single-flight」を実装する**(毎リクエストで YouTube へ
  再取得しない。InnerTube / youtubei.js の呼び出しをキャッシュで吸収する)**。
  無制限に起動しない)。
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

> **2026-09-23 追記**: 私たちの新構成(自宅サーバー + API + InnerTube クライアント)は、**この生産アーキに近い形**になった
> (GAS 期を設けない決定 = §4 の D10/D11)。siatube.com へは依存しない(自前で同じ役割を持つ)。
- しあTube 元アーキ = 静的 Vue SPA + 中央 API(siatube.com、yt-dlp + InnerTube ベース)。
  ストリーム URL = 署名済み googlevideo 直リンク(本検証でその挙動を実測)。
- **第三者から連続アクセスすると 2 回目で空 HTML が返る現象を確認**(O1)= 中央 API 依存の
  脆弱性。D2 で依存しないことにした根拠の一つ。
- API 応答形状(`counts` / `streams.{muxed,videoOnly,audioOnly}` / `httpHeaders` /
  `audioOnly` 配列に null エントリを含むクセ=O4 等)は**本プロジェクトの API 設計・
  応答正規化の参考資料**として有効(§10.6 API v1 はこれに準拠)。

### 7.7 V1 検証の最終知見(2026-09-15・実測・再確認不要)

> **2026-09-23 追記(2 回目あり = 重要)**: ここで「使わない」と判断した `/player` InnerTube は、**GAS(Google DC)IP からの実測**。
> **現行構成のメタデータは youtubei.js(InnerTube)を使う**(D11 改訂)ため、**自宅回線からの可否は V6 で確認する**(結論を先取りしない)。
> ページ抽出アルゴリズムは V1-d の証跡として保存し、**現段階では実装しない**。
> ページ抽出と検索/トレンドの可否は **V6 で再確認する**(結論を先取りしない)。
- **`/player` InnerTube エンドポイントは GAS(Google DC)IP から 3 ラウンド連続で dead**
  (WEB_EMBEDDED_PLAYER/WEB = 200 だが playability ERROR/UNPLAYABLE・汎用 reason /
  ANDROID = HTTP 400 Precondition check failed / visitorData+playbackContext 付きでも同様)
  → **使わない**。
- **`/watch/` ページの HTML スクレイピングは完全に開いている**(200 / ~700KB / ja-JP /
  consent でも botCheck でもない / fetch 1.3 秒)。
- **watch ページの player response の formats は全形式 `signatureCipher`**(`url` フィールド
  は無い): `s=<暗号化シグネチャ>&sp=sig&url=<URL エンコード済みの videoplayback URL>`。
  `url` 部分には **`expire` / `ei` / `ip=<GAS 出口 IP>`** が既に含まれる = 欠落するのは署名のみ。
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
  JSON 返却)。**GAS では YouTube 解決をしない**。**2026-09-23 の決定(D10)により、私たちも
  「自前サーバーが解決の主体」という同じ役割分担になった**(GAS は採用しない)。
- **Player API 初期化に失敗しても iframe は残す**実装 = 再生自体は API なしで成立する。
- 詳細(コード抜粋・出典 URL・未検証項目) = [`research/SIATUBE_CODE_VERIFICATION.md`](research/SIATUBE_CODE_VERIFICATION.md)。

### 7.9 サーバー一本の決定(2026-09-23・ユーザー決定)
- **決定**: プロジェクトは**最初からサーバーを立てて作る**。GAS 期(= 静的単一 HTML + `script.google.com` の
  2 役構成)は**設けない**。理由の要約: GAS の制約(`UrlFetchApp` のみ / 6 分 / 日次クォータ / デプロイが旧版を
  配信し続ける = O5・O7)を持ち込まずに済み、**メタデータ取得の手段が増える**(youtubei.js で InnerTube を
  直接扱える、キャッシュの自由度が高い、CORS ヘッダを付けられる)。
  キャッシュの自由度が高い、CORS ヘッダを付けられる)。
- **選択(ユーザー)**: スタック = **Bun + Hono + Nginx(Docker Compose)** / メタデータ = 
  **youtubei.js(InnerTube クライアント)** / 配備先 = **自宅 Proxmox(LXC/VM)**。**yt-dlp は将来の DL 担当**(D13)。
  ページ抽出フォールバック** / 配備先 = **自宅 Proxmox(LXC/VM)**。
- **再生は変わらない**: iframe(クライアント側)。**サーバーは再生バイトを中継しない**(D6)。
- **GAS の検証資産**: **O9(429 の知見)は継承**。V1 のページ抽出アルゴリズムは**証跡として保存**(現段階では実装しない)、GAS 固有の制約(O5/O7)は参考として保存。
- **未検証(断定しない)**: 自宅回線から **youtubei.js / InnerTube が通るか**(検索 / 動画 / チャンネル / プレイリスト / トレンド / Live Chat)= **V6**。

### 7.10 youtubei.js(現段階の YouTube クライアント)の実測(2026-09-23)

> 出典: サンドボックスでの実測(`npm install youtubei.js@18.1.0` → import → `Innertube.create()`)と
> V1-a(バンドル検証)。**ネットワーク越しの可否(InnerTube が通るか)はサンドボックスでは確認できない = V6**。

- **版**: `youtubei.js@18.1.0`(2026-09-22 公開)が最新。**MIT ライセンス**。**ESM**(`"type": "module"`)。
  依存 = `fflate` / `meriyah` / `@bufbuild/protobuf` の 3 つ(汎用の軽量ライブラリ)。
- **実行**: Node 22 で**直接 import できた**(394 ms)。**Bun では未実測**(サンドボックスに Bun がない)。
- **オフラインでクライアント生成が可能**: `Innertube.create({ lang:'ja', location:'JP',
  generate_session_locally: true, retrieve_player: false, retrieve_innertube_config: false })` が
  **ネットワークなしで成立**(73 ms・clientName = `WEB`)→ **ネットワーク不要のユニットテストが書ける**。
- **API 面(型定義で確認)**: `search(query, { type: 'video' | 'channel' | 'playlist' | 'movie' | 'shorts' | 'all' })` /
  `getSearchSuggestions(query)` / `getInfo(videoId)` / `getBasicInfo(videoId)` / `getComments(videoId, sort)` /
  `getChannel(id)` / `getPlaylist(id)` / `getPlaylists()` / `getHomeFeed()` / `getHistory()` /
  `getSubscriptionsFeed()` / `getHashtag(tag)` / `getStreamingData()` / `download()` /
  `yt.actions.execute(endpoint, args)`。**Live Chat** = `getInfo(id).getLiveChat()`(VideoInfo 側のメソッド)。
  **トレンド**(`/feed/trending` 相当)は専用メソッドが見当たらないため `yt.actions.execute('/browse', { browseId: 'FEtrending' })`
  を使う想定(**V6 で確認する**)。
- **クライアント種別**: `InnerTubeClient` = `WEB`(既定)/ `MWEB` / `IOS` / `ANDROID` / `ANDROID_VR` / `VISIONOS` /
  `TV` / `TV_EMBEDDED` / `WEB_EMBEDDED` / `WEB_CREATOR` / `YTMUSIC` / `YTKIDS` など(`create({ client_name })` で指定)。
- **サーバー実装での前提**: **プロセスで 1 個のクライアントを使い回す**(セッション / Cache を保持)。
  O9(レート制限対策)は InnerTube 呼び出しにも適用する(キャッシュ + single-flight)。
- **限界(ユーザー指摘)**: メディア取得・ライブ配信の録画などは youtubei.js だけでは扱いにくい → **将来 yt-dlp が担当**(D13)。

## 8. 検証キットの状態と、P00(サーバー実装)の仕様(着手時にこれ)

### 8.1 V5(ブラウザ側・実行待ち)= iframe 到達性
- キット `verification/v5-browser-iframe-test.html`(ブラウザで開く)= ① `youtubeeducation.com/embed`
  の描画・再生 ② 公式 embed(`youtube-nocookie.com` 等)の到達性 ③ 埋め込み先からの Player API
  直接読込可否 ④ 広告・画質・ログイン要求の挙動(目視)。`?probe=1` 内蔵。
- 目的: **iframe 方式の成立可否**を学校・自宅の回線で確認する。NG の場合は `ask_user` で方式を再検討する
  (公式 embed のみ運用 / 直リンク再生の再検討 等)。
- 旧キット `verification/v5b-gas-test.gs`(GAS からの検索/トレンド抽出)は **GAS を実装しないため不要**
  (= サーバー版の V6 に読み替え。ファイルは参考として保存)。

### 8.2 V6(サーバー側・実行待ち)= youtubei.js / InnerTube の前提確認(新規・キット v2)

- キット `verification/v6-metadata-check.mjs`(**v2**)= **Node/Bun で実行する 1 ファイル**。
  - `--mode=probe` = 環境 + youtubei.js の解決 + yt-dlp の有無(**ネットワーク 0 回**)
  - `--mode=innertube` = 生 fetch で **InnerTube が自宅回線から通るか**(watch ページの API キー取得 →
    `/youtubei/v1/player` → `/youtubei/v1/search` = 3 リクエスト)
  - `--mode=youtubei` = **youtubei.js の実機能**(既定 steps = `search,video`。`--steps=all` で
    channel / playlist / home / trending / livechat も実行)
  - `--mode=all` = innertube + youtubei(既定 steps)/ `--mode=ytdlp` = yt-dlp の有無(将来の DL 用の記録)
  - **1 回の実行で JSON を出力**(そのまま送付できる)。**10 分ガード**つき(連続実行を避ける)
- youtubei.js を使う検証のため、先に `npm install youtubei.js`(キットと同じディレクトリ。別の場所なら `--deps=<パス>`)
  が必要。`--mode=probe` だけならインストール不要。
- 実行場所: **自宅サーバー(または同じ回線の PC)**。サンドボックスからは YouTube に到達できない(§11-2)。

### 8.3 P00 の仕様(2026-09-23 改訂 = サーバー一本。着手時にこれ)
1. **構成**: `apps/api`(Bun + Hono)= メタデータ API / `deploy/`(Docker Compose: nginx + api、Proxmox 手順・TLS) /
   `apps/web`(Next.js `output:'export'`)/ `packages/shared`(API client + types)。
2. **メタデータ解決(youtubei.js)**: `apps/api` 内で `youtubei.js` のクライアントを**生成して使い回す**
   (リクエストごとに作らない)。初期化 = `Innertube.create({ lang: 'ja', location: 'JP' })`
   (テストでは `generate_session_locally: true` 等で**ネットワーク不要**にする = §7.10)。
   取得対象 = 検索 / 動画(統計・サムネイル・長さ)/ チャンネル / プレイリスト / コメント / サジェスト /
   トレンド / Live Chat(必要になった段階で)。**yt-dlp と自前ページ抽出は実装しない**(D11/D13)。
3. **返すのはメタデータのみ**。**ストリーム URL と DL 用フィールドは返さない**(保留 = D3〜D5/D9)。
4. **O9 を実装**: キャッシュ(TTL = 対象別。例: 検索 5〜15 分 / 動画メタ 30〜60 分)+ リトライ+バックオフ +
   single-flight。**YouTube への再取得をキャッシュで吸収する**(毎リクエストで叩かない)。
5. **API 面**: `/api/health` `/api/video/{id}` `/api/search` `/api/suggest/` `/api/channel/{id}` /
   `/api/playlist/{id}` `/api/comments` `/api/trend`。CORS は自ドメインのみ許可(公開範囲の判断は §10.12)。
6. **再生(クライアント)**: iframe = `https://www.youtubeeducation.com/embed/{id}?{params}`(既定。
   公式 embed へ設定で差し替え可)。パラメータはクライアント側の設定定数(しあTube のスプレッドシート方式は
   採用しない。必要になった場合に再検討 = §7.8)。
- **保留**(実装しない): signature decipherer / ストリーム URL 解決 / DL 機構(D3〜D5/D9)。
  再開時は VERIFICATION_P0.md の V1 解析 + `DOWNLOAD_MECHANISM_RESEARCH.md` を参照する。

### 8.4 旧 GAS キット(参考・ユーザーに実行を依頼しない)
- `verification/v1*`・`v3*`・`v5b-gas-test.gs` = 旧 GAS 期のキット(2026-09-23 の決定で GAS は実装しない)。
- 依頼するのは **V5(ブラウザ)と V6(サーバー)のみ**。

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
│   │   └── README.md / _TEMPLATE.md
│   ├── research/
│   │   ├── VERIFICATION_P0.md       # ★ 検証証跡(V1〜V6・設計への影響・観察 O1〜O9)
│   │   ├── SIATUBE_CODE_VERIFICATION.md    # ★ しあTube 実コード確認(iframe 方式・2026-09-23)
│   │   ├── DOWNLOAD_MECHANISM_RESEARCH.md  # DL 機構調査(**保留**。StreamSaver/方式 A・B・C の記録)
│   │   ├── SHIATUBE_DEEP_RESEARCH.md       # しあTube 完全調査(参考資料・仕様正本ではない)
│   │   └── README.md                # 調査 index
│   └── HANDOVER.md                  # 本ファイル
├── verification/
│   ├── README.md                    # ★ 検証キットの実行手順(ユーザー向け)
│   ├── Verification-Results.md      # ユーザー管理の生データ(= 現在 **v1f の JSON**・1 ファイル = 最新のみ)
│   ├── v1〜v1f / v2・v2b / v3・v3b  # 旧 GAS 期のキット(参考・実行不要)
│   ├── v5-browser-iframe-test.html  # ★ V5(iframe 到達性・実行待ち)
│   ├── v5b-gas-test.gs              # 旧 GAS 版(参考・実行不要。サーバー版 = V6)
│   └── v6-metadata-check.mjs        # ★ V6(youtubei.js / InnerTube の前提確認・v2・実行待ち)
└── (P00-B 以降で) apps/api, apps/web, packages/shared, deploy/, scripts/
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
  - (2026-09-23) **DOC-4 = メタデータ取得を youtubei.js に変更**(yt-dlp は将来の DL 担当 = D13。V6 キットを v2 に更新)
  - (2026-09-23) **DOC-3 = 「最初からサーバーを立てて構築する」方針へ転換**(GAS を外し、Bun + Hono +
    Nginx + Docker Compose / メタデータ = yt-dlp 主 + ページ抽出フォールバック / V6 キット追加)(当時の内容。**DOC-4 で youtubei.js へ改訂**)
  - `4873f4e` **DOC-2 = 再生方式を iframe へ転換・DL 保留**(V5 キット追加)
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
5. **ユーザーが実行するキットは常にリポジトリの最新版で管理**し、取得方法(リポジトリのファイルパス)と
   自己チェック方法(`?probe=1` 等)を伝える。**旧 GAS 期は raw URL 運用でコピー漏れ・旧版混入が 2 回起きた**
   ため、キットを渡すときは「どのファイルか」を必ず明示する。

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
  - (2026-09-23)「**プロジェクトは最初からサーバーを立てて作っていく方針です**」= GAS 期を設けず、
    最初から自宅サーバー(Proxmox + Docker Compose)で構築する。選択 = Bun + Hono + Nginx / 配備先 = 自宅 Proxmox
  - (2026-09-23)「**yt-dlp と youtubei.js を使うようにしてください**」「基本的には、**YouTube の情報取得・API
    クライアント部分は youtubei.js、実際のメディア取得・ダウンロード部分は yt-dlp** という役割分担に」
    → **D11 改訂(メタデータ = youtubei.js)+ D13(yt-dlp = 将来の DL 担当)**。さらに
    「**現段階である YouTube クライアントの作成では youtubei.js のみ使う**。今後のダウンロード機能のときに yt-dlp」
    と明示 → **現段階では yt-dlp を導入しない**。
- ユーザーは**検証キットを実際に自分で実行して結果を貼付**してくれる(GAS デプロイ・スマホ操作まで
  協力してくれる)。手順は `verification/README.md` に書いてあるので「README を見て実行」で足りる。
- ユーザーの端末環境(参考): Android 10 + SamsungBrowser 30(第 1 回 V2 実行に使用)。
  自宅サーバーは Proxmox/LXC を構想中。
- **設計原則(§3)の禁止表現を守ること**(文書レビューで指摘される)。
- 大きな判断(アーキ変更等)は `ask_user` 系の質問ツールで選択肢付きで聞くのが有効だった。
  小さい修正は説明だけで進んでよい。

## 13. 次の一手(引き継いだらこれ)

1. **V5 と V6 の実行をお願いする**(2026-09-23 の現行必須検証 = §8.1・§8.2):
   - `verification/v5-browser-iframe-test.html`(ブラウザで開く。`?probe=1` で自己チェック)
   - `verification/v6-metadata-check.mjs`(自宅サーバーまたは同じ回線の PC で `node` / `bun` で実行)
   - 目的: ① **iframe 方式の成立可否**(`youtubeeducation.com` の描画・再生)② **youtubei.js / InnerTube が
     自宅回線から通るか**(player / search の生 fetch と youtubei.js の実機能。NG なら `ask_user` で相談)。
2. **P00 の GO 待ち**(V5/V6 の結果に依存しない P00-B/C は先行着手も可):
   - P00-B: サーバー骨格(`apps/api` = Bun + Hono + `deploy/` Docker Compose + Nginx 設定)
   - P00-C: web スキャフォールド(`apps/web` = Next.js + Tailwind v4 + M3 トークン + GSAP + ルータ骨格)
   - P00-D: メタデータ解決(**youtubei.js** + O9)+ vitest(クライアントはオフライン生成でテスト可 = §7.10)
   - P00-E: 配備(Compose 一式 + Proxmox LXC 手順 + TLS)
   - P00-F: M3 Expressive 基線(ホーム / watch スケルトン + API 接続)
   - 推奨順: **B → C → D → E → F**(D の実装は V6 の結果を反映する。B/C は先行可)
3. **作業のたびに commit+push**(§11)。タスク ID をコミットメッセージに含める。
4. `docs/task-list.md` は**常に最新に**(進捗の正本)。

## 14. 引き継ぎプロンプト(新しい AI に初回で貼るもの)

```text
ytdl リポジトリ(shiratama644/ytdl)の開発を引き継いでもらえます。
YouTube プロキシ閲覧サイト(しあTube 相当の閲覧機能 + M3 Design Expressive UI)です。
2026-09-23 のユーザー決定で、① 再生 = iframe 埋め込み ② 動画ダウンロード = 保留(実装対象外)
③ プロジェクトは最初からサーバーを立てて構築(GAS を実装しない)、の 3 点が確定しています。
設計の正本は HANDOVER §4 です。

最初にやること:
1. リポジトリの `docs/HANDOVER.md` を全部読む(コンテキストの唯一の入口)。
2. その指示に従い docs/task-list.md → docs/planning/PHASE0_PLAN.md →
   docs/research/VERIFICATION_P0.md → docs/research/SIATUBE_CODE_VERIFICATION.md の順に読む。
3. ブランチ確認: 作業はセッション固定ブランチ(`git branch --show-current`)。
   main は PR #3 まで取り込み済み。同期手順は §10・§11。

現状の要約:
- 再生 = iframe(`https://www.youtubeeducation.com/embed/{id}` を既定・公式 embed に差し替え可能)。
  しあTube の実コード(ajgpw/siatube@44ab1599)で同方式を確認済み(D1 改訂)。
- 構成 = 自宅 Proxmox(LXC/VM)+ Docker Compose(Nginx + Bun/Hono API)。GAS 期は設けない(D10)。
- メタデータ = **youtubei.js(InnerTube クライアント)**。**yt-dlp は将来の DL 担当**(現段階では導入しない = D13)。
  signature decipherer / ストリーム URL 解決 / DL 機構 = 保留(D3〜D5/D7/D9)。
- 次の検証 = V5(ブラウザ側 iframe 到達性)・V6(サーバー側メタデータ取得)。ユーザーが実行して結果を貼付する。
- その後は P00 の GO 待ち(推奨順 B → C → D → E → F)。

作業ルール:
- ユーザーとのやり取りは全部日本語。検証してから構築(常設指示)。
- このサンドボックスはターン跨ぎに再クローンする: 変更のたびに commit + push(§11)。
- 絶対表現の禁止(§3 の設計原則)を守る。docs/task-list.md を常に最新に保つ。

最初に、(a) 理解した状況の要約 1 段落、(b) 次に確認したいこと(V5/V6 実行の依頼 / P00 開始の GO)
を日本語で答えてください。
```

## 付: 引き継ぎ時点での未完了リスト(明確化)

| # | 項目 | 誰が | 状態 |
|---|---|---|---|
| 1 | ~~V1 検証(v1〜v1f)~~ | ユーザー + AI | **✅ 完了(2026-09-15)** = 抽出アルゴリズムは証跡として保存(現段階では実装しない)。V1-a は youtubei.js の前提確認として現行 |
| 2 | **V5(ブラウザ側 iframe 到達性)** | ユーザー + AI | **未着手 = 次に依頼するキット**(§8.1) |
| 3 | **V6(youtubei.js / InnerTube の前提確認)** | ユーザー + AI | **未着手 = 次に依頼するキット**(§8.2・キット v2) |
| 4 | **P00 開始の GO** | ユーザー | **待機中** |
| 5 | P00-B ~ P00-F の実装 | AI | 未着手(GO が来たら着手可・推奨順 B → C → D → E → F) |
| 6 | 動画 DL 機能 | - | **保留(実装対象外)**。再開時は **yt-dlp が担当**(D13)。設計・調査は docs に保存 |
| 7 | 旧 GAS キット(v1〜v3b・v5b)の実行 | - | **不要**(GAS を実装しないため。参考として保存) |
| 8 | PR(main 向け)の作成・マージ | ユーザー | セッション固定ブランチごとに判断 |