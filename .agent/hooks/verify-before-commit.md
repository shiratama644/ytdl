# Hook: Verify Before Commit（commit 直前検証）

> **トリガー**: 実装が終わり、Git Commit する直前。
> **目的**: AGENT.md §3.1 の 4 検証を必ず全 pass させてから commit する。途中の検証失敗で次へ進んではならない。

## 4 検証（順に実行、1 つでも失敗したら原因特定→修正→再全検証）

```bash
pnpm typecheck                # tsc --noEmit (main + tsconfig.test.json 両方)
pnpm exec biome lint .        # Biome 直接呼出（pnpm lint より起動が速い）
pnpm test:unit                # vitest run （※ pnpm test は watch なので使わない）
pnpm build                    # Next.js production build
```

### 各コマンドの注意

- **typecheck**: `tsc --noEmit && tsc --noEmit -p tsconfig.test.json`。strict 有効なので non-null assertion / any に注意。
- **biome lint**: `0 error` まで。`biome-ignore` は対象コードの**直前の行**に置く（1 行以上離れると unused 判定で逆に警告になる, §6.4）。テストファイルと CSS のオーバーライドは `biome.json` に定義済。
- **test:unit**: `pnpm test`（watch）**ではない**。必ず `test:unit`（vitest run）。
- **build**: `next build` は内部で型チェックも行う。`ECONNRESET` 等の外部 API 到達エラーは **Sandbox 制約で無視**（§6.2）。**exit code 0 なら成功**。

## 追加確認（commit 前）

```bash
git status
git diff                       # 意図しないファイル/差分が無いか
```

## 検証失敗時の原則（§3.2）

- テストを通すためだけの**不正な修正厳禁**（テスト削除/skip・アサーション緩和・安易な `any`・Lint 無効化・エラー握り潰し）。
- 既存テストが落ちたら「テストが間違っている」と即断せず、**既存仕様を壊していないか**先に確認。

## 完了後

4 検証 all pass を確認 → commit（Conventional Commits 形式）→ `git push origin <セッション固定ブランチ>`。
