# AGENT.md

本ドキュメントは、AI Agent が本プロジェクト（`ytdl`）の開発・変更を行う際に**必ず遵守すべき開発規約**です。
最優先事項は **「速く大量に作ること」ではなく「常に復旧可能で、壊れた状態を長時間維持しないこと」** です。

> 本規約は `github.com/shiratama644/dropmod` の `AGENTS.md` を基に、ytdl の技術スタック・ディレクトリ構成・
> 検証コマンドに合わせて翻案したものです。汎用性のある作業規約（コミット手順・検証・Git 運用・コミュニケーション）を
> そのまま活かし、プロジェクト固有の詳細（§6）を ytdl の実態に合わせています。dropmod 固有の記述
> （Modrinth / Playwright / `.archive/vite/` / FontAwesome subset / `src/` 構成 等）は削除または ytdl へ置換しています。

---

## 1. 基本方針 & 作業単位

### 1.1 基本原則
- **小さく実装 → 検証 → 修正 → Git Commit → 次の機能** のサイクルを徹底する。
- 一度に大量の機能を実装して最後にまとめてデバッグする方式は禁止。
- 「ついでに改善できそう」という理由でスコープを広げない（未指定の機能追加・設計変更・大規模リファクタリングの禁止）。

### 1.2 作業単位の粒度
1タスクは**「1つの意味のある論理的単位」**で区切る。

| 区分 | 例 |
| :--- | :--- |
| **良い例（適切な粒度）** | 検索ページの実装 / コメント一覧の実装 / ダウンロードキューの実装 / 動画プレイヤーの実装 |
| **悪い例（細かすぎる）** | ボタン1個追加ごとにコミット / CSS margin変更ごとにテスト |
| **悪い例（大きすぎる）** | UI + API + ダウンロード + キャッシュ を1タスクで一括実装 |

※フレームワーク移行やDB変更などの大規模変更は、「設計 → 基盤 → 機能A（検証・commit） → 機能B（検証・commit）」と段階的に分割すること。

---

## 2. 開発ワークフロー

各タスクは必ず以下の順序で進め、途中の検証が失敗した状態で次へ進んではならない。

```text
1. 仕様・既存コード確認 (git status / package.json / 関連ファイル)
   ↓
2. 実装方針決定
   ↓
3. 実装 (最小限の差分)
   ↓
4. プロジェクト検証 (Lint / Typecheck / Test / Build)
   ↓ 失敗時は原因特定して修正し、再度全検証
5. 差分確認 (git diff で意図しない変更がないか確認)
   ↓
6. Git Commit (Conventional Commits形式)
   ↓
7. タスク完了・停止 (勝手に次のタスクを開始しない)
```

---

## 3. テスト・品質保証ルール

### 3.1 検証コマンドの実行
- `package.json` に定義されたスクリプトのみを使用する（存在しないコマンドを捏造・実行しない）。
- 原則として commit 前に以下 4 種を全て pass させる：
  ```bash
  pnpm typecheck                # tsc --noEmit を main + tsconfig.test.json 両方
  pnpm exec biome lint .        # Biome 直接呼び出し (pnpm lint より起動が速い)
  pnpm test:unit                # vitest run (テストは __tests__/)
  pnpm build                    # Next.js production build
  ```
- **`pnpm test` は watch モード**なので commit 前検証には使わない。必ず `pnpm test:unit`（vitest run）を使う。
- `pnpm build`（`next build`）は内部で型チェックも行う。exit code 0 なら成功扱いで問題ない。
- テストはソースと同じ階層構造の `__tests__/` に配置する（§3.4）。

### 3.2 エラー対応と品質維持
- エラー発生時はエラーメッセージやスタックトレースから根本原因を特定し、最小限の範囲で修正する。
- **テストを通すためだけの不正な修正は厳禁**：
  - テストの削除・スキップ・アサーションの緩和
  - 型エラーを回避するための安易な `any` 使用
  - Lintルールの勝手な無効化・エラーの握りつぶし
- **既存仕様の尊重**：既存テストが落ちた場合、「テストが間違っている」と即断せず、既存仕様を壊していないか確認する。

### 3.3 既存バグの扱い
- **今回のタスクを妨げるバグ**：必要最小限の修正を行う。
- **無関係な既存バグ**：勝手に修正せず、ユーザーに報告する。
- バグ修正時は、可能であれば再発防止の回帰テスト（Regression Test）を追加する。

