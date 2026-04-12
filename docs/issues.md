# 現在の問題一覧（調査日時: 2026-04-11）

このドキュメントは、リポジトリ内の現状を確認して「現在ある問題」を整理したものです。

## 1. GitHub Issue

- `shiratama644/ytdl` の **Open Issue は 0 件**（確認時点）。

## 2. 既知の制約（README記載）

`/home/runner/work/ytdl/ytdl/README.md` の「注意」に、以下の既知制約が明記されています。

- YouTube 側仕様変更や動画の権利設定により、再生 URL が取得できない場合がある
- ライブコメントは取得タイミングにより空になる場合がある

## 3. 品質管理面の課題

- ✅ `package.json` に `test` スクリプト（`pnpm lint && pnpm build`）を追加済み。
- ✅ `lint/build/test` を一括実行する汎用 CI（`.github/workflows/ci.yml`）を追加済み。

## 4. セキュリティアラート確認状況

- Code Scanning / Secret Scanning は、連携権限不足（403）で確認不可。
- そのため、GitHub セキュリティアラート起点の問題は、この調査では判定不能。

## 5. CodeQL 解析状況（本タスクで追加確認）

- `parallel_validation` における CodeQL Security Scan は、`actions` / `javascript` ともに `Analysis failed` が継続（再実行でも改善せず）。
- 改善策として `.github/workflows/codeql.yml` を追加済み（PRマージ後にGitHub Actions側で実行確認が必要）。

## 6. 再帰検索で追加確認した問題点

- `pnpm audit --audit-level=moderate` は npm registry 側の `400 Bad Request` 応答により実行不能（脆弱性スキャン結果を取得できない）。

## 7. 追加調査メモ

- リポジトリ全体を `TODO / FIXME / BUG / HACK / XXX` で検索し、実装内に明示的な未対応メモは確認されませんでした（lockfile内の一致は除外）。
- ローカル実行では `pnpm lint` と `pnpm build` は成功。
