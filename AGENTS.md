# AGENTS.md

本ドキュメントは、AI Agent が本プロジェクト（**ytdl** = YouTube プロキシサイト）の開発・変更を行う際に**必ず遵守すべき開発規約**です。
最優先事項は **「速く大量に作ること」ではなく「常に復旧可能で、壊れた状態を長時間維持しないこと」** です。

## 0. プロジェクト 30 秒概要（詳細は docs/ へ）

- **ytdl** = しあTube と同構成(静的フロントエンド + JSON 解決バックエンド)の YouTube 代替視聴・ダウンロードサイト。
  差別化 = **動画ダウンロード機能**(拡張子/画質 × キュー) + **Material 3 Design Expressive UI + GSAP**。
- **2 フェーズ運用**: **Phase A = GAS 期**(静的単一 HTML + `script.google.com` GAS Web アプリ)→
  **Phase B = 自宅サーバー期**(Proxmox/LXC + Bun/Hono + yt-dlp + Nginx)。
- **全設計判断は確定済み・再議論禁止** = [`docs/HANDOVER.md`](docs/HANDOVER.md) §4(D1〜D9) が正本。
- **検証(V1〜V2)は完了済み(2026-09-15)**。次の一手 = **P00 基盤構築(ユーザー GO 待ち)**。
  進捗の正本 = [`docs/task-list.md`](docs/task-list.md) / 設計の正本 = [`docs/planning/PHASE0_PLAN.md`](docs/planning/PHASE0_PLAN.md) /
  検証証跡 = [`docs/research/VERIFICATION_P0.md`](docs/research/VERIFICATION_P0.md)。

---

## 1. 基本方針 & 作業単位

### 1.1 基本原則
- **小さく実装 → 検証 → 修正 → Git Commit → 次への停止報告** のサイクルを徹底する。
- 一度に大量の機能を実装して最後にまとめてデバッグする方式は禁止。
- 「ついでに改善できそう」という理由でスコープを広げない（未指定の機能追加・設計変更・大規模リファクタリングの禁止）。
- **検証してから構築する**（ユーザーの常設指示）。YouTube/GAS/ブラウザ挙動の断定は実測・証跡がない限りしない。

### 1.2 作業単位の粒度
1タスクは**「1つの意味のある論理的単位」**で区切る。

| 区分 | 例 |
| :--- | :--- |
| **良い例（適切な粒度）** | P00-B(web スキャフォールド) / P00-D の decipherer / API client の双方向輸送 |
| **悪い例（細かすぎる）** | 1 トークン定義ごとにコミット / コマ1行変更ごとにテスト |
| **悪い例（大きすぎる）** | スキャフォールド + API 全実装 + UI 完成 を 1 タスクで一括実装 |

大規模変更は「設計 → 基盤 → 機能A（検証・commit・停止報告）→ 機能B（…）」と段階的に分割する。

---

## 2. 開発ワークフロー

各タスクは必ず以下の順序で進め、途中の検証が失敗した状態で次へ進んではならない。

```text
1. 現状把握 (git status / branch / log・docs/task-list.md・関連計画書)
   ↓
2. 実装方針決定（曖昧点は ask_user で確認・§7.4）
   ↓
3. 実装 (最小限の差分)
   ↓
4. 検証 (§3.1。コード未導入前はドキュメント整合性確認で代替)
   ↓ 失敗時は原因特定して修正し、再度全検証
5. 差分確認 (git diff で意図しない変更がないか)
   ↓
6. Git Commit (Conventional Commits + タスク ID)
   ↓
7. git push origin <セッション固定ブランチ>（事前許可済み・§4.3.1）
   ↓
8. タスク完了・停止 (勝手に次のタスクを開始しない)
```

---

## 3. テスト・品質保証ルール

