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
| pnpm/Next.js/GAS/StreamSaver の使いどころ・実測ハマり | [`tech-stack/SKILL.md`](./tech-stack/SKILL.md) |
| 「動かない / 検証できない / YouTube 系に接続したい」環境トラブル | [`sandbox-constraints/SKILL.md`](./sandbox-constraints/SKILL.md) |
| 品質ツールチェーン（TS strict / biome 2.x / vitest / coverage / Playwright）の設定・ハマり | [`quality-toolchain/SKILL.md`](./quality-toolchain/SKILL.md) |
| 設計の正本（全体アーキテクチャ・スタック・API 設計・リゾラ仕様） | [`../../docs/planning/PHASE0_PLAN.md`](../../docs/planning/PHASE0_PLAN.md) |
| 検証証跡（V1〜V4・O1〜O9 観察） | [`../../docs/research/VERIFICATION_P0.md`](../../docs/research/VERIFICATION_P0.md) |

## スキル一覧

| スキル | できるようになること（Agent の能力） | 最終更新 |
| :--- | :--- | :--- |
| [project-overview/SKILL.md](./project-overview/SKILL.md) | プロダクト目標・2 フェーズ運用・確定設計（D1〜D9）・フェーズ進捗を素早く把握する | 2026-09-21（リポジトリ構成ツリーを DOC-1 後整合） |
| [tech-stack/SKILL.md](./tech-stack/SKILL.md) | pnpm/Next.js export/Tailwind v4/GSAP/Dexie/GAS(UrlFetchApp・watch 抽出・decipherer)/StreamSaver を正しい形で使い、実測ハマりを回避できる | 2026-09-21（.archive 参照を除去・DOC-1） |
| [sandbox-constraints/SKILL.md](./sandbox-constraints/SKILL.md) | Sandbox の egress ブロック / re-clone / ユーザー実行キット運用 / Web UI コミットを迂回して検証・復旧できる | 2026-09-21（Git 運用の知見を追加・DOC-1） |
| [quality-toolchain/SKILL.md](./quality-toolchain/SKILL.md) | 品質ツールチェーン（TS strict / biome 2.x / vitest / coverage / Playwright）を正しい形で設定し、実測ハマりを回避できる | 2026-09-21（新規・cod-web 期ログ 7 件をインポート） |

## 設計仕様の正本（スキルではなく docs/）

| 文書 | 内容 |
| :--- | :--- |
| [docs/HANDOVER.md](../../docs/HANDOVER.md) | 引き継ぎ入口 + **確定設計 D1〜D9（§4）** + 技術事実（§7）+ 環境注意（§11） |
| [docs/planning/PHASE0_PLAN.md](../../docs/planning/PHASE0_PLAN.md) | P00 計画 + 全体アーキテクチャ（§10）+ スタック（§10.4）+ リポジトリ構成（§10.5）+ API v1（§10.6）+ リスク（§11） |
| [docs/research/VERIFICATION_P0.md](../../docs/research/VERIFICATION_P0.md) | 検証証跡 V1〜V4 + 観察 O1〜O9（GAS/YouTube 実測の一次資料） |
| [docs/research/DOWNLOAD_MECHANISM_RESEARCH.md](../../docs/research/DOWNLOAD_MECHANISM_RESEARCH.md) | DL 機構調査（StreamSaver / 直リンク / 方式 A・B・C 比較 + 決定記録） |
| [docs/research/SHIATUBE_DEEP_RESEARCH.md](../../docs/research/SHIATUBE_DEEP_RESEARCH.md) | しあTube 完全調査（API 形状実測等 = 参考資料） |
| `docs/arch/` | **まだ存在しない**（P1 以降に新規作成予定） |

> 実装テクニック・実測ハマりどころは **skills** に貯め、設計の事実は **docs/** を正本とする。

## 運用ルール

- 新しいノウハウ（特に**実測で判明した**制約・挙動）を得たらスキルとして追加/更新し、本 index の「最終更新」も更新する。
- 新スキル追加時は「読み方ガイド」と「一覧」の両方に追記する。
- スキルは実践的なやり方・コードパターン・回避策を書く。設計の正本は docs/。
- AGENTS.md と重複する作業規約はスキルに書かず AGENTS.md を正とする。
- 各スキルは `<kebab-case>/SKILL.md`（YAML frontmatter に `name` / `description`）。
