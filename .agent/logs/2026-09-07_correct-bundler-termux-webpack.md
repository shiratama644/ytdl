# Termux / Proot-Distro のバンドラを webpack に是正（Turbopack は使用不可）

> Date: 2026-09-07(JST) / Branch: `arena/01a0778c-ytdl`

## 1. 指示内容 (Task Summary)

- Termux / Proot-Distro の場合は **WebPack**。TurboPack は使えない。
- 今後は Web 検索ツールを積極的に使い、推測ではなく事実に基づいてコードを書く／質問する。

## 2. 実行内容 (Executed Actions)

| # | 内容 | 結果 |
|---|---|---|
| 1 | 現状確認: `scripts/executer.ts` の `resolveBundler` は `auto` で「Termux/Proot → turbopack、通常OS → webpack」 | 誤りを確認 |
| 2 | Web 検索で事実確認: Termux ではネイティブ SWC/Turbopack バインディングが無く WASM フォールバックも未実装 → webpack が実用的な回避策。`serverExternalPackages` は webpack 依存 | 指摘が事実と判明 |
| 3 | `scripts/executer.ts` の `resolveBundler` を **export** し、Termux / Proot-Distro では常に webpack を強制（`--bundler=turbopack` 指定でも警告して webpack に落とす）に修正 | 完了 |
| 4 | ヘッダーコメント・usage の「なぜビルダーを出し分けるのか」を実態に合わせて書き換え | 完了 |
| 5 | 回帰テスト追加: `resolveBundler` の 5 ケース（通常OS auto→webpack / Termux auto→webpack / Termux turbopack→webpack 強制 / 通常OS turbopack 尊重 / webpack は両者とも webpack） | 完了 |
| 6 | スキル更新: `sandbox-constraints.md`・`project-overview.md` の記述を是正 | 完了 |
| 7 | 4 検証 (typecheck / biome lint / test:unit / build) を実行 | 全て PASS（test:unit は 101 passed） |

## 3. 気づいたこと・知見 (Insights & Lessons Learned)

- **Termux / Proot-Distro では Turbopack は使えない**。Next.js はネイティブ SWC/Turbopack バイナリが無いと WASM フォールバックへ落ちるが、`turbo.createProject` 等の API が未実装で dev / build が失敗する。実用的な回避策は webpack を明示使用すること。
  - 出典: Vercel Community (WASM fallback の制限) / next.js discussions (Termux で `--turbopack` を外すと解決)。
- **本リポジトリは `serverExternalPackages`（youtubei.js / ffmpeg-static / fluent-ffmpeg）の外部解決を webpack に依存**しており、Turbopack はこれを完全サポートしない。webpack 既定が安全。
- 当初のコメント「Turbopack は軽量・高速で制約のあるモバイル環境に適している」は**事実誤認**だった（逆）。推測で書かれたコードは Web 検索で事実確認して是正する。
- `resolveBundler` を export して回帰テスト可能にした。ビルドキャッシュ（`.next/cache` → `.cache/next-build/next-cache` の symlink）は webpack でも機能するため変更不要。

## 4. 次にすべきこと (Next Actions)

- なし（本タスクは完了）。今後は Web 検索で事実確認してからコードを書く／質問する運用を継続する。