### 3.1 検証コマンドの実行
- `package.json` に定義されたスクリプトのみを使用する（存在しないコマンドを捏造・実行しない）。
- **パッケージ管理は pnpm（workspaces）**（§6.1）。`apps/` + `packages/` のモノレポ。
- コードが存在するようになったら（P00-B 以降）、commit 前に定義された検証スクリプト（型チェック / lint /
  テスト / build）を全て pass させる。P00-B では定義するスクリプトの候補:
  `typecheck`(tsc --noEmit) / `lint`(biome) / `test`(vitest run、**watch 以外**) / `build`(next build → `out/`)。
- **単一 HTML ビルド（P00-E 以降）は `out/` 生成 + 1 ファイル化を毎回確認**（サイズ記録）。
- **GAS バックエンド（`backend/gas`）には npm パッケージはない**（GAS V8 のプレーン JS）。
  構文チェックは `node --check`（`.gs` には通らない → `/tmp/*.js` にコピーして実施）。
- **E2E（ブラウザ実機）は Sandbox で実行不可**（§6.2）。Chrome/iOS での確認は「実環境検証待ち」として報告する。
- **ドキュメントのみの変更では検証コマンドはスキップ可**。代わりに「リンク切れ・他ファイルとの参照整合・
  旧表現の残存がないこと」を grep で確認する（`grep -rn` で旧ブランチ名・旧 API 名・「docs/arch/」等の死参照を検索）。

### 3.2 エラー対応と品質維持
- エラー発生時は根本原因を特定し、最小限の範囲で修正する。
- **テストを通すためだけの不正な修正は厳禁**（テスト削除/skip・アサーション緩和・安易な `any`・Lint 無効化・エラー握り潰し）。
- **既存仕様の尊重**: 既存テスト・既存証跡が「壊れた」場合、「自分が壊していないか」を先に確認する。

### 3.3 既存バグの扱い
- **今回のタスクを妨げるバグ**: 必要最小限の修正を行う（証跡と一緒に記録）。
- **無関係な既存バグ**: 勝手に修正せず、`docs/task-list.md` に新タスクとして登録してユーザーへ報告。
- バグ修正時は可能であれば再発防止の回帰テストを追加。

---

## 4. Git運用 & 環境復旧ルール

Gitは単なる履歴管理ではなく、**「サンドボックス再構築・セッション切断時の復元チェックポイント」**として扱う。

### 4.1 作業開始時の現状把握
```bash
git status
git branch --show-current
git log -5 --oneline
```
- ブランチ名は**セッションごとに変わる**。本ドキュメントの記載値を鵜呑みにせず、
  **必ず `git branch --show-current` で確認**する。過去セッションのブランチ名は文書に残さない方針。
- 未コミット変更が存在する場合は、勝手に破棄・上書きせず、現在の作業に混ぜない。
- **re-clone 検出**: `git log` が起点 1 件のみ / `git status` が「大量の削除 + 大量の未追跡」→
  **§4.1.1 の復旧手順を必ず実行してから作業を始める**。

### 4.1.1 サンドボックス再構築（re-clone）時の復旧手順（2026-09-16 実施検証済み）

Arena のサンドボックスはターン跨ぎにリポジトリを再クローンし、ローカル HEAD が起点コミットに巻き戻る
（作業ツリーのファイルは残ることが多い）。以下の手順で復旧する:

```bash
# 1. リモートを全ブランチ fetch（refspec を必ず付ける。付けないと FETCH_HEAD だけ更新される罠）
git fetch origin '+refs/heads/*:refs/remotes/origin/*'

# 2. リモート先端を確認（ユーザーの Web UI コミットがないか・自分の前回の push が届いているか）
git log --oneline -3 origin/<現在のセッションブランチ>

# 3. HEAD/ブランチをリモート先端へ（--soft = 作業ツリー・index は触らない = 安全）
git reset --soft origin/<現在のセッションブランチ>

# 4. 作業ツリーをステージし、差分が「自分の未コミット変更のみ」か確認
git add -A
git diff --cached --stat
#   - 差分が 0（= ディスク状態がリモート先端と一致）= 復旧完了・そのまま作業再開
#   - 自分の未コミット変更のみ = commit + push
#   - 想定外の差分 = 停止してユーザーに確認
```

