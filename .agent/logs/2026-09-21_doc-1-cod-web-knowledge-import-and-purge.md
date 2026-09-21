# DOC-1 — cod-web 期ログの知識 SKILL 化 + cod-web 残骸の削除

> Date: 2026-09-21(JST) / Commit: (このコミット) / Branch: arena/01a0c3bb-ytdl

## 1. 指示内容 (Task Summary)

ユーザー指示: 「cod-web時代のログから使えそうなもの(ytdlと全く関係ないものはインポートせず削除してください)をSKILL化してください。また、cod-web時代の残骸は削除してください。」

AGENTS.md §8.5（`.agent/logs/` を触る場合は必ず事前にユーザーへ確認）と §4.6（`.archive/` は参照のみ・変更禁止）の抵触を引用し、ask_user で 3 点確認した結果:
- `.agent/logs/` の cod-web 由来 45 件 = **すべて削除**（SKILL 化後。ytdl ログ 1 件は保持）
- `.archive/` = **全削除**（cod-web 文書 34 ファイル）
- SKILL 化構成 = 新規スキル 1 件 + 既存スキル小幅更新（構成案のまま）

## 2. 実行内容 (Executed Actions)

| # | 対象 | 内容 |
|---|---|---|
| 1 | **新規** `.agent/skills/quality-toolchain/SKILL.md` | cod-web 期ログ 7 件から ytdl 適用可能な知識をインポート: TS7 の `baseUrl` 廃止(p0-d-to-h) / Biome 2.x 設定ハマり(p0-b-c) / Biome import 境界強制の `**` と `noRestrictedGlobals`(ph1-b) / Vitest+jest-dom 型の解決(p0-b-c) / coverage-v8 の baseline→meaningful→ratchet ワークフローと gotchas(ph1-5-a/b) / Playwright の Sandbox 非実行運用と config 構成(ph1-5-c)。ytdl 向けに pnpm 系へ適訳 |
| 2 | `.agent/skills/sandbox-constraints/SKILL.md` | 「Git 運用の知見」セクションを追加: `git revert -m 1` = 第 1 親の状態へ戻る（= そのブランチ分だけ消すではない）/ 索引に載らないドキュメント = 混入を疑う / リモート先端は `git ls-remote` で確認（revert-pr1 由来） |
| 3 | `.agent/skills/index.md` | quality-toolchain を「読み方ガイド」「一覧」両方に追記。sandbox-constraints / tech-stack / project-overview の最終更新を 2026-09-21 に。末尾の cod-web・.archive 段落を削除 |
| 4 | `.agent/skills/tech-stack/SKILL.md` | 冒頭の「cod-web(…)は使わない（`.archive/cod-web-docs/` 参照のみ）」を .archive 参照なしの表現に |
| 5 | `.agent/skills/project-overview/SKILL.md` | リポジトリ構成ツリーから `.archive/cod-web-docs/` 行を削除、.agent 行の cod-web 注記を除去 |
| 6 | **削除** `.agent/logs/` 45 件 | 2026-09-03〜09 の cod-web 由来ログ全件（`git rm`）。ytdl 由来 `2026-09-16_docs-cleanup-for-session-handoff.md` のみ残存 |
| 7 | **削除** `.archive/` 全体 | `.archive/README.md` + `.archive/cod-web-docs/`（33 ファイル）計 34 ファイル（`git rm -r`） |
| 8 | `AGENTS.md` | §4.2 / §4.6（見出し + .archive バレット）/ §5 / §6.1（bun 注記）/ §6.6（cod-web 文書行）/ §8.1（logs 行）/ §8.5（cod-web 文脈の例文）の 7 箇所を更新 |
| 9 | `docs/HANDOVER.md` | §9 ツリーから `.archive/` 行を削除、.agent 行の cod-web 注記を除去 |
| 10 | `docs/README.md` / `docs/planning/README.md` / `docs/planning/_TEMPLATE.md` / `docs/planning/PHASE0_PLAN.md` | .archive / cod-web の死参照 10 箇所を更新（PHASE0_PLAN は §3×2 / §5 DoD / §9 P00-A 行 / §10.4 理由欄 / §10.5 ツリー） |
| 11 | `.agent/hooks/index.md` / `restore-sandbox-env.sh` / `sandbox-rebuild-recovery.md` / `verify-before-commit.md` | .archive / cod-web 参照 6 箇所を更新。verify-before-commit の docs 期 grep チェックに `cod-web\|\.archive` 残存チェックを追加 |
| 12 | `docs/task-list.md` | 「docs/.agent 運用 (DOC-*)」セクションを追加し DOC-1 完了行を登録 |

インポートせず削除したログ（38 件）= FPS 固有: ネットワークプロトコル系 6（authoritative-server / network-protocol / bvh-kinematic / ph0-a/b/c / ph1-c / ph1-e / phase1-decision 等）/ 3D・レンダラー系 3（p0-d-to-h は TS7 の知見のみ採用）/ Krunker・bloxd 競合調査 5（dr-1〜5）/ 設計・ドキュメント運用系 9（governance / correct-skills / separate-specs / doc2-doc3 / doc-4〜6 / docs-organization 系 / phase01-handoff / plat-1r 等）/ 完了報告系 4（phase0-complete / docs-final-check×2 / phase-1-5-quality-gate-plan / ph1-f 等）。preview ホスト許可（p0-a）や egress ブロック（adopt-bun）の知見は `sandbox-constraints` に既に登録済みのため重複インポートなし。

## 3. 気づいたこと・知見 (Insights & Lessons Learned)

- **見えない文字の混入に要注意**: `PHASE0_PLAN.md` の「`.archive/` 内容に一切変更なし」行に U+7684「的」が混在しており、`edit_file` の fuzzy 匹配も python 置換も（見た目の文字列では）失敗した。read の表示からは判別できないため、**置換が 2 度以上失敗したら `python3` で `repr()` / `ord()` 出力して実際の code point を確認する**のが確実（既存スキル「edit_file はバックスラッシュで失敗しやすい」に同種パターンとして加えられる）。
- cod-web 期ログに「ytdl でそのまま使える知識」と「文脈ごと FPS 固有の知識」が混在していた。スキル化の判断軸 = 「ytdl のスタック（pnpm/Next/biome/vitest/Playwright/GAS）で発火するか」。発火する知見は全て元ログの事実（実測値・例外メッセージ）をそのまま保持した。
- 削除前の参照調査（grep 全件一覧）を 1 回にまとめておくと、更新漏れのない死参照ゼロ達成と commit 直前の grep 検証が容易になる。

## 4. 次にすべきこと (Next Actions)

- 削除は git 履歴にのみ残存（`origin/arena/01a0c3bb-ytdl` のこのコミットまで遡れば全件復旧可能）。
- P00-B 着手時: `quality-toolchain/SKILL.md` の biome/vitest セットアップ知見を `package.json` のスクリプト定義に反映（§3.1 の候補: typecheck / lint / test / build）。
- P00-C（packages/shared）導入時: biome の import 境界（noRestrictedImports）を workspace 依存方向に設定。
- E2E 層導入時: Playwright セクションの `PLAYWRIGHT_BASE_URL` 併用構成で config を作成。Sandbox では `--list` discovery のみで「実行済み」と主張しない。
