# Skill: State & Storage

> Zustand store（theme / player / download）と continuation-cache / IndexedDB（Dexie）の設計・用途。

## Zustand stores（`lib/stores/`）

Context API は使わず、すべて Zustand で管理する。

### `theme.ts` (`useThemeStore`)
- state: `preference`（`'system' | 'light' | 'dark'`）、`mode`、`dynamic`（`'off' | 'seed' | 'thumbnail'`）、`seed`、**`tone`（2026-09-08 追加）**。
- actions: `setPreference` / `setDynamic` / `setSeed` / **`setTone`** / `toggleMode` / `apply`。
- `apply()` は `document.documentElement` に `data-theme` を設定し、ブラウザでのみ動的トークン計算（`generateDynamicTheme`）を実行。
- **カラートーン共存ロジック**: `dynamic === 'off'` のときは `toneTokens(tone, mode)`（プリセット）を適用し、`dynamic !== 'off'` のときは従来どおり `generateDynamicTheme(seed, mode)`。既定 tone = `obsidian-frost`。
- `persist` middleware で `ytdl-theme` キーに保存（`partialize` で一部のみ永続化。`tone` を含む）。
- `initTheme()` はクライアントのみで `apply()` + `matchMedia` 変更リスナーを登録。
- **注意**: `lib/theme.ts` は `@material/material-color-utilities` を**動的 import** する。テストでは `generateDynamicTheme` を mock するか、純粋ヘルパー（`applyThemeTokens` / `DEFAULT_SEED` / `toneTokens`）のみをテストする。

### 検索履歴（`lib/search-history.ts` / Dexie、2026-09-08 追加）
- IndexedDB（Dexie）で検索履歴を保存。DB `ytdl-search-history`、テーブル `searchHistory: '++id, query, visitedAt'`。
- `addSearchHistory(query)` は同一クエリを `visitedAt` 更新で重複判定し、**上限 10 件**超は古い順に削除。`recentSearchHistory()` で新しい順に取得。`clearSearchHistory()` で全消去。
- **ブラウザ専用**（NavBar のみから import。Route Handler では触れない）。
- テスト用フック: `__setSearchHistoryDbForTest(db)` / `__resetSearchHistoryDbForTest()`（fake-indexeddb で注入）。
- 詳細は [`testing.md`](./testing.md) / [`sandbox-constraints.md`](./sandbox-constraints.md)。

### `player.ts` (`usePlayerStore`)
- プレイヤー設定（音量 / 再生速度 / 自動再生等）の保持。VideoPlayer が利用。

### `download.ts` (`useDownloadStore`)
- ダウンロードジョブの一覧と同時実行数。`addJob` / `updateJob` / `removeJob` / `setConcurrency`。
- サーバーの `/api/download` ポーリング結果を反映する。

## continuation-cache（`lib/continuation-cache.ts`）

- 無限スクロール（ホーム / 検索 / コメント / チャンネル）の継続トークンを管理するサーバー側キャッシュ。
- `continuationCache.create(obj)` でトークン発行、`continuationCache.get<T>(token)` で元オブジェクト取得。
- キャッシュは TTL と最大エントリ数で管理（`defaultTtlMs`）。
- 使いどころ: `has_continuation` / `hasContinuation` が真のとき、次ページ用にトークンを生成・付与する。

## 注意点

- `ContinuationCache` クラスはエクスポートされていない（`continuationCache` インスタンスのみ）。`defaultTtlMs` を直接テストできないため、インスタンスの公開メソッドを経由する。
- `persist` を使った Zustand store のテストでは初期状態をリセットするか、リセット用の `setState` を利用する。