- **`git reset --hard` は不要**（上記 soft 手順で十分であり、破壊的だから）。
- 復旧後は必ず `git log --oneline -5` で健全性を確認してから作業再開。
- 詳細は [`.agent/hooks/sandbox-rebuild-recovery.md`](.agent/hooks/sandbox-rebuild-recovery.md)。

### 4.2 コミットルール
- **タイミング**: 検証が全て PASS した状態でのみコミット。
- **事前チェック**: `git status` / `git diff` で意図しないファイルが混ざっていないことを確認。
- **重要変更前のチェックポイント**: 大規模リファクタリング等の前には正常状態を一旦 commit。
- **メッセージ**: Conventional Commits（`feat/fix/refactor/docs/test/chore/build/ci`）+ **タスク ID をスコープに含める**（例: `feat(P00-B): web scaffold`）。

### 4.3 厳禁なGit操作（明示的な指示がない限り実行禁止）
- `git reset --hard` / `git clean -fd`（未コミット作業の消失リスク）
- `git rebase` / `git commit --amend`（既存履歴の改変）
- `git push --force` / `git push --force-with-lease`
- **`origin/arena/01a0778c-ytdl` などの他セッションブランチへの一切の操作**（fetch 表示は除く）

### 4.3.1 `git push` は**事前許可済み**（恒久ルール）
- **push のたびにユーザー確認を取らない。** 検証 PASS + 意図しない差分なしを確認できたら、
  その場で `git push origin <セッション固定ブランチ>` を実行する。
- **理由**: Sandbox は予告なく再構築され、**ローカルコミットのみだと作業が消える**。成果物は常に origin へ。
- push 先は**セッション固定ブランチのみ**。`main` 等への直接 push、他ブランチ push、force push は禁止。
- PR は `gh pr create` で作成可（`main` 向け）。作成後は URL を報告する。マージ判断はユーザー側に委ねる。
- push が rejected になったら: §4.1.1 の fetch → 差分確認 → push の順で対処。
  認証エラーなら「GitHub 接続の確認が必要」とユーザーへ伝える。

### 4.4 ブランチ運用（本セッション固有ルール）
- **作業ブランチはセッション固定**。Arena はこのブランチ名でセッションを追跡しており、
  他ブランチに push した作業はセッションと紐付かず失われる。
  - ブランチ名は**セッションごとに変わる**ため、必ず `git branch --show-current` で確認する（§4.1）。
  - **過去セッションのブランチ名は本ドキュメントに残さない**（後続セッションが別セッションのブランチを push する事故を防ぐため）。
- ユーザーから「別ブランチを使ってほしい」と言われた場合も「このセッションは現在のブランチに固定です」と説明し、そのまま続ける。
- feature branch は切らない。セッション固定ブランチへ直接 commit + push し、必要なら `gh pr create`。
- push は `git push origin <session-branch>` の明示指定で行う。default remote/branch 依存の `git push` は避ける。

### 4.5 ユーザーの GitHub Web UI 直接コミットへの対処（本プロジェクトで実際に複数回発生）
- **ユーザーは GitHub Web UI で直接コミットする**（検証結果の送付等）。
- 自分のコミット前に必ず `git fetch origin '+refs/heads/*:refs/remotes/origin/*'` し、
  **ユーザーが変更・削除したファイルを worktree に同期する**:
  - ユーザーが変更したファイル → `git checkout origin/<ブランチ> -- <ファイル>`
  - ユーザーが削除したファイル → worktree 側も削除（`git add -A` が旧コピーを復活させる罠）
- **ユーザーの結果管理方針: `verification/Verification-Results.md` = 1 ファイルに最新の生結果のみ**。
  古いラウンドの生データは git 履歴 + `docs/research/VERIFICATION_P0.md` の証跡に依存してよい。
  **旧ラウンドの内容をこのファイルへ再追加しない**（ユーザーが明示した運用）。

