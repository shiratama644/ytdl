# ドキュメント全面整理 + AGENTS.md / .agent/ の ytdl 書き換え（セッション移行準備）

> Date: 2026-09-16(JST) / Commit: 本ログを含むコミット / Branch: `git branch --show-current` 現値

## 1. 指示内容 (Task Summary)

ユーザー: 「別セッションに移行したいので、その前にすべてのドキュメントを整理し、
.agent の hooks / skills を更新し AGENTS.md も更新して、完全にドキュメントを整理してください」

= 引き継ぎ前の最終整理: 全ドキュメントが「V1 完了・P00 GO 待ち」の現状と一致すること +
エージェント側の規約・記憶システム（AGENTS.md / .agent/）を ytdl に適合させること。

## 2. 実行内容 (Executed Actions)

| # | 対象 | 変更 |
|---|---|---|
| 1 | `AGENTS.md` | **全面書き換え**（cod-web 規約 → ytdl 規約）。骨子（作業単位 / ワークフロー / Git 運用 / コミュニケーション / 記憶システム）はユーザーの house style を維持。§6 に ytdl 固有事項を追加: スタック表（pnpm / Next.js export / GAS プレーン JS 等）/ Sandbox 制約実測表 / **GAS・YouTube 運用ルール（リゾラ確定設計 + キット UX ルール）** / 4 設計原則原文 + 禁止表現 / D1〜D9 表 / docs 正本の地図（docs/arch は「未作成」と明記） |
| 2 | `.agent/hooks/index.md` | ytdl 対応表・一覧に更新 + 「検証キットを書く時」フック行追加 |
| 3 | `.agent/hooks/pre-task.md` | ytdl 向けに書き換え（re-clone 検知 / 正本の優先順位 / 確定設計の再議論禁止 / ユーザー実行キットの心構え） |
| 4 | `.agent/hooks/verify-before-commit.md` | ytdl 向けに書き換え（pnpm 系 4 検証 / GAS .gs の node --check / docs 期の grep チェック / .archive 未変更確認 / Web UI コミット同期） |
| 5 | `.agent/hooks/sandbox-rebuild-recovery.md` | **復旧手順を soft ベースに更新**（fetch 全 refspec → `reset --soft origin/<branch>` → `add -A` → 差分確認）。cod-web 期の `reset --hard` 例外は廃止（soft で十分安全 = 本日再検証） |
| 6 | `.agent/hooks/restore-sandbox-env.sh` | bun 導入 → **pnpm 導入**（npm 経由）+ pnpm-lock 次第の install に書き換え |
| 7 | `.agent/hooks/settings.json` | Stop フックを git status チェックに（pnpm 4 検証は P00-B で script 定義後に更新予定） |
| 8 | `.agent/skills/index.md` | ytdl 読み方ガイド・一覧・docs 正本表に更新（docs/arch = 未作成と明記） |
| 9 | `.agent/skills/project-overview/SKILL.md` | **全面書き換え**（ytdl 概要 / 2 フェーズ表 / D 判断 / フェーズ進捗 / リポジトリ構成） |
| 10 | `.agent/skills/tech-stack/SKILL.md` | **全面書き換え**（pnpm/Next/GAS/StreamSaver 等の使いどころ + **実測ハマり**: watch 抽出アルゴリズム / decipherer / O7 enum / O9 429 / relay の Range・whitelist / 単一 HTML / e2b プレビュー） |
| 11 | `.agent/skills/sandbox-constraints/SKILL.md` | **全面書き換え**（egress ブロック一覧 / re-clone / ユーザー実行キット運用ルール表 / ツール癖 / 断定禁止事項） |
| 12 | `docs/HANDOVER.md` | 13 箇所の stale 修正（ヘッダ / §5 図 + スタック文 / §9 ツリー 3 行 / §10 先端 + コミット一覧 / §13・§14 の v1d・v1e 依存記述 / §14 の V1 重複文） |
| 13 | `docs/planning/PHASE0_PLAN.md` | §10.2 図の Phase A を InnerTube → **watch 抽出 + decipherer** に修正（C4・§10.4 と整合） |
| 14 | `docs/planning/_TEMPLATE.md` | cod-web 残滓 4 箇소를 ytdl に更新（docs/arch 参照 / L1 voxel・fps 禁止行 / bun 4 検証行 / .archive/docs パス） |
| 15 | `docs/task-list.md` | V2・V3-b・V4 の状態を確定値に整合（完了 / 任意×2）+ リゾラ戦略行の「youtubei.js で自前実装」→ 実装方式確定版 |
| 16 | `README.md` / `docs/README.md` / `verification/README.md` | backend/gas 記述更新 / 索引に verification・.agent を追加 / 状態バナー追加 |
| 17 | `docs/research/README.md` / `SHIATUBE_DEEP_RESEARCH.md` | 「docs/arch/ へ反映」を「計画書（arch が存在する場合はそれ）へ反映」に更新 |
| 18 | `.archive/README.md` | **新規**（cod-web 由来アーカイブの利用規則を明文化） |

**変更しないもの**（規則にしたがう意図的保持）:
- `.agent/logs/` 過去ログ（cod-web 由来 44 件）= 追加のみ規則 + 別プロジェクトの事実記録（AGENTS.md §8.5）
- `.archive/cod-web-docs/` 本体 = 参照のみ・変更禁止
- `docs/research/VERIFICATION_P0.md` / `DOWNLOAD_MECHANISM_RESEARCH.md` = 証跡は書き換え対象外（7761203 で既に同期済み）
- `verification/Verification-Results.md` = ユーザー管理ファイル（v1f の JSON のまま）

## 3. 気づいたこと・知見 (Insights & Lessons Learned)

- **re-clone がターン途中で再び発生した**（本プロジェクト 6 回目）。作業中に HEAD が起点コミットに
  巻き返るが、ディスク上のファイルは残る。`reset --soft` + `add -A` + `diff --cached --stat` で
  「差分 = 自分の未コミット変更のみ」を確認すれば安全に再開できる（本日 2 回実施検証）。
- AGENTS.md / .agent/ が**前回の P00-A 再編成（2026-09-12）で ytdl 化が漏れていた**
  （cod-web の bun/Vite/Babylon 系がそのまま）。引き継ぎ時は必ず「現用規約が現在のプロジェクトを
  指しているか」を grep で確認する（`bun | vite | R3F | docs/arch` 等）。
- `edit_file` の fuzzy 匹配が 1 件失敗（同一文字種と見た目が近い漢字の混在が原因と推測）。
  漢字の新旧字形が混ざったファイルの編集は python の in-file 置換（assert 付き）の方が確実。
- HANDOVER §14 の引き継ぎプロンプトは**先端コミットの特定情報（SHA・内容）を含まない**表現に更新した
  （「2026-09-16 のドキュメント整理 commit 以降」という相対表現 = 将来のコミットで腐らない）。

## 4. 次にすべきこと (Next Actions)

- **ユーザーへの P00 GO 確認**（唯一のブロッカー）。GO 来たら P00-B → C → F → E → D の順。
- P00-B で `package.json` を定義したら `.agent/hooks/settings.json` の Stop フックと
  `verify-before-commit.md` のコマンドを実際の script 名に同期する。
- P1 計画書作成時に `docs/arch/` を新規作成 → その時点で各 docs の「arch = 未作成」注記を解消する。
