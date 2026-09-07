# Skill: UI & Icons (Material Symbols)

> 共通 UI とアイコン描画の実装。アイコンは SVG ではなく **Material Symbols (Rounded)** フォントのリガチャで描画する。

## Icon コンポーネント `components/ui/icons.tsx`

- `IconName` 型（33 種）と `Icon({ name, size=24, className, fill })` コンポーネントを export。
- 実体は `<span className="material-symbols-rounded">リガチャ名</span>`。**SVG ではない**。
- アイコンは Material Symbols の「リガチャ」で描画（アイコン名をテキストで書くと対応グリフに置換される）。
- `fill` prop は `font-variation-settings: 'FILL' 1/0` で塗りつぶしに切替（既定は line アイコン相当）。
- `size` は `fontSize`、`className`（例 `text-on-surface-variant`）はそのまま `color` に効く。
- 呼び出し側は `Icon name="..." size={...} className="..." fill` のように従来どおり。**シグネチャは不変**。

## アイコン名 → リガチャの対応（`glyphs` レコード）

内部 `IconName` は独自名（例 `thumb-up`, `arrow-up`）を使い、これを Material Symbols のリガチャ名（`_` 区切り）へ写像する。主な対応:

| IconName | リガチャ | 備考 |
| --- | --- | --- |
| `play` / `play-arrow` / `shorts` | `play_arrow` | shorts は専用グリフが無く play_arrow で代用 |
| `live` | `sensors` | |
| `channel` | `account_circle` | |
| `more` | `more_horiz` | |
| `thumb-up` | `thumb_up` | |
| `remove` / `close` | `close` | 両方 close に集約 |
| `sun` / `moon` | `light_mode` / `dark_mode` | テーマ切替 |
| `settings` / `check` | `settings` / `check` | カラートーンシート / 選択状態（2026-09-08 追記） |
| `arrow-up` / `arrow-down` | `arrow_upward` / `arrow_downward` | |
| `back` / `forward` | `arrow_back` / `arrow_forward` | |
| `sparkle` | `auto_awesome` | |
| `queue` | `queue_music` | |
| `expand` | `expand` | fullscreen では `fullscreen` を使う |

## フォント読み込み（自己ホスト・CDN 不使用）

- `app/globals.css` から `@import 'material-symbols/rounded.css';` で読み込む（import は `@tailwind` の前に書く）。
- 依存は `pnpm add material-symbols --ignore-scripts` で追加（`node_modules/material-symbols` の `rounded.css` と `material-symbols-rounded.woff2` を利用）。
- `@import` は Next.js ビルド時に解決され、`.next/static/media/` へ woff2 がコピーされる（自己ホスト＝CDN 不要）。
- 追加のアイコンを使うときは `IconName` に候補を追加し、`glyphs` へリガチャを追記する。

## 注意

- `material-symbols` は**アイコンフォントのみ**。本文テキスト用フォントではない（`project-overview.md` の `--md-sys-font-*` は `Inter`/`Noto Sans JP` 指定だが、本体は未読み込みでシステムフォールバック）。
- Tailwind の `text-on-surface-variant` などは `color` に作用し、アイコンの塗り色にそのまま効く。