### 4.6 docs/ と .agent/ の扱い
- ドキュメント・`.agent/` は Git 追跡対象（永続化）。`.gitignore` で除外しない。
- **`.agent/logs/` は追加のみ**（過去ログを書き換えない。§8.5）。
- `.archive/`（cod-web 文書の退避先）は **2026-09-21 にユーザー指示で削除済み**（DOC-1）。過去は git 履歴で確認可能。

---

## 5. タスク完了条件（AI Agent の停止条件）

以下の条件が**すべて満たされた時点で作業を完了とし、停止（回答）**する。追加の改善を勝手に開始してはならない。

- [ ] 指定された機能/修正が実装されている
- [ ] 検証が PASS している（§3.1。コード無変更時は整合性確認で代替）
- [ ] タスクと無関係なファイルの変更・意図しない差分がない
- [ ] 適切なメッセージ（タスク ID 含む）で Git Commit が完了している
- [ ] Working tree が clean である
- [ ] `git push origin <セッション固定ブランチ>` が完了している
- [ ] `docs/task-list.md` の状態・証拠が更新されている（コード変更時）

---

## 6. プロジェクト固有の遵守事項

本プロジェクトで踏みやすい地雷と運用ルール。**計画書（`docs/planning/*PLAN.md`）や確定設計
（HANDOVER §4）と矛盾する指定があった場合は、それらを優先**する。

### 6.1 環境・ツールチェーン（確定・PHASE0_PLAN §10.4）

| 層 | 採用 | 注意 |
| :--- | :--- | :--- |
| パッケージ管理 | **pnpm (workspaces)** | `apps/` + `packages/`。bun は本プロジェクトでは使わない（pnpm が正） |
| フロントエンド | **Next.js（App Router、`output:'export'`）+ React** | 静的 export が GAS/単一 HTML 配布との前提 |
| スタイリング | **Tailwind CSS v4**（`@theme` で M3 トークン） | M3 Design Expressive のトークン運用 |
| モーション | **GSAP 3.13**（ScrollTrigger 任意） | `prefers-reduced-motion` 対応トグルは必須（§10.11） |
| 永続化 | **Dexie.js 4**（IndexedDB） | DL キュー・履歴・設定・レジューム |
| 再生 | ネイティブ `<video>/<audio>` 2 要素 DASH + **hls.js**(m3u8 ライブのみ) | MSE/dash.js/shaka は使わない（設計 C1） |
| DL | **mp4-muxer / webm-muxer（Worker・再エンコードなし）+ StreamSaver.js（Phase B 主経路）** | StreamSaver = 実質 Chromium 系のみ。iOS/FF = 直リンクフォールバック |
| バックエンド(GAS) | **プレーン JS（npm 不可）** = `/watch/` ページ抽出 + signature decipherer + O9 | youtubei.js ランタイムは不要（V1 で確定）。§6.3 |
| バックエンド(自宅・P5) | **Bun + Hono + yt-dlp（子プロセス）+ Nginx** | Phase B 専用 |
| 言語/品質 | TypeScript / **biome** / **vitest** | `bun test` 等は使わない |
| 実行環境(Sandbox) | Node 22（標準）+ pnpm | pnpm は `npm install -g pnpm`（.sh 参照） |

- arch に無い主要ライブラリを導入する場合はユーザーに相談する。

### 6.2 サンドボックス制約（乗り越えず、迂回する・全て実測済み）