### 3.4 テスト配置規約
- テストは **`__tests__/`** 配下に、**ソースと同じ階層構造**で配置する。
  - `lib/serialize.ts` → `__tests__/lib/serialize.test.ts`
  - `lib/stores/theme.ts` → `__tests__/lib/stores/theme.test.ts`
  - `components/ui/Button.tsx` → `__tests__/components/ui/Button.test.tsx`
  - `scripts/executer.ts` → `__tests__/scripts/executer.test.ts`
- `tsconfig.json` はテストを build から除外し、`tsconfig.test.json` がテスト（`__tests__/`・`vitest.setup.ts`・`vitest.config.ts`）を typecheck する。
- `vitest.config.ts` の `include` は `__tests__/**/*.test.{ts,tsx}`。

---

## 4. Git運用 & 環境復旧ルール

Gitは単なる履歴管理ではなく、**「実行環境消失・セッション切断時の復元チェックポイント」**として扱う。

### 4.1 作業開始時の現状把握
作業開始時は必ず以下を実行し、ブランチ・未コミット変更・直近ログを確認する。
```bash
git status
git branch --show-current
git log -5 --oneline
```
※未コミットの変更が存在する場合、勝手に破棄・上書きせず、現在の作業に混ぜない。

#### 4.1.1 サンドボックス再構築時の復旧手順
Arena のサンドボックスは再構築されることがあり、その場合ワークツリーには「起点コミットのファイル」＋「push 済みコミットで追加されたファイルの未追跡バージョン」が混在した状態で立ち上がる（`git status` が「大量の削除 + 大量の未追跡」を示す）。この時点でファイルは破損していないので、以下の手順で確実に復旧すること。

```bash
# 1. リモートの最新を fetch（ブランチ名は `git branch --show-current` で確認した現在値を使う）
git fetch origin <セッション固定ブランチ>

# 2. FETCH_HEAD にワークツリーごとリセット（この場合の --hard は例外的に必要）
git reset --hard FETCH_HEAD

# 3. corepack + pnpm install で依存を再構築
corepack enable pnpm >/dev/null 2>&1
pnpm install --frozen-lockfile
```

- `git reset --hard FETCH_HEAD` は §4.3 の厳禁ルールの例外で、**サンドボックス再構築後の初回のみ**許可される。
- 復旧後は必ず `git log --oneline -5` と `pnpm test:unit` で健全性を確認してから作業を再開する。

### 4.2 コミットルール
- **タイミング**: 検証（Lint/Type/Test/Build）がすべてPASSした状態でのみコミットする。
- **事前チェック**: `git status` および `git diff` を確認し、意図しないファイルが含まれていないことを確認する。
- **重要な変更前のチェックポイント**: 大規模リファクタリング、スキーマ変更、依存関係更新の前には、作業前の正常状態を一度コミット（checkpoint）しておく。
- **コミットメッセージ**: Conventional Commits 形式に従う。
  - `feat:`, `fix:`, `refactor:`, `perf:`, `test:`, `docs:`, `chore:`, `build:`, `ci:`

### 4.3 厳禁なGit操作（明示的な指示がない限り実行禁止）
以下の破壊的・履歴改変コマンドは**絶対に実行してはならない**。
- `git reset --hard` / `git clean -fd`（未コミット作業の消失リスク）
  - ただし §4.1.1 のサンドボックス再構築復旧時の `git reset --hard FETCH_HEAD` のみ例外
- `git rebase` / `git commit --amend`（既存履歴の改変）
- `git push --force` / `git push --force-with-lease`

#### 4.3.1 通常の `git push` は**事前許可済み**

- **push のたびにユーザー確認を取らないこと。** §3.1 の 4 検証がすべて PASS し、意図しない差分なしを確認できたら、その場で `git push origin <セッション固定ブランチ>` を実行する。
- **理由**: Sandbox は予告なく再構築され、**ローカルコミットのみだと作業が破棄される**。早急な復旧のため、成果物は常に origin へ上げておく。
- push 先は**セッション固定ブランチのみ**（§4.4）。`main` 等への直接 push、他ブランチへの push、force push は引き続き禁止。
- PR の作成も許可済み（`gh pr create`）。作成後は URL を報告する。

### 4.4 ブランチ運用（セッション固有ルール）
- **作業ブランチはセッション固定**。Arena はこのブランチ名でセッションを追跡しており、他ブランチに push した作業は**セッションと紐付かず失われる**。
  - ブランチ名は**セッションごとに変わる**ため、本ドキュメントの記載値を鵜呑みにせず**必ず `git branch --show-current` で確認**すること。
  - 過去セッションのブランチ名は本ドキュメントに残さない。必要な情報は「毎回 `git branch --show-current` で確認する」という手順だけで十分。
