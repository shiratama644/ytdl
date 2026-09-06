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
- **バックエンド**: Hono + `youtubei.js`（`server/index.ts`, `server/routes/*.ts`）
- **フロントエンド**: Vite + React + TypeScript + Tailwind CSS（`src/`）
- **テスト・品質保証**: Biome + Vitest（`bun run test:unit`, `bunx biome check .`, `bun run typecheck`, `bun run build` 全 PASS）
- **Phase 1**: 実装・検証完了。ホーム/トレンド表示、検索、サジェスト、Range 対応ストリーミング再生、関連動画表示が動作可能。

## 2. 起動コマンド

```bash
# 開発時（サーバー + クライアント並列起動）
bun run dev

# サーバー単体起動
bun run dev:server    # または bun server/index.ts

# クライアント単体起動
bun run dev:client

# 検証
bun run typecheck
bunx biome check .
bun run test:unit
bun run build
```

## 3. 次のアクション

1. ユーザーからのフィードバック確認。
2. Phase 2 拡張機能（チャンネル表示、プレイリスト、コメント表示、ローカル保存など）の実装計画策定。