| 制約 | 影響 | 対処 |
| :--- | :--- | :--- |
| **egress ブロック**: `youtube.com` / `googlevideo.com` / `siatube.com` / `script.google.com` への直接通信は SSL_ERROR_SYSCALL で即失敗 | YouTube 経路の検証・ユーザーの GAS デプロイ URL の確認が Sandbox から**できない** | YouTube 系の検証は**ユーザーが実行する GAS/ブラウザキット**で実施（§6.3 の UX ルール厳守） |
| `fetch_page` はレンダリング済み markdown しか返さない（`<script>` 内容の取得不可） | `ytInitialPlayerResponse` の中身等、script 内の確認が fetch_page では不可 | 同上（ユーザー実行キット）。raw.githubusercontent.com は到達可 |
| Chromium バイナリ install 不可 | Playwright 等はローカル実行不可 | 書くことはできるが実行しない。「実環境検証待ち」として報告 |
| **ターン跨ぎにリポジトリが再クローンされる**（本プロジェクトで複数回発生） | ローカルコミットが巻き戻る | §4.1.1 復旧手順 + **変更のたびに commit+push** |
| ライブプレビュー(e2b.app) | dev server は `0.0.0.0` バインド + プレビューホストの許可が必要 | Next.js: `allowedDevOrigins`（または `allowedHosts`）にプレビューホストを許可。ブラウザ向けコードは localhost 直叩きしない（相対 URL） |
| `uploads/` 等は同期されない場合がある | ユーザー送付ファイルの喪失 | 貼付が来たら必ずファイル化してコミット |
| `edit_file` の fuzzy 匹配はバックスラッシュを含むブロックで失敗しやすい | 編集不落 | `read_file` で正確なテキストを確認し、必要なら `write_file` 全文書き換え（python3 の in-file 置換 + assert も有効） |

### 6.3 YouTube / GAS 運用ルール（全て実測・2026-09-12〜15 の検証で確定）

**リゾラ（Phase A・P00-D）の確定設計**（証跡: VERIFICATION_P0.md / HANDOVER §7.7・§8.1）:
1. `https://www.youtube.com/watch?v=<id>&hl=ja&gl=JP` を desktop UA + `Accept-Language: ja-JP` で UrlFetchApp 取得
2. 代入文 `ytInitialPlayerResponse = {` を正規表現で**全候補列挙** → 括弧バランス切片 → JSON.parse →
   `playabilityStatus/streamingData/videoDetails` を持つ実レスポンスを採用（`verification/v1f-gas-test.gs` に参照実装）
3. **signature decipherer**: formats は**全形式 `signatureCipher`**（`s=<cipher>&sp=sig&url=<encoded>`）→
   player JS からの transform 抽出 → `s` 逆変換 → `decode(url) + &sig=<復号値>`（youtube-dlp 型）
4. **O9 必須**: 429/5xx のリトライ+バックオフ / **CacheService キャッシュ**（TTL = `expiresInSeconds` × 安全係数）/ 同一動画 single-flight

**禁止・不要な作業**:
- **`/player` InnerTube エンドポイントは GAS(Google DC)IP から 3 ラウンド連続 dead**（ERROR/UNPLAYABLE/400）。**使わない・再テストしない**。
- **GAS 後端に youtubei.js ランタイムを入れない**（不要 = V1 確定）。
- **siatube.com API は一切使わない**（ユーザー確定 D2）。
- **再生経路のバイト中継は全フェーズでしない**（D6）。DL 専用 relay は Phase B のみ。

**ユーザーに実行させる GAS/ブラウザキットの UX ルール（v1e 試行 2 で「どれだけ待っても表示されない」事故 → 恒久ルール）**:
- **数秒で必ずフィードバック**。キット内での長待リトライ（sleep 30s+ 等）は**禁止**。
- **`?probe=1` の即返り自己チェック**（YouTube への fetch 0 回）を必ず内蔵 = デプロイ鮮度確認。
- **1 回の実行 = 1 回だけ fetch**。429 等のリトライは**外部で**（閉じて 10〜30 分待って 1 回だけ開き直す）。
- 開いた後リロードさせない（1 リロード = 1 fetch = レート制限を食う）。
- 常に**新しい GAS プロジェクト**で実行させる（デプロイは旧バージョンを配信し続ける）。
- ユーザーには **raw URL + 自己チェック行（「〇〇行目が `...` になっていること」）** を必ず伝える（旧版混入が実際に 2 回発生）。
- `setMimeType` は **`ContentService.MimeType` 列挙型のみ**（String は例外 = O7）。
- YouTube 429 は実在（O9・~13 回/時で発生 / ~13h で解消）。本番リゾラは §6.3-4 の O9 対応が必須。