- ユーザーから「別ブランチを使ってほしい」と依頼された場合も、セッション固定ブランチから離れる前に固定ブランチ名を説明し、そのまま作業を続ける。
- feature branch は切らない。セッション固定ブランチへ直接 commit + push し、`gh pr create` で `main` 向け PR を作成する。マージ判断はユーザー側に委ねる。
- push は `git push origin <セッション固定ブランチ>` の明示指定で行う。default remote/branch 依存の `git push` は避ける。

---

## 5. タスク完了条件（AI Agentの停止条件）

以下の条件が**すべて満たされた時点で作業を完了とし、停止（回答）**する。追加の改善を勝手に開始してはならない。

- [ ] 指定された機能/修正が実装されている
- [ ] すべての検証（Lint, Typecheck, Test, Build）がPASSしている
- [ ] タスクと無関係なファイルの変更・意図しない差分がない
- [ ] 適切なメッセージで Git Commit が完了している
- [ ] Working tree が clean である（`git status` で確認）
- [ ] `git push origin <セッション固定ブランチ>` が完了している

---

## 6. プロジェクト固有の遵守事項

過去のセッションで実際に踏んだ地雷・確立した運用ルールを集約したもの。**計画書（`docs/` 等）に矛盾する指定があった場合は計画書を優先**するが、それ以外は本節を厳守する。

### 6.1 環境・ツールチェーン
- Node.js v24.x（`engines.node >= 24`、パッケージマネージャは pnpm、`packageManager` は `pnpm@12.3.4`）
- Next.js 15 App Router / React 19 / TypeScript 5.9（strict）
- Biome 2.5（ESLint は使用しない）、`biome.json` の `overrides` でテストファイルと CSS のみルールを調整
- Vitest 5 + jsdom 30 + @testing-library/react 16 + fake-indexeddb
- 状態管理: **Zustand 5**（`lib/stores/`）。Context API は使わない。TanStack Query 5 でデータ取得。
- YouTube 取得: `youtubei.js`（Innertube、`lib/innertube.ts` の `getInnertube()`）
- 動画再生: `video.js` 8 + `videojs-contrib-dash` 5 + `dashjs`
- ダウンロード: `ffmpeg-static` + `fluent-ffmpeg`（`lib/ffmpeg.ts` / `lib/download-queue.ts`）

### 6.2 サンドボックス制約（乗り越えず、迂回する）
以下は Sandbox 環境の恒常的制約であり、修正対象ではない。

| 制約 | 対処 |
|---|---|
| `ffmpeg-static` の postinstall が TLS/ネットワーク起因で失敗する | `pnpm install --ignore-scripts` で依存を導入する。`pnpm-workspace.yaml` の `onlyBuiltDependencies` で明示許可する。 |
| `@material/material-color-utilities@0.4.0` は拡張子なし ESM import を使うため、厳格な Node ESM で失敗する | `lib/theme.ts` は当該ライブラリを**ブラウザ実行時の動的 import** でのみ読む（SSR では評価しない）。テストでは `generateDynamicTheme` を mock するか、純粋ヘルパー（`applyThemeTokens` / `DEFAULT_SEED`）のみをテストする。 |
| `next build` が外部 API（YouTube 等）へ到達できない | exit code 0 なら成功扱いで問題ない。ビルド自体はローカルで完結する。 |

### 6.3 React / Next.js 実装ルール
- **Rules of Hooks**: モーダル・条件レンダリングを行うコンポーネントでは、全 hook（`useState` / `useEffect` / `useRef` 等）を `if (!open) return null;` の**前**に配置する。production build 時に minified error #310 になる。
- **JSX 内で日本語テキストと `{式}` を汚く混ぜない**: 「〜個の{count}件」のような接続はテンプレートリテラル（`` `${count}個` ``）または構造化（`<span>{count}</span>個`）で表現する。
- **Server Component → Client Component への関数 props 渡し不可**（Next.js 仕様）。クライアント側のインタラクションは Zustand store 経由で行う。
- **production build で動作確認する**: dev mode では React minified error を見落とすことがある。

### 6.4 Biome 特有ルール
- **`biome-ignore` コメントは対象コードの直前の行**に置く。1 行以上離れると unused 判定になり、逆に「意味のない ignore」として lint エラーになる。
  - ❌ 悪い例:
    ```tsx
    // biome-ignore lint/xxx: 理由
    // 何かのコメント
    useEffect(() => { ... });
    ```
  - ✅ 良い例:
    ```tsx
    // 何かのコメント
    // biome-ignore lint/xxx: 理由
    useEffect(() => { ... });
    ```
