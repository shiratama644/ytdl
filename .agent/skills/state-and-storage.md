# Skill: State & Storage

> Zustand store（theme / player / download）と continuation-cache の設計・用途。

## Zustand stores（`lib/stores/`）

Context API は使わず、すべて Zustand で管理する。

### `theme.ts` (`useThemeStore`)
- state: `preference`（`'system' | 'light' | 'dark'`）、`mode`、`dynamic`（`'off' | 'seed' | 'thumbnail'`）、`seed`。
- actions: `setPreference` / `setDynamic` / `setSeed` / `toggleMode` / `apply`。
- `apply()` は `document.documentElement` に `data-theme` を設定し、ブラウザでのみ動的トークン計算（`generateDynamicTheme`）を実行。
- `persist` middleware で `ytdl-theme` キーに保存（`partialize` で一部のみ永続化）。
- `initTheme()` はクライアントのみで `apply()` + `matchMedia` 変更リスナーを登録。
- **注意**: `lib/theme.ts` は `@material/material-color-utilities` を**動的 import** する。テストでは `generateDynamicTheme` を mock するか、純粋ヘルパー（`applyThemeTokens` / `DEFAULT_SEED`）のみをテストする。

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