### 6.4 設計原則 4（ユーザー原文・**絶対表現の禁止を含む**・PHASE0_PLAN §10.2 に登記）

> **文書・コード・報告に書き記す際は絶対表現を禁止**され、条件付き・検証可能な表現を使うよう指示されている。

1. **サーバー側で動画データを中継・変換しない限り**、動画処理に伴う CPU/メモリ負荷を最小化できる
   （❌「サーバー負荷は完全にゼロ」）
2. **StreamSaver.js 等のストリーミングダウンロード機構を利用し**、巨大な Blob をメモリ上に保持することを避ける
   （❌「ローカルストレージへ直接書き出す」= メモリ非保持が趣旨）
3. **再エンコードを行わないため**、FFmpeg 等による再エンコードより CPU 負荷を大幅に低減できる
   （❌「数%〜10%程度」のような数値断定）
4. **ブラウザからの直接取得可否(CORS、Range、URL 有効期限、codec/container 対応等)を検証した上で利用する**
   （❌「生 URL を返せば再生可能」）

### 6.5 確定した設計判断（再議論禁止・正本 = HANDOVER §4）

| # | 判断 |
| :--- | :--- |
| D1 | 再生 = ネイティブ `<video>`+`<audio>` 2 要素 DASH（muxed 360p 既定）+ m3u8 のみ hls.js。**全フェーズで googlevideo 直読み** |
| D2 | リゾラ = **自前実装**（siatube.com API 不使用）。Phase A = `/watch/` 抽出 + decipherer + O9（V1 検証で確定） |
| D3 | DL(Phase B) = **方式 A 主**（/dl DL 専用 relay → Worker mux → StreamSaver → 進捗UI）+ **B 補完**（yt-dlp バッチ） |
| D4 | DL(GAS 期) = **720p 以下 muxed 直リンクのみ**（実測 itag 22/37 なし → itag 18 = 360p が対象） |
| D5 | DL(iOS/Firefox) = 直リンクフォールバック（StreamSaver は Chromium 系のみ） |
| D6 | **relay はダウンロードのときのみ・再生には一切使用しない**（常設制約）。自宅サーバーは全面プロキシにはしない |
| D7 | 対策ラダー（client 選択 / version 鮮度 / PO token / watch 抽出）。Phase A は watch 抽出固定。R1 = decipherer churn への備え |
| D8 | v2b（CORS 確定テスト）= スキップ（**再提案しない**） |
| D9 | FSA は DL 主経路にしない（StreamSaver 主経路 = ユーザー指定） |

### 6.6 ドキュメント運用

- **正本の地図**:
  | 役割 | ファイル |
  | :--- | :--- |
  | AI 引き継ぎの入口 | `docs/HANDOVER.md`（§14 = 新セッション初回プロンプト） |
  | 進捗 | `docs/task-list.md` |
  | 設計（P00） | `docs/planning/PHASE0_PLAN.md` |
  | 検証証跡 | `docs/research/VERIFICATION_P0.md` |
  | DL 機構調査 | `docs/research/DOWNLOAD_MECHANISM_RESEARCH.md` |
  | しあTube 調査 | `docs/research/SHIATUBE_DEEP_RESEARCH.md` |
  | 検証キット + 生結果 | `verification/`（README = 実行手順 / Verification-Results.md = 最新の生結果のみ） |
- ファイル追加時は `docs/README.md`（必要なら `verification/README.md` / `.agent/skills/index.md`）の索引を更新する。
- `docs/arch/` は**まだ存在しない**（P1 以降に新規作成）。現行では「設計の正本 = 計画書 + HANDOVER §4」。
  ドキュメント内で `docs/arch/` を**現存物として参照しない**（「P1 以降作成予定」として述べる場合を除く）。

### 6.7 優先順位

