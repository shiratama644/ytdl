# Skills Index — ytdl コードベース知識

> このファイルは `.agent/skills/` の**入口**。タスク着手時に本ファイルだけ読み、
> 必要なスキルだけをピンポイントで読み込む（コンテキストの無駄遣いを防ぐ）。
> 各スキルは「このコードベースの *事実/仕様/暗黙了解*」をまとめたもの。
> 作業規約（コミット手順・Lint 等）は `AGENT.md` を参照。

## 読み方ガイド（どの状況でどのスキルを読むか）

| 状況 | 読むスキル |
| :--- | :--- |
| 初回 / 全体把握 | [`project-overview.md`](./project-overview.md) → [`architecture-and-data-flow.md`](./architecture-and-data-flow.md) |
| 動画/コメント/検索/チャンネルのシリアライズ・変換 | [`innertube-and-media.md`](./innertube-and-media.md) |
| State / Store / テーマ / Download に関する操作 | [`state-and-storage.md`](./state-and-storage.md) |
| Next.js ルーティング / URL / ページ・API 追加 | [`routing-and-pages.md`](./routing-and-pages.md) |
| テスト / `__tests__` / vitest を触る | [`testing.md`](./testing.md) |
| 「動かない / 重い / ビルドが失敗する」環境トラブル | [`sandbox-constraints.md`](./sandbox-constraints.md) |

## スキル一覧

| ファイル | 概要 | 最終更新 |
| :--- | :--- | :--- |
| [project-overview.md](./project-overview.md) | 製品概要・技術スタック・ディレクトリ構成。最初に読む。 | 2026-09-07 |
| [architecture-and-data-flow.md](./architecture-and-data-flow.md) | Route Handler → Innertube → serialize → Client props、および Zustand / TanStack Query のデータフロー。 | 2026-09-07 |
| [innertube-and-media.md](./innertube-and-media.md) | `youtubei.js`（Innertube）取得・シリアライズ・動画プレイヤー（video.js / dashjs）・プロキシ。 | 2026-09-07 |
| [state-and-storage.md](./state-and-storage.md) | Zustand store（theme / player / download）と continuation-cache の設計・用途。 | 2026-09-07 |
| [routing-and-pages.md](./routing-and-pages.md) | App Router のページ・Route Handler 一覧と URL 設計。 | 2026-09-07 |
| [testing.md](./testing.md) | vitest 5 + jsdom 30 + Testing Library のテスト規約・`__tests__` 階層・スタブ/モック。 | 2026-09-07 |
| [sandbox-constraints.md](./sandbox-constraints.md) | Sandbox の制約（ffmpeg-static / material-color-utilities / Node ESM）と迂回策。 | 2026-09-07 |

## 運用ルール

- スキルを更新したら**必ず本 index.md の「最終更新」も更新**する。
- 新スキル追加時は「読み方ガイド」と「一覧」の両方に追記する。
- AGENT.md と重複する作業規約はスキルに書かず AGENT.md を正とする（スキルは*事実/仕様*中心）。
- ファイル名は `kebab-case.md`。
