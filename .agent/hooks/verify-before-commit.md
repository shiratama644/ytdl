# Hook: Verify Before Commit（commit 直前検証）

> **トリガー**: 実装が終わり、Git Commit する直前。
> **目的**: AGENTS.md §3.1 のプロジェクト検証を必ず全 pass させてから commit する。途中の検証失敗で次へ進んではならない。

## 検証フロー

プロジェクトで定義された検証コマンドを順に実行する（プロジェクト構成に応じて設定）。

```bash
# 例: プロジェクトに定義されている場合
# bun run typecheck / npm run typecheck
# bun run lint / npm run lint
# bun run test / npm run test
# bun run build / npm run build
```

### 各検証の注意

- **型チェック**: strict 構成。配列アクセス・nullable に注意。
- **Lint**: `0 error / 0 warning` まで。安易な ignore コメントでエラーを握りつぶさない。
- **テスト**: ワンショット実行モード（CI モード）で実行。watch モードで起動しない。
- **ビルド**: 本番ビルド成果物が正しく生成されるか確認。
- **ドキュメントのみ変更時**: コードの検証コマンドはスキップ可（AGENTS.md §3.1）。代わりに「リンク切れ・他ファイルとの参照整合・旧名称の残存がないこと」を grep 等で確認する。

## 追加確認（commit 前）

```bash
git status
git diff                       # 意図しないファイル/差分が無いか
```
- タスク範囲外のファイルが混ざっていないか確認する。
- `.archive/` 等のアーカイブを置いている場合は、それがビルド/lint/テストの対象外であることを確認（AGENTS.md §4.5）。

## 検証失敗時の原則（AGENTS.md §3.2）

- テストを通すためだけの**不正な修正厳禁**（テスト削除/skip・アサーション緩和・安易な `any`・Lint 無効化・エラー握り潰し）。
- 既存テストが落ちたら「テストが間違っている」と即断せず、**既存仕様を壊していないか**先に確認。

## E2E について

- Sandbox 上でブラウザバイナリが実行できない環境の場合、E2E（Playwright 等）は CI 上で実行する（AGENTS.md §6.2）。
- ローカル検証に含められない場合はその旨を明記する。

## 完了後

全検証 pass（または docs-only 時の整合性確認）を確認 → commit（Conventional Commits、タスク ID をスコープに）→ `git push origin <session-branch>`（AGENTS.md §4.3.1 で事前許可済み）。