- 計画書（`docs/planning/*PLAN.md`）/ 確定設計（HANDOVER §4）と本ドキュメントが食い違う場合、**それらを優先**する。
- 計画書は着手前合意、本ドキュメントは作業の一般ルール。

### 6.8 タスク管理の形式（恒久ルール）

- **進捗管理の唯一の正本は `docs/task-list.md`**。タスクは ID（P00-A 等）で管理し、状態・完了条件・
  証拠（コミット SHA / 実測値）を必ず記録・更新する。
- **新規計画書は `docs/planning/_TEMPLATE.md` の形式**で作成し、着手前に `task-list.md` に行を追加。
- タスク ID は一度発行したら再利用しない（中止は「対象外」+ 理由を残す）。
- 作業中に見つけた新問題は現在のタスクに混ぜず、task-list.md に新タスクとして登録。
- 完了は自己申告ではなく**証拠**（差分・テスト結果・実測値）で判定。実環境確認が残る場合は
  「実環境検証待ち」として 100% にしない。
- 原則として進行中タスクは 1 件。

---

## 7. コミュニケーション規約（Agent の話し方・ユーザーとの対話方針）

### 7.1 返答の基本スタイル
- **言語**: 日本語（ユーザーは日本語のみ）。技術用語は日本語 + 英語併記可。
- **文体**: 敬体（です・ます調）。技術説明は淡々と事実を述べる。過度な謙譲・冗長な前置きを避ける。
- **絵文字**: 通常会話では使わない。**結果報告・チェックリスト・優先度表示のみ**最小限で:
  `✅` / `❌` / `🟡` / `🟢` / `🔴` / `🎉`（フェーズ完了時のみ）
- **見出し**: `##` `###` `####`。3 段以上は避ける。
- **表**: 実測値・比較・状態一覧は必ず表にまとめる。散文で羅列しない。
- **箇条書き**: `-` を優先。番号付きは手順・順序を示す時のみ。
- **短文**: ユーザーは短文指示が多い。要約 → 表 → 次の一手、の順で簡潔に。

### 7.2 報告のフォーマット（コミット・タスク完了時）
1. **見出し**: `## ✅ <タスク名> 完了 (abc1234)`
2. **変更内容の表**: `| # | 問題/目的 | 実装 |`
3. **ファイル変更数**: `新規/変更 (N files, +X / -Y)`
4. **検証結果チェックリスト**（§3.1 の各項目の PASS/スキップ理由）
5. **次のアクション**: 「Go を出していただければ〜」等と提示し、勝手に次のタスクを開始しない（§5）

### 7.3 事実と推測の分離
- 実測値・確認済み事実は断言（「HTTP 200 / 1273ms / 30 形式でした」）。
- 未検証・推測は明示（「〜と想定」「実機で計測予定」）。
- **Sandbox で計測不能な数値**（ブラウザの DL 速度・iOS 挙動等）は確定値のように書かない。

### 7.4 ユーザーへの質問方針
**わからないこと・判断に迷うことは、勝手に決めず必ずユーザーに質問する**（`ask_user` ツールで選択肢 UI 提示）。

- 質問すべき場面: 実装方針が 2 通り以上ありどちらも利弊がある時 / 確定設計・計画書に無い仕様判断 /
  過去発言と矛盾する疑い / 破壊的変更を含む時 / 指示が複数解釈に成り立つ時
- 選択肢は **2〜4 個 + 自由記述**。各選択肢に短い label + 詳しい description。質問文は 1 文で明確に。
- **一度に 4 質問まで**。
- **技術的事実の確認** → `web_search`（客観情報・`[id](url)` で引用）/ **プロジェクト固有の判断** → `ask_user`。

### 7.5 失敗・エラー時の対応スタイル
1. **原因分析**（推測なら明示）→ 2. **修正方針**（2 案以上なら選択させる）→ 3. **実装**。
   原因を隠して修正だけ通知しない。

### 7.6 制約・リスクの事前明示
Sandbox 制約（§6.2）・GAS 制約（§6.3）・ブラウザ制約が関係する場合は**実装前に必ず伝える**。
事後報告（「実は動作確認できてませんでした」）は信頼を損なうので避ける。

