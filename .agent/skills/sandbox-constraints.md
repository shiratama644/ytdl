# Skill: Sandbox Constraints

> Sandbox の制約（ffmpeg-static / material-color-utilities / Node ESM）と迂回策。AGENT.md §6.2 の実態版。

## Node / ESM の制約

- プロジェクトは `"type": "module"`、Node `>= 24`、`packageManager: pnpm@12.3.4`。
- `@material/material-color-utilities@0.4.0` は**拡張子なし ESM import** を使うため、厳格な Node ESM 下で失敗する。
  - `lib/theme.ts` は当該ライブラリを**ブラウザ実行時のみの動的 import**（`await import(...)`）で読み込む。SSR（Node）では評価しない。
  - テストでは `generateDynamicTheme` を mock するか、純粋ヘルパー（`applyThemeTokens` / `DEFAULT_SEED`）のみをテストする。

## ffmpeg-static

- `ffmpeg-static@5.3.0` の postinstall はバイナリをネットワーク取得するため、Sandbox では TLS/ネットワーク起因で失敗することがある。
- 依存導入時は `pnpm install --ignore-scripts` を使う。`pnpm-workspace.yaml` の `onlyBuiltDependencies` でビルド許可用件を明示する。
- `node_modules/.pnpm/ffmpeg-static@...` を手動で削除すると壊れたシンボリックリンクが残るので、`rm -f node_modules/ffmpeg-static && pnpm install --force --ignore-scripts` で戻す。

## jsdom / Browser API

- `window.matchMedia` / `ResizeObserver` / `IntersectionObserver` / `EventSource` 等は jsdom に実装されていないものがある。`vitest.setup.ts` でスタブするか、テスト内で `vi.stubGlobal` or モックする。

## ビルド

- `next build` はローカルで完結する。外部 API（YouTube 等）へ到達できなくても exit 0 なら成功扱い。
- `scripts/executer.ts` は Termux / Proot-Distro を判定してバンドラを選択する。**Termux / Proot-Distro では Turbopack は使えない**（ネイティブ SWC/Turbopack バイナリが無く、WASM フォールバックも `turbo.createProject` 等が未実装）ため**常に webpack を強制**する（`--bundler=turbopack` 指定でも警告して webpack に落とす）。実行は `pnpm launch`、`--no-install --no-build --no-start` でステップをスキップできる（`pnpm launch -- --no-install ...` の `--` は executer が無視する）。
- **ビルドキャッシュ**: ビルド時に `.next/cache` を `<root>/.cache/next-build/next-cache` への symlink に差し替えて永続化する（`setupBuildCache`）。`YTDL_BUILD_CACHE_DIR` で永続先を変更可能。`.cache/` は gitignore 済み。失敗時は警告のみでビルドを継続する。
  - stable の Next.js 15.5.25 では `experimental.turbopackPersistentCaching` は canary 専用のため**使用しない**（設定するとビルドエラー）。Turbopack のキャッシュは `next build --turbopack` 自体が `.next/cache` に書く。
