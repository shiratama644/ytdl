# ytdl — YouTube 代替視聴・ダウンロードサイト

YouTube の動画・ショート・ライブ配信・チャンネル・コメントを **プロキシ経由** で視聴し、
**画質・音質指定のダウンロード**（並列キュー管理）までできる非公式の代替フロントエンドです。

UI は **Material 3 Expressive** に準拠し、本家 YouTube よりも操作性・情報密度・パーソナライズ性に
優れることを目指しています。

> ⚠️ **免責事項（重要）**  
> 本プロジェクトは YouTube の**非公式内部 API（InnerTube）** を利用するものです。YouTube の
> 利用規約と抵触し得るため、**個人利用・学習目的の範囲** にとどめてください。
> 著作権を侵害する形での再配布・商用利用は行わないでください。ストリームの取得可否・
> 動画の保護状況は YouTube 側の事情により今後も変わります。

---

## 主な特徴

- ホーム／検索／動画視聴／ショート／ライブ／チャンネル／コメント／概要欄
- `video.js` + `videojs-contrib-dash`（DASH）／内蔵 VHS（HLS・ライブ）による再生
- 144p〜最高画質まで対応（高画質は映像・音声の DASH 合成再生）
- 画質・音質・出力コンテナ（mp4/webm/mkv/mp3/m4a/ogg）を指定したダウンロード
- `p-queue` による並列ダウンロードキュー（同時実行数 1〜6 を設定可能、既定 3）
- サーバーサイド `ffmpeg` による無劣化多重化（コンテナ非互換時は部分再エンコード）
- Material 3 Expressive トークン（色・シェイプ・タイポ・モーション）
- `@material/material-color-utilities` による HCT 動的カラー（シード／サムネイル連動）
- 進捗 SSE / ダウンロードトレイ（常駐FAB・ボトムシート）

## アーキテクチャ

```
ブラウザ (video.js / dash.js / VHS)
   │  /api/dash/[videoId]  (DASHマニフェスト、セグメントURLをプロキシ化)
   │  /api/live/[videoId]  (HLSマニフェスト、セグメントURLをプロキシ化)
   ▼
Next.js Route Handlers (プロキシ層)
   │  youtubei.js (InnerTube)  … メタデータ・ストリームURL解決
   ▼
googlevideo.com （実ストリーム）
```

- 実ストリーム URL は発行元 IP に紐づきブラウザから直接取得できないため、
  **すべて**の映像・音声・マニフェストを `/api/proxy`（Range 対応）経由で配信します。
- `/api/proxy` は **SSRF 対策として許可ドメインを制限** しています（`*.googlevideo.com` ほか）。

## クイックスタート

```bash
# 依存関係のインストール（pnpm を使用）
pnpm install

# 開発サーバー起動
pnpm dev        # http://localhost:3000

# 本番ビルド
pnpm build
pnpm start

# 型チェック
pnpm typecheck

# Lint（Biome）
pnpm lint

# 単体テスト（Vitest）
pnpm test:unit

# カバレッジ（per-file threshold は未設定、全体のみ）
pnpm test:coverage
```

> `pnpm test` は watch モードです。commit 前の 1 回実行には `pnpm test:unit`（=`vitest run`）を使ってください。

> `ffmpeg-static` はインストール時にバイナリを取得します。取得できない環境では
> `FFMPEG_BIN` 環境変数でバイナリパスを指定するか、システムの `ffmpeg` を PATH に
> 通してください。バイナリがない場合、ダウンロード（多重化）ジョブのみエラーになります。

## 環境変数

`.env.example` を参照してください。

| 変数 | 説明 | 既定 |
|---|---|---|
| `FFMPEG_BIN` | ffmpeg バイナリの絶対パス | (自動解決) |
| `YTDL_LANG` | Innertube の言語 | `ja` |
| `YTDL_LOCATION` | Innertube の地域 | `JP` |

## ディレクトリ構成（要点）

```
app/
  (main) page / watch / shorts / live / channel / search / downloads
  api/  watch • dash • proxy • live(+chat) • comments • channel • search • home • download
components/
  player/ video.js ラッパー
  comments/ コメント（無限スクロール）
  channel|ui/ M3プリミティブ
  download-queue/ 常駐トレイ・ダイアログ
lib/
  innertube.ts  Innertube クライアント（シングルトン）
  serialize.ts  youtubei.js → Wire 型のシリアライズ
  dash/ffmpeg/download-queue など
  theme.ts / stores/*  HCT 動的カラー・Zustand
styles/
  m3-tokens.css  M3トークン（CSSカスタムプロパティ）
types/
  videojs-contrib-dash.d.ts
```

## 開発規約・ドキュメント

- [`AGENTS.md`](./AGENTS.md) — AI Agent 向けの開発規約（コミット手順・検証・Git 運用・コミュニケーション）。外部リポジトリ `github.com/shiratama644/dropmod` の規約を ytdl の技術スタックに合わせて翻案したものです。
- [`docs/README.md`](./docs/README.md) — ドキュメント索引（計画書 / 運用 / 監査）。
- [`.agent/`](./.agent/) — Agent の記憶システム（`skills/` コードベース知識・`hooks/` 定型ワークフロー・`logs/` 実行記録）。構造・規約は dropmod から導入し、コンテンツは ytdl 向けに書き直しています。

## テスト

- **配置**: ソースと**同じ階層構造**で `__tests__/` に配置します（例: `lib/serialize.ts` → `__tests__/lib/serialize.test.ts`）。
- **ランナー**: Vitest 5 + jsdom 30 + @testing-library/react 16 + @testing-library/jest-dom 7 + fake-indexeddb。
- **設定**: `vitest.config.ts` / `vitest.setup.ts` / `tsconfig.test.json`。
- 詳細は [`.agent/skills/testing.md`](./.agent/skills/testing.md) を参照してください。

## ボット対策に関する注記

YouTube は PoToken 等の要求を継続的に変更するため、動作しなくなった場合は
`youtubei.js` のリポジトリ（Issue / README）を確認し、

- `UniversalCache` による `visitor_data` の永続化（本実装はキャッシュ済み）
- セッションの定期再生成（`lib/innertube.ts` の `SESSION_TTL_MS`）
- `Innertube.create` の再実行（`resetInnertube`）

などを適宜調整してください。

## ライセンス

MIT License（[LICENSE](./LICENSE)）。ただし前述のとおり、利用は個人・学習目的に限ります。