---

## 8. エージェント記憶システム（`.agent/`）

Agent 自身の**スキル（このプロジェクトをうまく進めるノウハウ・手順・パターン）**、定型ワークフロー、
タスク実行ログを `.agent/` 配下に構造化して永続化する。セッションをまたいで能力を継承し、
無駄な再調査・失敗を省くための仕組み。

### 8.1 ディレクトリ構成

| ディレクトリ | 役割 | 命名規則 |
| :--- | :--- | :--- |
| `.agent/skills/` | **Agent のスキル**: このプロジェクトで何をどうやるとうまくいくか（実践的ノウハウ・手順・パターン・実測知見） | `<kebab-case>/SKILL.md` |
| `.agent/hooks/` | トリガー別の**定型手順/スクリプト**（pre-task, verify, log, recovery） | `kebab-case.md` / `.sh` / `settings.json` |
| `.agent/logs/` | タスク完了毎の**実行記録**（ytdl のみ。cod-web 由来ログは 2026-09-21 に DOC-1 で削除済み） | `YYYY-MM-DD_kebab-case-summary.md` |

各ディレクトリ直下に **`index.md`** を置き、一覧・参照条件を管理する（logs は除く）。

### 8.2 `index.md` 起点のピンポイント読込（核心ワークフロー）
- **タスク開始時**（[`hooks/pre-task.md`](.agent/hooks/pre-task.md)）: 現状把握後、
  [`skills/index.md`](.agent/skills/index.md) の「読み方ガイド」で**該当スキルだけ**読む（全スキル常読禁止）。
- **トリガー発生時**: [`hooks/index.md`](.agent/hooks/index.md) の対応表で該当フックを特定し実行。
- 初回/全体把握が必要な時だけ `project-overview/SKILL.md` → `tech-stack/SKILL.md` の順。

### 8.3 記憶の同期（書き込みワークフロー）
- **タスク完了時**（[`hooks/log-task.md`](.agent/hooks/log-task.md)）: `.agent/logs/YYYY-MM-DD_<summary>.md` を
  4 セクション（指示内容/実行内容/気づき/次アクション）で作成。
- **知見のスキル化**: 「気づき」が再利用性の高い知識なら該当 `skills/*/SKILL.md` に反映し、
  `skills/index.md` の「最終更新」を更新。新スキルは「読み方ガイド」「一覧」両方に追記。
- ログ・スキル・index の変更も commit/push 対象。

### 8.4 役割分担（AGENTS.md / skills / docs）
- **AGENTS.md（本ファイル）** = 「どう作業するか」の**規約**。常に正。
- **`.agent/skills/`** = **Agent のスキル**。「うまく作る/ハマらないための実践知」。仕様書の要約メモではない。
- **`docs/`** = 設計**仕様の正本**（計画書 / 調査証跡 / 引き継ぎ）。
- 「こういう設計になっている」が docs、「こうやるとうまくいく」が skills、「こう作業せよ」が AGENTS.md。
  矛盾時は §6.7（計画書・確定設計優先）に従う。

### 8.5 運用ルール
- `.agent/` 配下は Git 追跡対象（永続化）。`.gitignore` で除外しない。
- スキル/フックを更新したら対応 `index.md` も必ず更新する（腐らせない）。
- ログは**追加のみ**（過去ログを書き換えない）。
  - ⚠️ **一括置換・リネーム系の指示が来ても、`.agent/logs/` の過去ログを置換対象に含めない。**
    過去ログは「その時点で何が起きたか」の事実記録であり、旧ブランチ名・旧数値・旧パスが
    書かれているのは**正しい状態**。
  - 一括置換の射程は**現用ドキュメント**（`AGENTS.md` / `.agent/skills/` / `.agent/hooks/` / `docs/` 現用）に限定。
    `.agent/logs/` を触る必要がある場合は**必ず事前にユーザーへ確認**。
