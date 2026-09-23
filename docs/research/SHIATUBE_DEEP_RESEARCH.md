# しあTube (SiaTube) Deep Research

| 項目 | 値 |
|---|---|
| 調査日 | 2026-09-12 |
| 目的 | 本プロジェクト(YouTube Proxy Site)の参照設計調査。しあTube の全体像・技術実装・運営・法的性質・競合環境を一次情報中心に完全に整理する |
| 主要一次情報 | 公開リポジトリ 2 件のフルクローン(ソースコード読了)、プロダクション API の読み取り専用実測、公式サイト/ミラー観測 |
| 信頼度凡例 | ◎=クローン済みソース/公式実測、○=公式リポジトリ・プロフィール、△=二次情報(記事・SNS・Q&A) |
| 実コード確認(追記) | **2026-09-23**: [`ajgpw/siatube`](https://github.com/ajgpw/siatube) @ `44ab1599`(2026-09-16・MIT)をクローンし、主要ファイル(プレイヤー / API クライアント / worker / GAS 中継)を読了 → 結果を [SIATUBE_CODE_VERIFICATION.md](SIATUBE_CODE_VERIFICATION.md) に集約(② 再生 = iframe 方式 / ③ パラメータ供給 / ④ メタデータ取得 / ⑦ GAS 中継) |
| 現行スコープの採用判断(追記) | **2026-09-23**: 本調査のうち本プロジェクトが現行で採用するのは **iframe 再生**(既定 `youtubeeducation.com` = ③ の方式)と **メタデータ取得(youtubei.js = InnerTube クライアント。D11 改訂)**。**yt-dlp は将来の DL 担当**(D13。現段階では導入しない)。DL 機構・signature 復号・中央 API 依存の設計は**保留**(D2〜D5・D9) |

---

> **2026-09-23 追記(本調査と実コード確認の関係)**: 本文書は**全体像・運営・法的性質・競合**の調査。**技術実装の詳細(再生方式 = `youtubeeducation.com/embed` の iframe・パラメータ供給・API 面・GAS 中継)**については、ソースコードを直接読んで確認した [SIATUBE_CODE_VERIFICATION.md](SIATUBE_CODE_VERIFICATION.md) を**正**とし、本プロジェクトの実装時は同文書を参照する(本文書の該当記述と齟齬がある場合は同文書を優先)。

## 0. 要約(Conclusion First)

1. **しあTube とは**: 個人開発の非公式 YouTube フロントエンド兼プロキシ。**「静的 SPA(クライアント) + 中央 API(siatube.com)」の 2 層構成**で、YouTube の動画像・メタデータを中央サーバー側で解決し、ユーザーのブラウザは **署名済み googlevideo URL(直リンク)を再生する**方式。バイト中継しないため、サーバー帯域負荷はメタデータ解決分のみ。
2. **技術の中核**: バックエンドは **yt-dlp(バイナリ subprocess) + InnerTube API(`youtubei.js` / 直叩き) + ytpl** の混合。ストリーム URL は **`c=WEB_EMBEDDED_PLAYER`(埋め込みプレイヤー)クライアント**として解決されており、これが広告なし・高画質(1080p/4K)取得の本体である。
3. **配布モデル**: クライアントは **単一 HTML ファイル(440KB)** に統合でき、**Google Apps Script / Cloudflare Workers / 任意の静的ホスト**に誰でも自己ホスト可能。API は中央(siatube.com)固定。**学校のフィルタは youtube.com だけ落とすため、GAS 等の別ドメインで自己ホストしたしあTube が通る**という需要構造がある。
4. **運営**: 開発者は「siawaseok」系の GitHub 複数アカウント + Scratch `siawaseok2`(「幸せならokです！」→ 名称由来の根拠)。**旧コミュニティ YUKIBBS → 現在 Chatwork + LINEオープンチャット**。主流メディアの報道・法務対応の公開情報は現時点で確認されていない。
5. **法的性質**: YouTube 利用規約(提供インターフェース以外のアクセス・複製の禁止)に抵触するグレーゾーンサービス。日本の著作権法上は視聴側の私的使用(第30条)は問題になりにくいが、**運営者の再配信・技術的措置回避的位置付けはリスク**。LICENSE には「本ソフトウェアの使用によって生じた損害・損失・**法的措置**に対する責任を負わない」特段の文言が追加されている。
6. **本プロジェクトへの示唆**: 「サーバーが解決しクライアントが直リンク再生する」分離設計、EMBEDDED_PLAYER クライアント指紋、continuation token による無限フェッチ、GAS 互換 `/exec`・`/api/bridge` 中継、GitHub raw によるホット更新設定、health/status エンドポイント、429 バックオフ、単一 HTML 自己ホスト配布 —— 上記 8 点がそのまま採用可能な設計パターンとして抽出された(§10)。

---

## 1. 概要

### 1.1 サービスの正体

しあTube(サイト表記「しあTube」、ページタイトル `<title>しあTube</title>`)は、YouTube の動画を **アカウント不要・広告なし・追跡なし** で閲覧できる非公式フロントエンド。機能は公式 YouTube に近い(検索・動画・チャンネル・プレイリスト・コメント・履歴・登録チャンネル・トレンド)。

- **公式 API 基盤**: `https://siatube.com`(ドメインは開発者所有。`siawaseok@siatube.com` が README に記載)
- **公式デプロイ(静的クライアント)**: GitHub `ajgpw/youtube`(静的サイト版、頻繁更新)
- **観測された実運用ミラー**: `https://html.cafe`(サイト名「しあチューブ」、`/watch?v=...`・`/channel/...` 路由で稼働中、2026-09-12 時点)。html.cafe は「しあTube のミラー/別インスタンス」として運営され、SEO 用の紹介ページ(「YouTube匿名視聴サイト…アカウント不要・広告なし…日本向け特化」)も併設
- **レガシー/リレードメイン**: `siawaseok.duckdns.org`(元公式 URL、現在も bridge/リレーとして参照)、`siawaseok.f5.si`(キャッシュ API)、`ytproxy-siawaseok.duckdns.org`(YouTube 要求プロキシ)、`proxy-siawaseok.duckdns.org`(m3u8 プロキシ)
- **ユーザー自己ホスト**: `script.google.com/(a/macros/<ドメイン>/)s/.../exec` の GAS Webアプリ URL が多数流通(学校の教育機関ドメイン `a/macros/<school-domain>` 経由の共有も多く確認)

> 注: 検索上の「ShiaTube」(シーア派のイスラム宗教動画サイト shiatube.in / shiatube.org 等)とは**無関係**。本調査の対象は日本向けの YouTube 代替サイト「しあTube」(siatube)のみ。

### 1.2 利用シーン(需要の所在)

Q&A(Yahoo!知恵袋・charat.me 板等)から、利用は**主に日本の学校(タブレット/PC)の YouTube ブロック回避**に集中している。学校のフィルタは `youtube.com` の URL を遮断するが、`script.google.com` やミラー DOM 等は遮断されないため、自己ホストしあTube で代替する、という図式。一般向けには「広告なし・匿名(アカウント不要)視聴・高画質・ダウンロード」が訴求点。

---

## 2. 運営・開発チーム

### 2.1 開発者 ID とアカウント関係(観察事実)

| アカウント | 種別 | 役割(観察) | 根拠 |
|---|---|---|---|
| `siawaseok` (GitHub u/154352733) | GitHub | 本来の開発者。LICENSE の著作権表記「Copyright (c) 2025 siawaseok」 | ◎ `ajgpw/youtube` LICENSE |
| `siawaseoktest` (GitHub u/179441519) | GitHub | **元リポジトリ** `siawaseoktest/youtube`(v1.5.4, 72 forks, 9 stars)。README「頻繁に更新するのは静的デプロイ用の ajgpw/youtube」 | ○ |
| `siawaseok3` (GitHub u/172157947) | GitHub | **データリポジトリ** `siawaseok3/wakame`(trend.json・video_config.json・apis.json 等)。12,150 commits、自動更新(調査直前に trend.json 更新コミット) | ○ |
| `ajgpw` (GitHub u/156731346) | GitHub | **現行維持アカウント** `ajgpw/youtube`(「しあtube(静的サイト版)」、v2.1.7、27 forks、8 stars)。siawaseoktest/youtube の fork | ○ |
| `siawaseok2` (Scratch) | Scratch | 開発者の Scratch アカウント。プロフィール: 「幸せならokです！」「YUKIBBSは試験段階から一応いた、いまはchatwork」「Proxy作成 気分で開発してます。」 | ○ |

同一人物とは断定できないが、`siawaseok` 系のドメイン(duckDNS)・メールアドレス・著作権表記・fork 関係から、**同一開発者(または極めて近しい仲間)が複数アカウントで運用**していると見るのが自然。

**名称由来(根拠あり)**: Scratch プロフィール「**幸せならokです！**」→ 「しあ(せ)おく」→ **しあ**Tube。GitHub リポジトリ名も `youtube` だが About は「しあtube」、TOPICS は `proxy siatube youtube youtubeproxy`。

### 2.2 コミュニティ

- **YUKIBBS**(初期コミュニティ、Scratch プロフィール「試験段階からいた」言及)→ **Chatwork**(`https://www.chatwork.com/g/siatube`)+ **LINEオープンチャット**(README 記載)
- 連絡先: `siawaseok@siatube.com`（README「返信は別アドレスから」）
- 公式 X(Twitter)アカウントは確認されなかった。SNS 露出はScratch プロジェクト(「しあtube復活！！」「【youtube/プロキシ】しあtubeの作り方」)とブログ解説記事が中心
- **コラボレーター**: `toka-kun` (Toka_Kun_, GitHub u/222786419, GitHub organization **NecoTube**)。しあTube 系を含む多数の同種サイトのリポジトリを保有/フォーク(§8 参照)。ajgpw/youtube の PR(#12 from siatube-sia 等)経由で寄与の痕跡あり

### 2.3 開発スタイル

- 「気分で開発してます」(Scratch 自己紹介)の通り、個人・遊技的な開発文化。コミットメッセージは日本語・随意
- 複数アカウント・複数ドメインの**分散運用**(duckDNS 自宅系 + Cloudflare + GitHub raw + GAS)
- 無料ホスティング(Vercel/Netlify/Railway/Render/GitHub Pages/GAS)への**量産デプロイ**が前提の設計(`siawaseok3/wakame` には各ホスティングの配置ファイルが同梱、README「わかめtube copyは、わかめtubeの**量産版**です」)

---

## 3. 歴史・タイムライン

> 注: 2026-09-12 時点で Internet Archive(Wayback Machine)が一時停止のため、ドメイン初期取得・初回キャプチャ日は**要再確認**。以下は git 履歴・プロフィール・記事の裏付けに基づく。

| 時期 | 出来事 | 根拠/信頼度 |
|---|---|---|
| (前史) | **わかめtube** 系サイトの活動。`siawaseok3/wakame` が「わかめtube の量産版」として trend.json 等を自動更新し続ける(12,150 commits) | ○ ◎ |
| 〜2024-02 頃 | Scratch アカウント `siawaseok2` 作成(「2 years 7 months ago」= 2026-09 時点) | ○ |
| (時期不明) | **YUKIBBS** での試験段階コミュニティ | ○(自己申告) |
| 2025-07-07 | `ajgpw/youtube` 初コミット「**initial commit from backup**」(プロジェクトはそれ以前に存在したことの証拠) | ◎ git log |
| 2025-10-07 | LICENSE 更新(MIT + 法的措置免責文言追加) | ◎ |
| 2025-10-13 | v1.2.2(ajgpw リポジトリの version 履歴) | ◎ |
| 2025-11-01 | 「動画再生方式の改善・ダウンロードオプション追加」 | ◎ |
| 2025-12-02 | 「APIの追加と軽量化」 | ◎ |
| 2025-12-18 | v1.5.0 | ◎ |
| 2026-03-21 | **`siawaseoktest/youtube` v1.5.4**(公開されている最後のバックエンド完全版。Express+yt-dlp+InnerTube) | ◎ |
| 2026-07-15/19 | 「大まかなAPIルート変更(バグあり・ダックアップ用)」「プロキシ機能の追加/一旦睡眠」(GAS 版のリクエストプロキシ機能) | ◎ |
| 2026-08 | v2.1.6(2026-08-19)。「Type1 再生モードに自動再生/繰り返し再生追加」「Type2 のエラーレスポンス処理/サーバー状況と待ち時間表示」 | ◎ |
| 2026-09-01 | **v2.1.7**(現行)。「ライブ配信m3u8の改善」 | ◎ |
| 2026-06〜07 | 別サービス **TKtube(tktube.com)** が閉鎖(エラー521/NXDOMAIN、公式発表なし)→ 同種サービスの脆性の事例 | △(複数記事) |
| 2026-08 頃 | Scratch「しあtube復活！！」プロジェクト公開(一時的な停止/移管を経た示唆) | ○ |

**世代の整理**: v1.x(`siawaseoktest/youtube`)は「サーバー一体型」(Express が API と静的配信の両方)。v2.x(`ajgpw/youtube`)は「静的サイト版」= **クライアントだけ公開し、API は中央 siatube.com へ固定**したアーキテクチャへ転換。ユーザー側は API 自己ホストの必要がなくなり、GAS で HTML を出すだけで完結する。

---

## 4. 機能一覧(ユーザー視点)

(v2.x クライアントの Vue コンポーネント構成とライブ観測に基づく)

### 4.1 画面/ルート

| 画面 | コンポーネント | 機能 |
|---|---|---|
| ホーム | `HomeView.vue` | トレンドリスト(`trend.json` 由来) |
| 検索 | `SearchView.vue`, `HeaderSearch.vue` | 検索 + サジェスト(`/api/suggest`)+ continuation(中継 token)でページ送り |
| 動画 | `VideoPlayer.vue` | プレイヤー(3 方式)+ 説明文(`VideoDescription.vue`)+ 関連動画(`RelatedList.vue`)+ コメント(`Comment.vue`、リply 展開 `commentReplies`)+ 登録チャンネル/チャンネル登録 UI |
| チャンネル | `ChannelView.vue` | チャンネル情報・動画一覧(`ChannelContentCard.vue`) |
| プレイリスト | `PlaylistsView.vue`, `Playlist.vue`, `PlaylistModal.vue` | 再生・一覧 |
| 履歴 | `HistoryView.vue` | 視聴履歴(localStorage) |
| 登録 | `SubscriptionsView.vue` | 登録チャンネル |
| 設定 | `SettingsView.vue`, `SettingsModal.vue` | 再生方式・自動再生・リピート・**リクエストプロキシ**(URL/JSONP)・カスタム API エンドポイント(旧: 複数 GAS エンドポイントから乱数選択 → 現行は siatube.com 固定 + 代替ヘルプ `CustomEndpointsHelp.vue`)・タイムアウト無効化トグル 等 |
| 共同開発者 | `CollaboratorsPopup.vue` | コラボレーター紹介ポップアップ |

### 4.2 再生(3 方式 = StreamType1/2/3)

- **Type1(埋め込み)**: iframe で `https://www.youtubeeducation.com/embed/{id}` を再生(§6.5)。YouTube 公式 embed のミラー DOM への転用
- **Type2(直ストリーム)**: `/api/stream/{id}` が返す直リンク/M3U8 をネイティブ `<video>` + `hls.js` で再生。画質切替(144p〜4K、音声のみ)、再生速度、PiP、リピート、自動再生、サブタイトル(手動 VTT + 自動キャプション、言語別)、プレミア公開待ち UI、ライブ(m3u8)
- **Type3(ダウンロード)**: 360p muxed(mp4)/音声のみ/映像のみ(解像度別)/m3u8 raw・proxy(m3u8.dev 併用)/字幕 VTT のダウンロードリンク一覧

### 4.3 学校利用想定のための頑健性機能

- API 接続不能時の health 探知 + 「ブロックされた場合はこちら」系の代替導線(Chiebukuro 回答で言及)
- **リクエストプロキシ**(ユーザーが任意の URL 経由で API を叩ける。JSONP トランスポート対応)
- カスタム API エンドポイント(GAS インスタンスの URL を差し替え)
- タイムアウト無効化設定(低速環境向け)
- バージョンチェック(`/api/version-check`、GitHub raw `version.txt` 参照、CF Workers で 300s キャッシュ)

---

## 5. 技術アーキテクチャ(本調査の中核)

### 5.1 全体図

```
                        ┌────────────────────────────────────────────┐
                        │ siatube.com (Cloudflare)  ← 開発者所有・中央  │
                        │  v2.x API (クローズド、v1.5.4 相当は OSS)    │
                        │   yt-dlp(子プロセス) / InnerTube / ytpl     │
                        │   → 署名済み googlevideo URL・メタ JSON 返却  │
                        └───────────────▲────────────────────────────┘
                                        │ /api/* (JSON)
        ┌───────────────────────────────┴────────────────────────────────┐
        │                    クライアント(静的 SPA)                        │
        │  Vue 3.4 + vue-router 4.2 + hls.js 1.6 + Vite 5                  │
        │  単一 HTML: siatube-full.html.txt (440KB)  ⇐← 自動更新される       │
        └───────────────────────────────▲────────────────────────────────┘
            配布形態(いずれも無料ホスティング):
            (a) GAS Webアプリ        (b) Cloudflare Workers      (c) 任意の静的ホスト
                index.html.txt を      worker.js が /api/* を       siatube-full.html.txt
                GitHub raw から取得     siatube.com へプロキシ +     をそのまま配置
                + UrlFetchApp で        /api/version-check /        (API は直接
                API 中継                /api/bridge 提供            siatube.com)
            (d) node server/index.js(Express 静的配信、開発用)

        YouTube 側:
        - yt-dlp --js-runtimes node -J --skip-download --proxy http://ytproxy-...:3007
        - InnerTube: youtubei.js / youtube.com/youtubei/v1/next (WEB client, hl=ja, gl=JP)
        - c=WEB_EMBEDDED_PLAYER としてストリーム解決 → googlevideo.com 直リンク
```

**設計の本質**: バイトを中継しない。「動画の取得情報(署名 URL)」だけサーバーで解決し、ブラウザが `googlevideo.com` に直接再生要求を出す。→ 中央サーバーの帯域はメタデータ API 分だけで済む。反面、**署名 URL の IP 束縛**が重要な制約(§6.3)。

### 5.2 クライアント(◎クローン読了: `ajgpw/youtube` @ 97aa001)

```
client/
├── src/
│   ├── App.vue / main.js / router/index.js (vue-router: /, /watch, /channel, /playlist, /search, /history, /subscriptions, /settings)
│   ├── api.js                     ← SIATUBE_API_ORIGIN = "https://siatube.com" (固定)
│   ├── services/siatubeApi.js     ← API クライアント本体(675行、§5.5)
│   ├── services/requestManager.js
│   ├── components/
│   │   ├── StreamPlayer.vue / StreamType1.vue / StreamType2.vue(1599行) / StreamType3.vue
│   │   ├── StreamTypeDropdown.vue / ExternalHlsPlayer.vue / PlayerLoading.vue
│   │   ├── VideoList.vue / VideoDescription.vue / RelatedList.vue
│   │   ├── Comment.vue / ChannelItem.vue / ChannelContentCard.vue
│   │   ├── Playlist.vue / PlaylistModal.vue
│   │   ├── HeaderSearch.vue / Sidebar.vue / AutoplayNotification.vue
│   │   ├── SettingsModal.vue / CollaboratorsPopup.vue / CustomEndpointsHelp.vue
│   ├── composables/playbackController.js / useStreamServerStatus.js
│   ├── utils/ (21ファイル)
│   │   ├── hlsLoader.js (hls.js/light の動的 import、MSE サポート判定)
│   │   ├── youtubeEducationPlayer.js (§6.5 の education ドメイン埋め込み)
│   │   ├── siatubeAdapters.js (API レスポンスの正規化: itag/vcodec/acodec/m3u8.byLanguage)
│   │   ├── type2StreamParser.js / streamType2Fallback.js / type2StreamRequestCooldown.js
│   │   ├── requestProxy.js (901行: ユーザープロキシ + JSONP トランスポート)
│   │   ├── subtitleTracks.js / playlistManager.js / searchManager.js
│   │   ├── subscriptionManager.js / historyManager.js / autoplayManager.js
│   │   ├── settingsManager.js / streamStatus.js / versionCheck.js / formatters.js
│   └── test/ (node --test: autoplayManager / requestProxy / settingsManager / siatubeAdapters
│       / siatubeApi / streamStatus / streamType2Fallback / type2StreamRequestCooldown
│       / youtubeEducationPlayer の 9 テストファイル)
├── package.json (vue 3.4 / vue-router 4.2 / hls.js 1.6 / vite 5)
└── version.txt ("2.1.7")
```

その他ルート: `worker.js`(CF Workers)、`wrangler.toml`、`siatube-full.html.txt`(単一ファイル統合版、自動更新)、`index.html.txt`(GAS 取得用)、`DEPLOY_PROCEDURE.md`、`LICENSE`。

### 5.3 API エンドポイント(v2.x、ライブ実測 + クライアント実装より)

| エンドポイント | 方法 | パラメータ | 返却 |
|---|---|---|---|
| `/health` | GET | - | `{"status":"ok"}` ◎実測 |
| `/api/search` | GET | `q`, `token`(continuation), `raw` | 検索結果 + continuation |
| `/api/suggest/` | GET | `keyword` | サジェスト候補 |
| `/api/video/{id}` | GET | `token`, `depth`, `raw`。**related 用の埋め込み形式**: `{id}====token==i=={token}==p==depth==i=={depth}` (depth=2 等の初期 related 展開) | 動画メタ + related |
| `/api/comments` | GET | `videoId`, `sort=top\|new`, `continuation`, `raw` | コメント + continuation |
| `/api/comment/replies` | GET | `videoId`, `continuation` | レply |
| `/api/channel/{id}` | GET | `raw` | チャンネル情報・動画 |
| `/api/playlist/{id}` | GET | `token`, `v`, `raw` | プレイリスト |
| `/api/stream/{videoId}` | GET | `origin` | **ストリーム解決結果**(§6.3、最大 5 分キャッシュ) |
| `/api/stream/status` | GET | - | サーバー状況・待ち時間(2.1.6 追加の UI 表示に対応) |
| `/api/trend` | GET | - | トレンド(v1.x は GitHub raw `trend.json` 中継) |
| `/api/bridge` | POST | `{pathAndQuery: "/api/..."}` | GET 中継。**長い continuation token 用**(GAS の URL 長制限 1900 字以下/超の分岐に対応) |
| `/api/version-check` | GET | - | GitHub raw `client/version.txt`(Workers で 300s キャッシュ) |

クライアント側の共通挙動(`siatubeApi.js` ◎): タイムアウト 30s(設定で無効化可)、リトライ 1 回(429 の場合 2.1s 退避)、stream 応答のメモリキャッシュ TTL 5 分、直結失敗時に `/health` を探知して `API_CONNECTION_FAILURE_EVENT` を発火(「サーバーに接続できません」UI)、JSONP プロキシ対応。

### 5.4 バックエンド(v1.5.4 公開ソース ◎: `siawaseoktest/youtube` @ 5c90fec)

依存(package.json): `express`, `node-fetch`, **`youtubei.js` ^14**, **`ytpl`**(github:Victiniiiii/ytpl の fork), **`@distube/ytdl-core` ^4.16.12**, `@ffmpeg/ffmpeg`(クライアント側メジャー), `hls.js`, `cookie-parser`。

ルート実装:

| ルート | 実装 |
|---|---|
| `/api/search` (`search2.js`) | `youtubei.js` の Innertube インスタンス |
| `/api/video` (`videoinfo.js`, 779行) | **InnerTube 直叩き**: `https://www.youtube.com/youtubei/v1/next?key=AIzaSy...`(公開 API key)+ WEB client(`hl:ja, gl:JP, clientVersion:2.20240214.01.00`, Chrome/ChromeOS UA)+ undici Keep-Alive Agent。**サムネイルはサーバー側で取得して base64 data URL 化**して返却(i.ytimg.com への直参照/CORS 回避) |
| `/api/channel`, `/api/comments` | `youtubei.js` |
| `/api/playlist` (`playlist.js`, 492行) | ytpl + node-fetch |
| `/api/suggest` | https 直接 |
| `/api/stream` (`stream-url.js`, 256行) | **Type1**: `https://www.youtubeeducation.com/embed/{id}` + GitHub raw `siawaseok3/wakame/video_config.json` の params。**Type2**: **yt-dlp バイナリ subprocess**(`<root>/bin/yt-dlp`, `install-yt-dlp.js` が初回に GitHub Releases から DL、chmod 755):<br>`yt-dlp --js-runtimes node -J --skip-download --no-progress --proxy http://ytproxy-siawaseok.duckdns.org:3007 https://www.youtube.com/watch?v={id}`<br>→ `-J`(フル JSON: formats+subtitles+captions)を整形(hasVideo/hasAudio/streamType/isM3u8 付与)して返却。<br>**download**: 日本語字幕フィルタ(`lang=ja`)、m3u8 raw + `proxy-siawaseok.duckdns.org/proxy/m3u8?url=` の proxy 版、audio/video/muxed 分類 |
| キャッシュ | `https://siawaseok.f5.si/api/cache` に ID があると `siawaseok.duckdns.org/api/stream/{id}/type2` から再取得(キャッシュヒット経路) |
| `/api/trend` | `raw.githubusercontent.com/siawaseok3/wakame/refs/heads/master/trend.json` を中継 |
| `/exec` | `?video= / ?stream= / ?channel= / ?q= / ?trend / ?playlist= / ?comments=` を各 API に 302 リダイレクト。**GAS Webアプリ(`.../exec`)互換**のためのルート |

その他: `console.warn/error/...` をラップして `[YOUTUBEJS]` / `ParsingError` ログを抑制(`log.txt` が `ON` の時だけ透過)。

### 5.5 `/api/stream` レスポンス形状(v2.x、dQw4w9WgXcQ で実測 ◎ 2026-09-12)

```jsonc
{
  "id": "dQw4w9WgXcQ",
  "title": "Rick Astley - Never Gonna Give You Up (Official Video) (4K Remaster)",
  "hasM3u8": false, "hasSubtitles": true, "hasAutomaticCaptions": true,
  "counts": { "total": 1161, "muxed": 1, "videoOnly": 22, "audioOnly": 4, "m3u8": 0,
              "manualSubtitles": 35, "automaticCaptions": 1099,
              "audioLanguages": 1, "m3u8Languages": 0,
              "manualSubtitleLanguages": 5, "automaticCaptionLanguages": 157 },
  "streams": {
    "muxed": [ { /* 下記 stream オブジェクト, itag=18, 640x360 mp4 */ } ],
    "videoOnly": [ /* itag=160(144p mp4), 278(144p webm/vp9), 394, ... 22種 */ ],
    "audioOnly": [ /* 4種 */ ]
  },
  // m3u8 / 字幕は該当時に: m3u8.list, m3u8.byLanguage, subtitles 等(adapter 側で消費)
}
```

stream オブジェクト(実測の完全フィールド列挙):

```jsonc
{
  "streamUrl": "https://rr6---sn-....googlevideo.com/videoplayback?expire=...&ei=...&ip=118.151.202.141&id=o-...&itag=18&source=youtube&requiressl=yes&...&c=WEB_EMBEDDED_PLAYER&...&sig=...",
  "sourceKey": "url",
  "mediaType": "muxed" | "video_only" | "audio_only",
  "isM3u8": false,
  "language": { "code": "en", "name": "英語", "isOriginal": false, "isDubbed": false, "isAutoDubbed": false, "isDefault": false, "isDrc": false, "preference": -1 },
  "formatId": "18",            // itag
  "format": "18 - 640x360 (360p)",
  "formatNote": "360p",
  "ext": "mp4", "protocol": "https", "container": null,
  "resolution": "640x360", "width": 640, "height": 360, "fps": 25, "aspectRatio": 1.78,
  "vcodec": "avc1.42001E", "acodec": "mp4a.40.2",
  "videoExt": "mp4", "audioExt": "none",
  "dynamicRange": "SDR",
  "tbr": 444.226, "vbr": null, "abr": null, "asr": 44100, "audioChannels": 2,
  "filesize": null, "filesizeApprox": 11832459,
  "duration": null, "hasDrm": false, "quality": 6,
  "httpHeaders": {              // ★ 再生時にこのヘッダを付けなければならない
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-us,en;q=0.5",
    "Sec-Fetch-Mode": "navigate"
  }
}
```

**読み解き(重要)**:
1. フィールド構造は **yt-dlp の format リストと完全に一致**(formatId/format/resolution/tbr/vcodec/acodec/hasDrm...)。`counts.total=1161` は formats + 字幕(35) + 自動キャプション(1099) の総数 = yt-dlp `-J` の中身。**v2.x バックエンドも yt-dlp ベースと断定できる**。
2. `streamUrl` は **`googlevideo.com/videoplayback` の署名済み直リンク**。`expire=1789227370`(≈ 応答から ~6 時間後)= YouTube の標準的な有効期限。
3. URL に **`c=WEB_EMBEDDED_PLAYER`** が入っている = **埋め込みプレイヤークライアントとして解決**したストリーム。これが「広告なし・プレミアム不要で 1080p/4K まで拿到的できる」本体(公式 Web の FREE 用户は 480p/720p 制限、embed は品質制限が緩い)。
4. **`ip=118.151.202.141`** が URL に入っている = 署名が**解決サーバーの IP** に紐づく。ブラウザの IP と一致しなければ拒否される場合がある。よって実際には①サーバー IP で再生(多くのユーザーは失敗し得る)、②中央 API がリクエスト元 IP で解決、③クライアント側 UA/ヘッダを揃える(`httpHeaders` まで返すのはそのため)のいずれかを工夫していると推測される。v1.5.4 の `--proxy http://ytproxy-...:3007`(専用プロキシで解決)は**解決 IP を固定/分散させる**運用と整合する。
5. `hasDrm: false` = DRM 付き(18+ 年齢認証・限定配信等)の取得を区別している。
6. 字幕は URL 直接 + VTT(`subtitleTracks.js` が消費)。157 言語の自動キャプションまでメタとして返す。

### 5.6 再生モードの詳細(◎ソース読了)

**Type1 — `youtubeeducation.com` 埋め込み**(`youtubeEducationPlayer.js`):
- `https://www.youtubeeducation.com/embed/{videoId}?{params}` を iframe 化。`youtubeeducation.com` は YouTube 公式 embed プレーヤーを配信する(公式以外の)ミラー DOM。学校フィルタが `youtube.com/embed` を弾いても通る可能性がある
- **params と Player API コードは Google スプレッドシート**(`SHEET_ID=1dily2wiik92TAyK3zyIsu8TDuyYNoF20IM1iMk_X-pg`, `sheet=Youtube-education-parameter`, A1=params, A2=インライン script になる Player API ソース)から **1 時間キャッシュ**で取得 → **リデプロイなしで埋め込みパラメータをホット更新**できる
- `enablejsapi=1&controls=1&playsinline=1` を強制し、`origin/forigin` を現在 URL に設定。ended 検知は `window.YT.Player` API(polling + 5s タイムアウト)

**Type2 — 直ストリーム**(1599 行、最大)
- 基本再生: **muxed 360p(itag 18 mp4)を安全なデフォルト**に、高画質は video-only + audio-only の DASH 併用(必要に応じて `@ffmpeg/ffmpeg` クライアント側 mux の痕跡)
- M3U8(HLS)は Apple がネイティブ、他は `hls.js/light`。m3u8 失敗時のフォールバック(`streamType2Fallback.js`)、リクエストクールダウン(`type2StreamRequestCooldown.js`)、初回再生リカバリ
- 画質セレクト・音声のみ・再生速度(非 Apple 常時表示)・PiP・リピート・自動再生・ミュート解除プロンプト
- **プレミア公開**未達の場合は `premiere_scheduled` エラーコードで「公開予定: ...」待機 UI
- 動画不可エラーコード集合: `members_only, private, deleted, copyright_removed, account_terminated, unavailable, premiere_scheduled`

**Type3 — ダウンロード**
- 標準(360p muxed 複数)/ 音声のみ(複数)/ 映像のみ(解像度別)/ **m3u8 proxy(外部 m3u8.dev 併用で DL 可)**/ m3u8 raw(直接 DL 不可)/ 字幕 VTT のリンク + コピー

### 5.7 デプロイ形态(◎ README・DEPLOY_PROCEDURE・worker.js)

| 形態 | 仕組み | 特徴 |
|---|---|---|
| **(a) GAS Webアプリ** | `doGet()` が GitHub raw の `index.html.txt` を `UrlFetchApp.fetch` して `HtmlService` で配信。`siatubeApiGet()` が `/api/*` を `siatube.com` へ中継(1900 字以下は直接 fetch、超えたら `siawaseok.duckdns.org/api/bridge` POST) | **最軽量。Google アカウント + コピペだけで完結**。学校の `script.google.com/a/macros/<教育機関ドメイン>` 上で展開される事例が多数 |
| **(b) Cloudflare Workers** | `worker.js`: `/api/*` を `siatube.com` へプロキシ(host 削除・redirect manual・location リライト)、`/api/version-check`(GitHub raw, cacheTtl 300)、`/api/bridge` POST 中継、その他は `env.ASSETS`(静的) | 無料枠で API 中継 + 静的配信。ドメインごと量産可能 |
| **(c) 任意の静的ホスト** | `siatube-full.html.txt`(440KB、JS/CSS 統合)を置くだけ。「自動でアプデ反映されるからこちらがおすすめ」(README) | GitHub Pages 等。CDN ブロック環境では `ajgpw.github.io` 版 HTML への切替案内あり |
| **(d) Node 静的サーバー** | `server/index.js`(Express, port 8010, SPA fallback) | 開発用。v1.x ではここが API 本体だった |

**要 Node.js ≥20 / npm ≥11**(engines)。`postinstall` が client ビルドを連鎖実行。

---

## 6. 法的・合规性の位置づけ

> 本節は事実整理。弁護士による法的意見ではない。

1. **YouTube 利用規約**: 「本サービスまたはコンテンツのいずれかの部分に対しても、アクセス、複製、ダウンロード、配信…を行うこと」(提供インターフェース以外の手段)を禁止。しあTube の方式(InnerTube 直叩き・yt-dlp によるストリーム解決・署名 URL の再配布・embed ミラー DOM 経由)は**規約違反の性格**を持つ。ただし YouTube は一般個人向けサービスの多くに対して実務上は寛容で、**本サービスに対する YouTube からの公開措置(差し止め・ブロッキング告知)は確認されていない**。
2. **日本の著作権法**: 視聴者側の私的使用複製(第30条)は問題になりにくい。リスクは**運営側**に集中する: ①技術的アクセス制御の回避として扱われ得る行為、②動画の公衆送信(再配信)に該当し得る構造(本サービスは「URL 案内 + 直リンク再生」を主体にすることで、再配信性を意図的に薄めていると読める)、③18+・地域限定・会員限定動画の取得(`hasDrm`, `members_only` 等を区別しているのはこのため)。
3. **LICENSE の免責**(◎): MIT に追加で「THE AUTHORS TAKE NO RESPONSIBILITY FOR ANY DAMAGES, LOSSES, OR **LEGAL ACTIONS** RESULTING FROM THE USE OF THIS SOFTWARE.」= 使用による法的措置まで想定した免責。
4. **運用上の対抗措置**(◎ソースから読み取れる、YouTube 側の締め付けへの防御): 専用プロキシ経由の解決(`ytproxy-...:3007`)、WEB_EMBEDDED_PLAYER への client 指紋合わせ、JS ランタイムでの署名復元(`--js-runtimes node`)、UA/Sec-* ヘッダの完全再現(`REQUEST_HEADERS`)、`ip=` 紐付けへの対処、複数ドメイン・複数アカウント分散、**「ブロックされた場合はこちら」導線**、health/status 監視。
5. **同種サービスの先行事例**: **TKtube**(tktube.com、同種の動画代理系)は 2026-06-22 頃からエラー521/NXDOMAIN により事実上閉鎖(公式発表なし。サーバー没収・買収等の諸説)。しあTube 自身は「復活」を示唆する Scratch 投稿から一時停止を経験した痕跡はあるが、**公開報道のあるような摘発・閉鎖は確認されていない**(2026-09-12 時点)。
6. **学校利用の背景**: 需要の中心が「学校のフィルタ回避」であることは、学校側の情報管理ポリシーとの衝突を内々に抱えるサービスであることも意味する(§1.2)。

---

## 7. 競合・周辺エコシステム

### 7.1 日本発「*tube」系(同一文化圏・同種設計)

| サービス | 開発/場所 | 備考(◎○△) |
|---|---|---|
| **しあTube** | siawaseok 系 | 本調査対象。中央 API + 静的 SPA |
| **わかめtube** | siawaseok 系(前史) | `siawaseok3/wakame`「量産版」。trend.json 自動更新 |
| **Choco tube** (Choco-Tube-Plus) | kuru-bana(toka-kun が fork) | 「**invidious & piped 依存**の youtube 代替サイト」= 別アーキテクチャ(既存 OSS フロントエンドを中核) |
| **MIN-Tube** (MIN-WLYT-Plus) | wl-unblock | 同種 |
| **YuZuTube** | yuzubb | 同種 |
| **Wool-Tube** (Normal/Education版) | toka-kun | 「Education版」= youtubeeducation.com 埋め込み特化の痕跡 |
| **Yuki YouTube+ / YouTube Plus+ / わかめtube Plus(wkt-Plus)** | toka-kun | wkt-Plus は EJS 製、**161 forks**(しあTube より GitHub 上は多い) |
| **Yotube** | (未詳) | Scratch タイトルで言及のみ |
| **NecoTube** | toka-kun の GitHub org | 同種サイトの団体/管理 |

特徴: **しあTube を中心に「フォーク・互換・別実装」の群落**が存在し、個人開発者同士が相互参照しながら学校利用需要を分け合っている状態。

### 7.2 グローバルな OSS YouTube フロントエンド(比較軸)

| プロジェクト | 方式 | しあTube との差異 |
|---|---|---|
| **Invidious** | Server-side(YouTube scraper)+ 別フロント | 全機能 OSS・ピア運営。しあTube は中央 API がクローズド(v1.5.4 相当のみ OSS) |
| **Piped** | Invidious 由来 API + 軽量フロント | 同上。Choco tube は Piped/Invidious 依存 |
| **FreeTube** | デスクトップ(Electron)+ InnerTube | クライアント単体で解決(中央不要)。学校配布には不利 |
| yewtube / Tactile / InvNado / WebTube 等 | 軽量フロント + 任意バックエンド | 日本語 UI・GAS 配布の文化はない |

### 7.3 一般 Web プロキシ / Unblock サイト

CroxyProxy, Kazwire, YouTubeUnblocked 系は「サイトごと転送」の別カテゴリ。しあTube 群は **YouTube 専用・ネイティブ品質(高画質/字幕/ライブ/コメント)** を提供することで差別化。

### 7.4 差別化の核心(しあTube が日本で機能している理由)

1. **日本語 UI + 日本語文化の配布導線**(Scratch 製教程、GAS コピペ、Chatwork/LINE サポート)
2. **API 解決を中央で請け負う**(ユーザーは yt-dlp も Piped インスタンスも不要)
3. **単一 HTML + 無料ホスティングで自己ホスト可能**(学校フィルタの DOM 回避)
4. **公式 embed ミラー(youtubeeducation.com)経由の再生経路**(Type1)を備える

---

## 8. 本プロジェクト(YouTube Proxy Site)への示唆

### 8.1 採用候補パターン(しあTube 実装から抽出)

| # | パターン | 根拠 | 採用可否の判断軸 |
|---|---|---|---|
| 1 | **解決/配信の分離**: サーバーは yt-dlp・InnerTube で「署名 URL + メタ」を返し、クライアントは `googlevideo.com` に直接再生(バイト中継ゼロ) | §5.1/5.5 | 帯域コスト最小。ただし `ip=` 束縛の扱い(§8.2-3)が前提 |
| 2 | **`c=WEB_EMBEDDED_PLAYER` での解決**で広告なし・高画質拿到的 | §5.5-3 | 広告/品質の本命。YouTube 側の変更(指紋強化)に最も敏感な部分 |
| 3 | **yt-dlp 子プロセス**(`-J --skip-download --js-runtimes node`)+ 専用プロキシ | §5.4 | 実装最速で堅牢。更新頻度の高い yt-dlp との相性必須 |
| 4 | **InnerTube 直叩き**(WEB client, hl=ja, gl=JP)でメタ/related/コメントを continuation 取得。サムネイルは base64 化 | §5.4 | yt-dlp 不要で高速。公開 API key・clientVersion の陳腐化管理が必要 |
| 5 | **単一 HTML(440KB)自己ホスト配布** + GAS/CF Workers/任意静的の 3 形態デプロイ | §5.7 | 学校・制限環境でのリーチに決定的。自動更新は GitHub raw 参照で |
| 6 | **`/api/bridge` POST 中継**(長い continuation token の URL 長制限回避)+ `/exec` リダイレクト(GAS 互換) | §5.3/5.4 | GAS での利用が必須なら必須 |
| 7 | **ホット設定**: GitHub raw / Google Spreadsheet からの params・trend.json 参照(リデプロイ不要) | §5.4/6.5 | 運用コストが劇的に下がる。単一障害点でもある |
| 8 | **堅牢性**: health 探知、`/api/stream/status`(待ち時間表示)、429 バックオフ(2.1s)、stream キャッシュ TTL 5 分、ユーザー側リクエストプロキシ + JSONP フォールバック、タイムアウト無効化トグル | §5.2/5.3 | 学校 LAN・プロキシ環境での生存率向上 |
| 9 | **再生の 3 層フォールバック**: embed ミラー(Type1) / muxed360p 安全デフォルト → DASH/HLS 高画質(Type2) / ダウンロード(Type3)。m3u8 は HLS+fallback、ライブは m3u8 特化 | §6 相当(§5.6) | 失敗率の実務での最小化 |
| 10 | **無料ホスティング量産**: CF Workers + GAS + GitHub Pages(+ wakame 系は Vercel/Netlify/Render/Railway 全部) | §2.3/5.7 | コストゼロで冗長化。duckDNS 系 VPS を最終リレーに |

### 8.2 注意・設計上の難所(しあTube の弱点 = 我々の設計課題)

1. **中央 API の単一障害点**: siatube.com が落ちると全自己ホストインスタンスの再生が死ぬ(v2.x の構造)。v1.x 方式ならユーザーが API まで自己ホストできるが、負荷・リスクも各自に転嫁。→ **API 層を self-hostable にし、中央 API は「ファストスタート用」にする**方針が選択肢
2. **`ip=` 署名束縛**: 解決 IP と再生 IP の不一致問題。shiatube は `ip=118.151.x`(サーバー IP)が URL に入るまま配布している = 再生失敗に耐えるフォールバック(§5.6)で補っている。→ 我々は **リクエスト元 IP 指定解決(PO token 併用) or 帯域許容できる範囲でストリーム中継**の設計判断が必要
3. **公開 InnerTube key・古い clientVersion**(v1.5.4 の `2.20240214.01.00`)は既に陳腐化し得る。指紋維持コストは継続的
4. **youtubeeducation.com の依存**: 第 3 者のミラー DOM に生存を預けている。代替(公式 embed の別経路・自前リレー)も設計に含めるべき
5. **Google Spreadsheet 設定の無認証更新**: 改ざん・消失リスク(ただし悪用されれば全クライアントに波及する双刃剣)
6. **法的リスクの承知**: §6 の通り。運営ドメイン・アカウントの分散、免責文言、コンテンツの二次利用(保存・再配布)をしない設計がリスク低減の基本
7. **規模感の不透明さ**: ユーザー数・帯域・収益(有料プランなし、広告なし、寄付情報なし)の公開データはない → 需要は実在するがビジネスモデルは未設計(= 我々の参入余地でもある)

### 8.3 要再確認事項(Open Questions)

| # | 項目 | 現状 | 確認方法 |
|---|---|---|---|
| 1 | siatube.com / shiatube.jp / 旧 dom の**初登場日** | Wayback Machine 一時停止で未取得 | IA 復旧後に CDX API |
| 2 | v2.x API のソース公開有無 | 未発見(v1.5.4 が最後の公開バックエンド) | GitHub 検索・コミュニティ確認 |
| 3 | 開発者の実像(個人・年齢) | Scratch/学校文脈から推測可能な範囲のみ。断定はしない | 断定しない(情報も収集しない) |
| 4 | `ytproxy-siawaseok.duckdns.org:3007` の実体(IP プール? 住宅 IP?) | 挙動から推測のみ | 必要な時だけパッシブ観測 |
| 5 | 一時停止期間と「しあtube復活！！」の経緯 | Scratch 投稿の存在のみ | Chatwork/LINE は非公開 |
| 6 | html.cafe と開発者の関係(運営同一? 別ミラー?) | 同一実装であることは確実、運営関係は未確認 | サイト内表記・DNS 比較 |

---

## 9. ソース一覧

### 9.1 クローン済みリポジトリ(◎)

| リポジトリ | 本地 | HEAD | 読んだ主なファイル |
|---|---|---|---|
| `ajgpw/youtube`(しあtube 静的サイト版 v2.1.7) | `/tmp/siatube` | `97aa001a2f57f7e4e1e90a03cb8abb09a6f57a4a` (2026-09-01) | README.md, DEPLOY_PROCEDURE.md, LICENSE, package.json(x2), worker.js, wrangler.toml, index.html.txt, siatube-full.html.txt(部分), server/index.js, client/src/**(api.js, services/siatubeApi.js, components/StreamType1-3.vue, utils/youtubeEducationPlayer.js, hlsLoader.js, siatubeAdapters.js, requestProxy.js(部分), views/SettingsView.vue(部分), utils/** 一覧), test/**(一覧), git log 全履歴 |
| `siawaseoktest/youtube`(しあtube v1.5.4、元リポジトリ) | `/tmp/siatube-upstream` | `5c90fec0857dee17bd40b42e3fe9d8c5ed43fdd6` (2026-03-21) | README.md, LICENSE, package.json, install-yt-dlp.js, server/index.js, server/routes/**(全部: stream-url.js, videoinfo.js, search2.js, playlist.js(部分), channel.js, comment.js, suggest.js, fallback.js) |

### 9.2 ライブ観測(◎ 読み取り専用 GET、2026-09-12)

| URL | 結果 |
|---|---|
| `https://siatube.com/health` | `{"status":"ok"}` |
| `https://siatube.com/api/stream/dQw4w9WgXcQ` | 完全なストリーム解決 JSON(§5.5)。googlevideo URL ×N、`c=WEB_EMBEDDED_PLAYER`、`ip=118.151.202.141`、字幕/キャプションメタ 1161 件 |
| `https://siatube.com/`(ルート) | 「PC戦闘力チェッカー」(同一ドメイン上の別ツール。API は `/api` に健在) |
| `https://html.cafe/` | しあTube ミラー稼働中(急上昇/動画/チャンネル路由確認) |
| `https://html.cafe/xc2d96fe6` | SEO 紹介ページ(「YouTube匿名視聴サイト…日本向け」) |
| DNS: siatube.com | Cloudflare(2606:4700::/32) |

### 9.3 一次Web情報(○)

| URL | 内容 |
|---|---|
| https://github.com/ajgpw/youtube | 現行リポジトリ README(GAS デプロイ手順・連絡先: siawaseok@siatube.com / LINEオープンチャット / Chatwork) |
| https://github.com/siawaseoktest/youtube | 元リポジトリ(「頻繁に更新するのは ajgpw/youtube」、TOPICS: proxy siatube youtube youtubeproxy、About: siawaseok.duckdns.org) |
| https://github.com/siawaseok3/wakame | 「わかめtube copyは、わかめtubeの量産版です」、trend.json 自動更新(12,150 commits) |
| https://github.com/siawaseok / https://github.com/siawaseok2(Scratch) / https://scratch.mit.edu/users/siawaseok2/ | 開発者 ID・プロフィール(「幸せならokです！」「YUKIBBS→chatwork」「Proxy作成 気分で開発してます」) |
| https://github.com/toka-kun / NecoTube org | 同種エコシステム(wkt-Plus 161 forks、Choco-Tube-Plus fork 等) |
| https://scratch.mit.edu/projects/1363645530/ 等 | 「しあtube復活！！」「【youtube/プロキシ】しあtubeの作り方」 |

### 9.4 二次情報(△)

| URL | 内容 |
|---|---|
| https://neroblo.com/github-shiatube/ (2026-07-09) | GAS デプロイの初心者向け完全教程(「学校でもできるか」FAQ 等) |
| https://html.cafe/xc2d96fe6 | サービス紹介(匿名・広告なし・日本向け) |
| https://detail.chiebukuro.yahoo.co.jp/qa/question_detail/q14328637224 (2026-06) | 利用障害 Q&A(「ブロックされた場合はこちら」導線・Choco tube 代替言及) |
| https://detail.chiebukuro.yahoo.co.jp/qa/question_detail/q10327274745 (2026-04) | 学校利用 Q&A(GAS URL 共有) |
| https://charat.me/dotch/ja/vs/21428 (2025-11~2026-05) | 学校タブレットの YouTube 視聴スレッド(GAS 版しあtube 共有多数) |
| https://ankey.io/wordbooks/d533shi9io6g02u81uvg (2025-12) | 「しあtube ってゆうプロキシ」スレッド(規制回避の効用言及) |
| https://the-seo.co.jp/1340/ , https://journal-newsroom.com/tktube-error-521/ , https://note.com/vpn_perfect/n/n2f8835ddfcfd (2026-06~07) | TKtube 閉鎖の報(競合環境の脆性) |
| https://aviutl.info/daunnro-do-ihou/ , https://youtube-tsushin.tokyo/archives/1536 , https://maruc.work/20230702-youtube (2018~2026) | 日本法・YouTube ToS の解説(§6 の背景) |

### 9.5 取得できなかった情報(記録)

- Wayback Machine(CDX): 調査当日 Internet Archive が一時停止。ドメイン初登場日未取得
- しあTube の公式 X アカウント: 検索では存在確認できず(コミュニティは Chatwork/LINE/Scratch 中心)
- 主流メディア(GIGAZINE/ITmedia/ZUU 等)の報道: 確認されなかった
- `siatube.com` への直接 curl(サンドボックス出網制限): SSL 切断 → fetch_page 経由で観測に切替

---

## 10. 本調査の位置づけ・次アクション提案

- 本ドキュメントは `research/` の補助資料であり**仕様正本ではない**。採用判断は計画書（`docs/arch/` が存在する場合はそれ）へ反映してから実装する。
- 直近の推奨ステップ(提案):
  1. §8.1 の #1~#4 を基に、**MVP の API 設計**(endpoint 一覧 = §5.3 を流用可)を arch 書に起稿
  2. 「自己ホスト可能 API 化」か「中央 API 固定」かの**アーキ判断 ADR**(§8.2-1 が本質)
  3. yt-dlp の `--extractor-args "youtube:player_client=embedded"` 相当の指針と、PO token / リクエスト元 IP 解決の実証実験
  4. 単一 HTML 配布 + GAS/CF Workers デプロイのパッケージ化(§5.7)
  5. 法的リスクの取り決め(利用規約・免責・DMCA 相当の削除対応フロー)を arch/legal に起稿
