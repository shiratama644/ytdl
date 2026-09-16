# Hook: Verify Before Commit（commit 直前検証）

> **トリガー**: 実装が終わり、Git Commit する直前。
> **目的**: コードの状態に応じた検証を必ず全 pass させてから commit する。途中の検証失敗で次へ進んではならない。

## A. コードが存在する場合（P00-B 以降: `package.json` あり）

`package.json` に**定義されたスクリプトのみ**使用（捏造禁止、AGENTS.md §3.1）。
P00-B で定義するスクリプト候補を基準とする（順に実行、1 つでも失敗したら原因特定→修正→再全検証）:

```bash
pnpm run typecheck          # tsc --noEmit（strict）
pnpm run lint               # biome
pnpm run test               # vitest run（※ watch モードではない）
pnpm run build              # next build（output:'export' → out/ 生成）
```

### 各コマンドの注意

- **typecheck**: strict 構成。配列アクセス・nullable に注意。
- **lint**: `0 error` まで。`biome-ignore` は対象コードの**直前の行**に置く。
- **test**: `vitest run`（watch **ではない**）。DOM 操作は jsdom。
- **build**: 成果物は `out/`。
  - **単一 HTML ビルド（P00-E 以降）**: 生成物が 1 ファイル（CDN 依存なし）であることを確認 + サイズを記録。
  - **GAS バックエンド（`backend/gas`）**: npm パッケージなしのプレーン JS。構文チェックは
    `.gs` を `/tmp/*.js` にコピーして `node --check`（`.gs` 直接は通らない）。
    `setMimeType` は **`ContentService.MimeType` 列挙型のみ**（O7）。

## B. コードが存在しない場合（docs 期・現時点の既定）

検証コマンドはスキップ可（AGENTS.md §3.1）。代わりに以下を実行:

```bash
# リンク切れ・死参照（docs/arch/ 等の現存しないパス）の検出
grep -rn "docs/arch/" docs/ verification/ README.md AGENTS.md .agent/ | grep -v "作成\|予定\|P1 以降\|arch(/)\|作成後"
# 旧表現の残存（検証済み設計に反する記述）
grep -rn "youtubei.js bundled\|InnerTube: WEB_EMBEDDED_PLAYER\|v1e = 実行待ち\|V1d の JSON" docs/ README.md
# ユーザーの結果ファイルに旧ラウンドの再追加がないか（1 ファイル = 最新の生結果のみ）
head -1 verification/Verification-Results.md
```

## 追加確認（全 commit 共通）

```bash
git status
git diff                       # 意図しないファイル/差分が無いか
```
- タスク範囲外のファイルが混ざっていないか確認。
- **`.archive/` に一切の変更がない**ことを確認（AGENTS.md §4.6、参照のみ・変更禁止）。
- **ユーザーが GitHub Web UI で直接コミットする想定** → 直前に `git fetch` し、
  ユーザーが変更・削除したファイルを worktree に同期してから commit（AGENTS.md §4.5）。

## 検証失敗時の原則（AGENTS.md §3.2）

- テストを通すためだけの**不正な修正厳禁**（テスト削除/skip・アサーション緩和・安易な `any`・Lint 無効化・エラー握り潰し）。
- 既存テストが落ちたら「テストが間違っている」と即断せず、**既存仕様を壊していないか**先に確認。

## E2E について

- ブラウザ実機（Chrome / iOS Safari）での確認は **Sandbox では実行不可**（Chromium install 不可、egress ブロック）。
- commit 前検証には**含めない**。「実環境検証待ち」として報告する（AGENTS.md §3.1）。

## 完了後

全検証 pass（または docs-only 時の整合性確認）→ commit（Conventional Commits、タスク ID をスコープに）
→ `git push origin <session-branch>`（AGENTS.md §4.3.1 で事前許可済み）→ `log-task.md`。
