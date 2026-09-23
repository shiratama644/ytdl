# DOC-4: メタデータ取得を youtubei.js へ改訂(yt-dlp = 将来の DL 担当)

> Date: 2026-09-23(JST) / Commit: `d34bbbb` / Branch: `arena/01a0c3bb-ytdl`(セッション固定ブランチ)
> 前段: `c3f1e14` + `af6626b`(DOC-3 = server-first への計画再構成。ログ = `2026-09-23_doc-3-server-first-restructure.md`)

## 1. 指示内容 (Task Summary)

- ユーザー指示(2026-09-23):「**yt-dlp と youtubei.js を使うようにしてください**」。補足 = youtubei.js は動画の取得・
  ライブ配信の閲覧は少し難しいが、メタデータ等の YouTube クライアント実装が JS で統合されており yt-dlp より比較的簡単。
- 追加指示(2026-09-23・確定):「**現段階である Youtube クライアントの作成では youtubei.js のみ使う**ということです。
  **今後のダウンロード機能のときに yt-dlp が出てきます**」。
  - → **現段階のメタデータ取得 = youtubei.js のみ**(検索 / 動画 / チャンネル / プレイリスト / 統計 / コメント /
    サジェスト / トレンド / Live Chat)。**yt-dlp は現段階では導入しない**(将来の DL 機能で導入)。
  - → **自前のページ抽出フォールバックは実装しない**(V1-d のアルゴリズムは証跡として保存)。
- 維持される決定: 再生 = **iframe 一本**(`youtubeeducation.com/embed` 既定・公式 embed 差し替え可)/ DL = **保留(実装対象外)** /
  サーバー一本 = **Bun + Hono + Nginx(Docker Compose・自宅 Proxmox LXC/VM)** / siatube.com API 不使用 /
  **O9(429 対策)は必須**(キャッシュ + リトライ/バックオフ + single-flight)。
- ゴール: 上記を**全文書に反映**し、**V6 キットを v2 へ更新**(実行手順も v2 に合わせる)。

## 2. サンドボックス実測(youtubei.js)

| 項目 | 実測結果 |
|---|---|
| 導入 | `npm install youtubei.js@18.1.0`(Node 22)。**Sandbox に Bun は無い**(`bun: command not found`) |
| 起動 | `import` = 394 ms |
| クライアント生成 | `Innertube.create({ lang:'ja', location:'JP', generate_session_locally:true, retrieve_player:false, retrieve_innertube_config:false })` = **ネットワークなしで成立(73 ms・clientName = WEB)** |
| ネットワーク系 | `search` / `getInfo` は **`TypeError: fetch failed`**(Sandbox の egress 遮断。youtubei.js 側の問題ではない。自宅回線での可否 = **V6**) |
| 型定義(API 面) | `search(query, {type})` / `getSearchSuggestions` / `getInfo` / `getBasicInfo` / `getComments` / `getChannel` / `getPlaylist` / `getPlaylists` / `getHomeFeed` / `getHistory` / `getSubscriptionsFeed` / `getHashtag` / `getStreamingData` / `download` / `actions.execute(endpoint, args)` |
| Live Chat | `getInfo(id).getLiveChat()`(VideoInfo のメソッド = `LiveChatWrap`) |
| トレンド | 専用メソッドが見当たらない → `yt.actions.execute('/browse', { browseId: 'FEtrending' })` を使う想定(**V6 で確認**) |
| クライアント種別 | `InnerTubeClient` = `WEB`(既定)/ `MWEB` / `IOS` / `ANDROID` / `ANDROID_VR` / `VISIONOS` / `TV` / `TV_EMBEDDED` / `WEB_EMBEDDED` / `WEB_CREATOR` / `YTMUSIC` / `YTKIDS` 等 |
| パッケージ | youtubei.js@18.1.0(2026-09-22 公開)/ **MIT** / ESM / deps = `fflate`・`meriyah`・`@bufbuild/protobuf` |

## 3. 実行内容 (Executed Actions)

