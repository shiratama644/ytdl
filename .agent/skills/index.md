# Skills Index — Agent のスキル集

> このファイルは `.agent/skills/` の**入口**。タスク着手時に本ファイルだけ読み、
> 必要なスキルだけをピンポイントで読み込む（コンテキストの無駄遣いを防ぐ）。
>
> ここにあるのは **Agent 自身のスキル** — 「このプロジェクトで何をどうやるとうまくいくか」
> という実践的なノウハウ・テクニック・手順・パターン・コードベース知識・実測知見。
> 設計仕様の正本ではない。設計の正本は [`../../docs/`](../../docs/README.md)
> （計画書 = `docs/planning/`、証跡 = `docs/research/`、確定設計 = `docs/HANDOVER.md` §4）。
> 作業規約は [`../../AGENTS.md`](../../AGENTS.md)。

## 読み方ガイド（どの状況でどのスキルを使うか）

| 状況 | 使うスキル |
| :--- | :--- |
| 初回 / 全体把握 | [`project-overview/SKILL.md`](./project-overview/SKILL.md) |
| pnpm / Next.js export / Bun + Hono API / yt-dlp / Docker Compose + Nginx の使いどころ・実測ハマり | [`tech-stack/SKILL.md`](./tech-stack/SKILL.md) |
| 「動かない / 検証できない / YouTube 系に接続したい」環境トラブル | [`sandbox-constraints/SKILL.md`](./sandbox-constraints/SKILL.md) |
| 品質ツールチェーン（TS strict / biome 2.x / vitest / coverage / Playwright）の設定・ハマり | [`quality-toolchain/SKILL.md`](./quality-toolchain/SKILL.md) |
| しあTube 実コードの iframe プレイヤー方式（D1 改訂の根拠・未検証項目） | [`../../docs/research/SIATUBE_CODE_VERIFICATION.md`](../../docs/research/SIATUBE_CODE_VERIFICATION.md) |
| 設計の正本（全体アーキテクチャ・スタック・API 設計・リゾラ仕様） | [`../../docs/planning/PHASE0_PLAN.md`](../../docs/planning/PHASE0_PLAN.md) |
| 検証証跡（V1〜V6・O1〜O9 観察） | [`../../docs/research/VERIFICATION_P0.md`](../../docs/research/VERIFICATION_P0.md) |

## スキル一覧

| スキル | できるようになること（Agent の能力） | 最終更新 |
| :--- | :--- | :--- |
| [project-overview/SKILL.md](./project-overview/SKILL.md) | プロダクト目標・**サーバー一本の構成**・設計判断（D1〜D12 + 状態）・フェーズ進捗を素早く把握する | 2026-09-23（server-first を反映・DOC-3） |
| [tech-stack/SKILL.md](./tech-stack/SKILL.md) | pnpm / Next.js export / Tailwind v4 / GSAP / Dexie / **Bun + Hono API + yt-dlp** / Docker Compose + Nginx / iframe 再生を正しい形で使い、実測ハマりを回避できる | 2026-09-23（server-first を反映・DOC-3） |
| [sandbox-constraints/SKILL.md](./sandbox-constraints/SKILL.md) | Sandbox の egress ブロック / re-clone / ユーザー実行キット（V5・V6）運用 / Web UI コミットを迂回して検証・復旧できる | 2026-09-23（server-first を反映・DOC-3） |
| [quality-toolchain/SKILL.md](./quality-toolchain/SKILL.md) | 品質ツールチェーン（TS strict / biome 2.x / vitest / coverage / Playwright）を正しい形で設定し、実測ハマりを回避できる | 2026-09-21（新規・cod-web 期ログ 7 件をインポート） |

## 設計仕様の正本（スキルではなく docs/）

| 文書 | 内容 |
| :--- | :--- |
| [docs/HANDOVER.md](../../docs/HANDOVER.md) | 引き継ぎ入口 + **確定設計 D1〜D12（§4）** + 技術事実（§7）+ 検証（§8）+ 環境注意（§11） |
| [docs/planning/PHASE0_PLAN.md](../../docs/planning/PHASE0_PLAN.md) | P00 計画 + 全体アーキテクチャ（§10）+ スタック（§10.4）+ リポジトリ構成（§10.5）+ API v1（§10.6）+ リスク（§11） |
| [docs/research/VERIFICATION_P0.md](../../docs/research/VERIFICATION_P0.md) | 検証証跡 V1〜V6 + 観察 O1〜O9（YouTube/GAS の実測一次資料。**V5/V6 = 実行待ち**） |
| [docs/research/DOWNLOAD_MECHANISM_RESEARCH.md](../../docs/research/DOWNLOAD_MECHANISM_RESEARCH.md) | DL 機構調査（**保留** = 実装対象外。再開時に参照） |
| [docs/research/SIATUBE_CODE_VERIFICATION.md](../../docs/research/SIATUBE_CODE_VERIFICATION.md) | しあTube 実コード確認（iframe 方式の実装詳細 = D1 改訂の根拠・2026-09-23） |
| [docs/research/SHIATUBE_DEEP_RESEARCH.md](../../docs/research/SHIATUBE_DEEP_RESEARCH.md) | しあTube 完全調査（API 形状実測等 = 参考資料） |
| `docs/arch/` | **まだ存在しない**（P1 以降に新規作成予定） |

> 実装テクニック・実測ハマりどころは **skills** に貯め、設計の事実は **docs/** を正本とする。

## 運用ルール

- 新しいノウハウ（特に**実測で判明した**制約・挙動）を得たらスキルとして追加/更新し、本 index の「最終更新」も更新する。
- 新スキル追加時は「読み方ガイド」と「一覧」の両方に追記する。
- スキルは実践的なやり方・コードパターン・回避策を書く。設計の正本は docs/。
- AGENTS.md と重複する作業規約はスキルに書かず AGENTS.md を正とする。
- 各スキルは `<kebab-case>/SKILL.md`（YAML frontmatter に `name` / `description`）。