- JSX 内で対象行を ignore する場合は、`.map((_) => (\n // biome-ignore ...\n <elem>` のように**map 括弧内の直前行**に `//` コメントを置く（`{/* */}` を map の外に置くと効かない）。
- テストファイル（`__tests__/**/*.{ts,tsx}`）は `overrides` で `noNonNullAssertion` off。プロダクションコードでは non-null assertion を使わない（必要なら optional chaining / 早期 return で書き換える）。
- Biome の `noUnknownAtRules`（CSS）は Tailwind v3 の `@tailwind base/components/utilities` に反応するため、`biome.json` の `overrides` で CSS のみ `off` にする。

### 6.5 動的カスタムフック・Effect の依存配列
- `useEffect` の依存配列に**不安定なインラインコールバック**を入れると、毎レンダーで Effect が再実行され（EventSource / video.js の再初期化等）、動作を壊す。
- この場合は `// biome-ignore lint/correctness/useExhaustiveDependencies: <理由>` で意図を明示し、挙動を維持する（安易に依存配列を全部足したり、必要十分な依存を外したりしない）。

### 6.6 `__tests__` の注意
- `lib/theme.ts` を import すると `@material/material-color-utilities` の拡張子なし import 問題に触れるため、`__tests__/lib/theme.test.ts` では純粋ヘルパー（`applyThemeTokens` / `DEFAULT_SEED`）のみをテストする。store のテスト（`__tests__/lib/stores/theme.test.ts`）では `generateDynamicTheme` を mock する。
- `scripts/executer.ts` は `import.meta.main` で実行起点を判定している。テストから import しても `main()` は走らない（これがテスト可能にするための前提）。

### 6.7 ドキュメント運用
- ドキュメントは種類別フォルダに配置し、必ず `docs/README.md` の目次を更新する:
  - `docs/planning/` — 計画書（`_TEMPLATE.md` 形式）
  - `docs/ops/` — デプロイ・CI 運用手順
- `.agent/` 配下は Git 追跡対象（永続化）。`.gitignore` で除外しない。

---

## 7. コミュニケーション規約（Agent の話し方・ユーザーとの対話方針）

本節は「Agent がユーザーとどう会話するか」の型を定める。過去セッションでユーザーが受け入れた話し方を型化しており、次セッションの Agent もこの型を踏襲すること。

### 7.1 返答の基本スタイル

- **言語**: 日本語（ユーザーが日本語で話しかけているため）。技術用語は日本語 + 英語併記可。
- **文体**: 敬体（です・ます調）をベース。技術説明部分は淡々と事実を述べる。過度な謙譲・冗長な前置きは避ける。
- **絵文字**: 通常会話では使わない。**結果報告・チェックリスト・優先度表示のみ**、最小限で使う。
  - `✅` (完了) / `❌` (失敗) / `🟡` (中優先度) / `🟢` (低優先度) / `🔴` (高優先度・要注意)
- **見出し**: `##` `###` `####` で構造化。3 段以上は避ける。
- **表**: 実測値・比較・状態一覧は必ず表（`| 項目 | 値 |`）にまとめる。散文で羅列しない。

### 7.2 報告のフォーマット

コミット・タスク完了時は以下の順序で報告する:

1. **見出し**: `## ✅ タスク名 完了 (abc1234)` のようにタスク名 + commit hash 短縮 7 桁
2. **変更内容の表**: `| # | 問題/目的 | 実装 |` 形式
3. **検証結果チェックリスト**:
   ```text
   - ✅ pnpm typecheck (main + test): 0 error
   - ✅ pnpm exec biome lint .: 0 error (N files)
   - ✅ pnpm test:unit: X passed / Y files
   - ✅ pnpm build: Compiled successfully (N pages)
   - ✅ push 済み (prev..head)
   ```
4. **次のアクション**: 「次は何をしますか?」「Go を出していただければ〜」と提示し、勝手に次のタスクを開始しない（§5 のタスク完了条件）。

### 7.3 事実と推測の分離

- 実測値・確認済み事実は断言する。
- 未検証・推測は明示する（「〜のはずです」「〜と想定」「〜見込み」）。
- Sandbox で計測不能な数値は「Vercel deploy 後に計測予定」等と明記し、確定値のように書かない。

### 7.4 ユーザーへの質問方針

**わからないこと・判断に迷うことは、勝手に決めず必ずユーザーに質問する**。

#### 7.4.1 質問すべき場面

- 実装方針が 2 通り以上あり、どちらもメリット・デメリットがある時
- 計画書に記載されていない仕様判断が必要な時
- ユーザーの過去発言と現在の指示が矛盾している疑いがある時
- 破壊的変更（依存関係大規模更新等）を含む時
- 「〜してください」の指示が曖昧で、複数解釈が成り立つ時