| # | 対象 | 内容 |
|---|---|---|
| 1 | `verification/v6-metadata-check.mjs`(**v2 へ全面書換**) | モード = `probe`(既定・ネットワーク 0)/ `innertube`(生 fetch 4 件 = watch ページの API キー取得 → `/youtubei/v1/player` → `/youtubei/v1/search`)/ `youtubei`(実機能。既定 steps = `search,video`、`--steps=all` = +channel / playlist / home / trending / livechat)/ `ytdlp`(存在確認のみ・将来の DL 用)/ `all`。args = `--id=` `--q=` `--channel=` `--playlist=` `--live=` `--deps=` `--steps=` `--force`。**10 分ガード** + リクエスト間 4 秒。結果を `v6-result.json` に保存 |
| 2 | `docs/HANDOVER.md` | §1 概要 / §2 目標 / §4 判断表(**D2 再改訂・D11 改訂・D13 新設**) / §5 アーキ図 / スタック / §6 検証表(V1-a・V1-b・V6) / §7.6・§7.7 追記 / §7.9 / **§7.10 新設(youtubei.js 実測)** / §8.2(V6 キット v2)/ §8.3(P00 仕様 = youtubei.js)/ §9 構成 / §10(DOC-4 行)/ §12(指示例)/ §13 / §14 / 付録 |
| 3 | `docs/planning/PHASE0_PLAN.md` | §2 目的 / §5 DoD / §6 テスト方法(オフライン生成)/ §9 P00-D / §10.2 図 / §10.3 C4 / §10.4 スタック / §10.5 構成 / §10.9.1 検証リスト(V6 を v2 に)/ §11 リスク(R2・R13)/ §10.10 |
| 4 | `AGENTS.md` | §0 / §3.1(禁止表現 = youtubei.js / InnerTube)/ §6.1(スタック・判断表 D13)/ §6.3(メタデータ解決 = youtubei.js・O9・禁止事項) / §6.5 |
| 5 | `README.md` / `docs/README.md` / `docs/planning/README.md` / `docs/research/README.md` | メタデータ = youtubei.js / V6 = youtubei.js の前提確認 / 索引の記述 |
| 6 | `.agent/skills/`(index・tech-stack・project-overview・sandbox-constraints) | スタック表・§メタデータ取得(主経路 = youtubei.js、旧 yt-dlp 節は「将来 DL 時」として整理)/ 確定設計に **D13** / V6 の説明を v2 に |
| 7 | `.agent/hooks/verify-before-commit.md` | 検証観点 = youtubei.js クライアントを 1 個使い回す・O9・オフライン生成での CI |
| 8 | `verification/README.md` | V6 の実行手順を v2 に全面改訂(`npm install youtubei.js` → probe → `--mode=innertube` → `--mode=youtubei` → `--steps=all` → `--mode=ytdlp`) |
| 9 | `docs/research/VERIFICATION_P0.md` | §V6 を V6-0〜V6-4 に更新 / 状態サマリ・設計への影響に **DOC-4 の保留マーカー** / §10.8 → §10.9.1 の参照修正 |
| 10 | `docs/research/SIATUBE_CODE_VERIFICATION.md` / `SHIATUBE_DEEP_RESEARCH.md` / `DOWNLOAD_MECHANISM_RESEARCH.md` | 現行スコープの採用判断(iframe + youtubei.js)/ DL 再開時の担当 = yt-dlp(D13)の注記 |
| 11 | `docs/task-list.md` | V6 行(キット v2)/ 設計判断の現状 / P00-D / V1-a・V1-b 行 / **DOC-4 行追加** |

## 4. 検証 (Verification)

- キット: `node --check verification/v6-metadata-check.mjs` = OK / `--mode=probe` = OK(ネットワーク 0 回・`youtubeiPkg.resolved` を表示)/
  `--mode=youtubei`(youtubei.js を入れたディレクトリで実行)= 解決 18.1.0・clientCreated = true(WEB)・ネットワーク系は
  `fetch failed`(Sandbox 遮断 = 想定内)/ `--mode=innertube --force` = watch ページ取得が `fetch failed`(同)/
  10 分ガード = 前回実行から 10 分未満で中断 + warning を出力(**exit code 3**・`--force` で回避)。
- キットの軽微な不具合 2 件(実行 step が 0 件のときの notes 文言・リクエスト数の二重計上)を修正して再検証。
- ドキュメント: 相対リンク 148 件・切れ 0(`AGENTS.md` の書式例 `[id](url)` を除く)/ 表の列数不整合 0(既知の `\|` エスケープ誤検出を除く)/
  「現行のメタデータ = yt-dlp」とする記述 0(DOC-3/DOC-4 の履歴記述を除く)。
- 簡体字の混入なし(DOC-3 で修正済みの 8 箇所を再確認)。

## 5. 未了・次の一手

- **V6 の本実行はユーザー環境待ち**(自宅回線。キット v2 は `npm install youtubei.js` が必要)。V5(ブラウザ iframe)も未実施。
- **P00 の GO 待ち**(推奨順 = B → C → D → E → F。B/C は V5・V6 の結果に依存しないため先行可)。
- DL の再開は保留のまま(再開時は **yt-dlp** = D13。設計は §10.8 / `DOWNLOAD_MECHANISM_RESEARCH.md` に保存)。
