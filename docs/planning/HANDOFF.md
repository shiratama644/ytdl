# 次セッションへの引き継ぎ（HANDOFF）

> 対象: 新しいセッションの AI Agent。
> 進捗の正本: [`docs/task-list.md`](../task-list.md)
> 作業規約: [`AGENTS.md`](../../AGENTS.md)
> 仕様正本: [`docs/arch/`](../arch/README.md)

## 0. 最初にやること（これ以外から始めない）

1. `git status` / `git branch --show-current` / `git log -5 --oneline`
2. ブランチ名は **毎回コマンドで確認**する。過去セッションのブランチ名を鵜呑みにしない（AGENTS.md §4.4）。
3. `git log` が起点 1 件だけ / status が大量削除+未追跡 / 依存関係なし → Sandbox 再構築。`.agent/hooks/sandbox-rebuild-recovery.md` に従い復旧する。
4. 未コミット変更を勝手に捨てない（再構築復旧の `reset --hard FETCH_HEAD` だけ例外）。
5. **進行中タスクは原則 1 件。** `docs/task-list.md` を確認して着手する。

## 1. プロジェクトの現状（事実）

- **パッケージマネージャ**: **bun**（`bun.lock`）
- **バックエンド**: Hono + `youtubei.js`（`server/index.ts`, `server/routes/*.ts`, 完全画像/サムネイルプロキシ）
- **フロントエンド**: Vite + React + TypeScript + Tailwind CSS + Dexie.js (IndexedDB)
- **起動スクリプト**: `scripts/execute.ts`（`bun run start` で色分けログ付き並列起動）
- **テスト・品質保証**: Biome + Vitest（11 tests passed, `bun run typecheck` 0 error, build 成功）

## 2. 起動コマンド

```bash
# 本番一括起動（install -> build -> server & client 並列色分け起動）
bun run start       # または bun scripts/execute.ts

# 開発時（ホットリロード）
bun run dev

# 個別起動
bun run dev:server  # API サーバー :3000
bun run dev:client  # Vite 開発サーバー :5173

# 検証コマンド
bun run typecheck
bunx biome check .
bun run test:unit
bun run build
```

## 3. 次のアクション

1. ユーザーからの追加要望や UI 調整。
2. プレイリスト再生やチャンネル詳細画面等のさらなる拡張。