#### 7.4.2 質問の方法

- **`ask_user` ツール**を使う（選択肢 UI で提示）
- **選択肢は 2〜4 個 + 自由記述** に絞る。5 個以上は選ばれない
- 各選択肢には **短いラベル** と **詳しい説明** を書く
- **一度に 4 質問まで**

### 7.5 Web 検索の活用方針

**わからないこと・記憶に自信がないことは Web 検索で確認する**。トレーニングデータ（cutoff）以降の情報や、ライブラリの最新 API 仕様は特に検索必須。

- **ライブラリの API 仕様が変わっている可能性がある時**（Next.js / React / Zustand / Biome / vitest など）
- **エラーメッセージ・解決策が不明な時**
- **外部 API のレスポンス形式・レート制限**
- 検索結果を引用する時は `[id](url)` 形式で必ずソースを明示
- 公式ドキュメント（`nextjs.org/docs`, `react.dev`, `biomejs.dev`, `zustand.docs.pmnd.rs` 等）を優先

### 7.6 失敗・エラー時の対応スタイル

検証失敗・実装エラーが発生した時は、以下の 3 段で説明する:

1. **原因分析**: 「〜が原因です」（推測なら「〜と思われます」を明示）
2. **修正方針**: 「〜で対処します」（2 案以上あるならユーザーに選択させる）
3. **実装**: 実際の修正コード

原因を隠して修正だけ通知しない。ユーザーが同じ地雷を踏まないよう、原因もセットで共有する。

---

## 8. エージェント記憶システム（`.agent/`）

本プロジェクトでは、Agent 自身の**コードベース知識・定型ワークフロー・タスク実行ログ**を `.agent/` 配下に構造化して永続化する。セッションをまたいで記憶を継承し、無駄な再調査を省くための仕組み。

### 8.1 ディレクトリ構成

| ディレクトリ | 役割 | 命名規則 |
| :--- | :--- | :--- |
| `.agent/skills/` | コードベースの**事実/仕様/暗黙了解**をサブシステム別に格納 | `kebab-case.md` |
| `.agent/hooks/` | トリガー別の**定型手順/スクリプト**（pre-task, verify, log, recovery） | `kebab-case.md` / `.sh` |
| `.agent/logs/` | タスク完了毎の**実行記録** | `YYYY-MM-DD_kebab-case-summary.md` |

各ディレクトリ直下に **`index.md`** を置き、一覧・参照条件を管理する。

### 8.2 `index.md` 起点のピンポイント読込（核心ワークフロー）

- **タスク開始時**（`.agent/hooks/pre-task.md`）: 現状把握後、`.agent/skills/index.md` の「読み方ガイド」で**該当スキルだけ**を読む。全スキルを常に読み込まない。
- **トリガー発生時**: `.agent/hooks/index.md` の「対応表」で該当フックを特定し実行。
- 初回/全体把握が必要な時だけ `skills/project-overview.md` → `skills/architecture-and-data-flow.md` の順。

### 8.3 記憶の同期（書き込みワークフロー）

- **タスク完了時**（`.agent/hooks/log-task.md`）: 必ず `.agent/logs/YYYY-MM-DD_<summary>.md` を 4 セクション（指示内容/実行内容/気づき/次アクション）で作成。
- **知見のスキル化**: ログの「気づき」が再利用性の高いコードベース知識なら該当 `skills/*.md` に反映し、`skills/index.md` の「最終更新」を更新する。
- ログ・スキル・index の変更も commit/push 対象（セッションブランチへ）。

### 8.4 AGENT.md と skills の役割分担

- **AGENT.md（本ファイル）** = 「どう作業するか」の**規約**（コミット手順・Lint・Git 運用・コミュニケーション等）。常に正。
- **skills/** = 「このコードベースが**どう出来ているか**」の**事実/仕様**。深掘り用。
- 両者が重複する場合、作業手順は AGENT.md、ドメイン知識は skills を参照。

### 8.5 運用ルール

- `.agent/` 配下は Git 追跡対象（永続化）。`.gitignore` で除外しない。
- スキル/フックを更新したら対応 `index.md` も必ず更新する（腐らせない）。
- ログは**追加のみ**（過去ログを書き換えない）。
  - 一括置換の射程は**現用ドキュメント**（`AGENT.md` / `.agent/skills/` / `.agent/hooks/` / `docs/` の現用ファイル）に限定する。`.agent/logs/` と `docs/audit/` の時点記録に触れる必要がある場合は、**必ず事前にユーザーへ確認**する。
