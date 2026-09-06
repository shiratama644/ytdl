# Skills Index — Agent のスキル集

> このファイルは `.agent/skills/` の**入口**。タスク着手時に本ファイルだけ読み、
> 必要なスキルだけをピンポイントで読み込む（コンテキストの無駄遣いを防ぐ）。
>
> ここにあるのは **Agent 自身のスキル** — 「このプロジェクトで何をどうやるとうまくいくか」
> という実践的なノウハウ・テクニック・手順・パターン・コードベース知識。
> 仕様書（設計の正本）ではない。設計の事実は [`../../docs/arch/`](../../docs/arch/README.md) が正本。
> 作業規約は [`../../AGENTS.md`](../../AGENTS.md)。

## 読み方ガイド（どの状況でどのスキルを使うか）

| 状況 | 使うスキル |
| :--- | :--- |
| 初回 / 全体把握 | [`project-overview/SKILL.md`](./project-overview/SKILL.md) |
| ライブラリ・ツールの選定や使い方・ハマりどころ | [`tech-stack/SKILL.md`](./tech-stack/SKILL.md) |
| 環境トラブル・ネットワーク・CI制約など | [`sandbox-constraints/SKILL.md`](./sandbox-constraints/SKILL.md) |
| 設計の正本（プロダクト・ADR・マイルストーン等） | [`../../docs/arch/`](../../docs/arch/README.md) |

## スキル一覧

| スキル | できるようになること（Agent の能力） | 最終更新 |
| :--- | :--- | :--- |
| [project-overview/SKILL.md](./project-overview/SKILL.md) | プロダクト目標・開発フェーズ・全体構造を把握する | 2026-09-06（初期セットアップ） |
| [tech-stack/SKILL.md](./tech-stack/SKILL.md) | 技術構成とツールの実践的な使い方・ハマりどころを理解して実装できる | 2026-09-06（初期セットアップ） |
| [sandbox-constraints/SKILL.md](./sandbox-constraints/SKILL.md) | Sandbox 環境制約や GitHub App 権限制約を迂回して安全に検証・運用できる | 2026-09-06（初期セットアップ） |

## 設計仕様の正本（スキルではなく docs/arch/）

| 仕様書 | 内容 |
| :--- | :--- |
| [docs/arch/product.md](../../docs/arch/product.md) | プロダクト定義・ユースケース・要件 |
| [docs/arch/architecture.md](../../docs/arch/architecture.md) | 全体構成・レイヤー分割・依存規則 |
| [docs/arch/engineering.md](../../docs/arch/engineering.md) | 品質基準・コーディング規約・テスト方針 |
| [docs/arch/adr.md](../../docs/arch/adr.md) | アーキテクチャ決定ログ (ADR) |
| [docs/arch/milestones.md](../../docs/arch/milestones.md) | マイルストーン・ロードマップ |

## 運用ルール

- 新しいノウハウを得たらスキルとして追加/更新し、本 index の「最終更新」も更新する。
- 新スキル追加時は「読み方ガイド」と「一覧」の両方に追記する。
- スキルは実践的なやり方・コードパターン・回避策を書く。設計の正本は docs/arch。
- AGENTS.md と重複する作業規約はスキルに書かず AGENTS.md を正とする。
- 各スキルは `<kebab-case>/SKILL.md`（YAML frontmatter に `name` / `description`）。
