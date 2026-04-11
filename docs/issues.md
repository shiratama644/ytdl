# 現在の問題一覧（調査日時: 2026-04-11）

このドキュメントは、リポジトリ内の現状を確認して「現在ある問題」を整理したものです。

## 1. GitHub Issue

- `shiratama644/ytdl` の **Open Issue は 0 件**（確認時点）。

## 2. 既知の制約（README記載）

`/home/runner/work/ytdl/ytdl/README.md` の「注意」に、以下の既知制約が明記されています。

- YouTube 側仕様変更や動画の権利設定により、再生 URL が取得できない場合がある
- ライブコメントは取得タイミングにより空になる場合がある

## 3. 品質管理面の課題

- `package.json` にテストスクリプト（`test`）が定義されていないため、自動テストが未整備。
- `.github/workflows` が存在せず、CI ワークフローが未構成。

## 4. セキュリティアラート確認状況

- Code Scanning / Secret Scanning は、連携権限不足（403）で確認不可。
- そのため、GitHub セキュリティアラート起点の問題は、この調査では判定不能。

## 5. 追加調査メモ

- リポジトリ全体を `TODO / FIXME / BUG / HACK / XXX` で検索し、実装内に明示的な未対応メモは確認されませんでした（lockfile内の一致は除外）。
- ローカル実行では `pnpm lint` と `pnpm build` は成功。
