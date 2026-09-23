# Task List(ytdl)

> 進捗の唯一の正本。各タスクの詳細は `docs/planning/` の計画書。
> 状態: `未着手` / `進行中` / `完了` / `停止(要判断)`
>
> **⚠️ 方針転換(2026-09-23)**: 再生 = **iframe 一本**(既定 `youtubeeducation.com/embed`・公式 embed へ差し替え可。直リンク再生は実装しない)。**動画ダウンロードは目標・スコープから外し「保留(実装対象外)」**。
> 正本 = [../README.md](../README.md) / [HANDOVER.md](HANDOVER.md)(§2 目標・§4 判断表) / [planning/PHASE0_PLAN.md](planning/PHASE0_PLAN.md)(§10.7 再生・§10.8 保留注記・§10.9.1 検証・§11 リスク)。

## 検証(Phase 0 着手前)

| ID | タスク | 証跡 | 状態 | 進捗 / 証拠 |
|---|---|---|---|---|
| V1-a | youtubei.js バンドル + Node 初期化(WEB_EMBEDDED_PLAYER 受入) | [VERIFICATION_P0.md](research/VERIFICATION_P0.md) | 完了 | 2026-09-12 / v18.0.0・1.3MB バンドル・create() 到達(通信はサンドボックス遮断) |
| V1-b | GAS 実環境でのストリーム解決(1080p 確認) | 同上 | **✅ 完了(第 1〜6 回 2026-09-13〜15)**/ **現行: `/watch/` 抽出 = メタデータ解決として継続、decipherer / ストリーム URL 解決 = 保留** | 最終結論(v1f・コミット `6143012`): `/player` = GAS IP から不可(×3 ラウンド)/**`/watch/` ページ抽出 = 可行**(playability OK / 30 形式 / 1080p(137)+audio(140))/**ストリーム URL = 全 30 形式 `signatureCipher`(復号必須 = youtube-dlp 型 transform 逆変換)**。**Phase A リゾラ = watch 抽出 + signature decipherer + O9(リトライ+バックオフ / キャッシュ / single-flight)で確定**。**P00-D 着手可(冒頭 = 復号済み URL の fetch 実動作スパイク)**。経緯: 第 1 回失敗 → v1b 全 client 失敗(version 陳腐化排除)→ v1c 抽出バグ(watch ページ取得は OK)→ v1d **成功**→ v1e 429(=O9)→ v1e 試行 2 長待ち化(設計ミス)→ v1f **完了** |
| V2 | ブラウザ直接取得(CORS/Range/有効期限/codec) | 同上 | ✅ 完了(部分判定で確定・v2b は D8 でスキップ)/ **直リンク再生の保留に伴い参照情報** | **第 1 回(2026-09-13・ユーザーの Android 実行)**: `<video>` 再生 **OK** / fetch(B・C・D)全て **Failed to fetch** → **CORS(ACAO 欠如)が最有力**。expire ≈5.9h 確認 / O3(他 IP 再生)解決。**第 2 回(v2b)はユーザー判断でスキップ**(DL をサーバー側パイプラインとするため; v2b ファイルは任意の残置物) |
| V3-a | GAS `?_sw=` ディスパッチの HTTP 契約検証 | 同上 | 完了 | 2026-09-12 / ローカル模倣で HTML・JS MIME 同居確認 |
| V3-b | script.google.com での SW 登録 | 同上 | ⏳ 保留項目の参考(DL 保留に伴う) | **第 1 回**: ページが **text/plain として配信**され描画されず(リモートヘッダ確認済み) / **第 2 回**: v3b の `setMimeType(String)` が例外 — **GAS は `MimeType` 列挙型のみ受け付け**(O7)。enum 修正済み。→ **第 3 回待ち(参考)**: DL 設計確定で **GAS 期は StreamSaver 不使用(直リンク)** になったため「最重要」から**降格** = PWA/オフライン機能の判断材料。実行は任意・タイミングはユーザー次第(修正版 `verification/v3b-gas-test.gs` を新しいプロジェクトで、まず `?probe=1`) |
| V4 | iOS Safari 挙動 | 同上 | ⏳ 保留項目の参考(DL 保留に伴う) | ユーザー実行待ち(任意): `verification/v2b-browser-test.html`(iOS の DL fallback = 直リンク設計の裏取り) |
| V5 | **iframe 到達性**(ブラウザ側。2026-09-23 追加・現行スコープで必須) | [verification/README.md](../verification/README.md) / [VERIFICATION_P0.md §V5](research/VERIFICATION_P0.md) | ⏳ **未実施(ユーザー実行待ち)** | キット① `verification/v5-browser-iframe-test.html`(① `youtubeeducation.com/embed` の描画・再生 ② 公式 embed 到達性 ③ Player API 直接読込可否 ⑤ 広告/画質/ログインの目視。`?probe=1` 内蔵)/ (GAS 版キット `verification/v5b-gas-test.gs` は **GAS 不採用のため実行不要** = V6 へ移管。⑤ 広告/画質/ログインの場合分けはキット①の目視セル)。結果 = ユーザー送付後に [Verification-Results.md](../verification/Verification-Results.md) へ記録 |
| V6 | **サーバー側メタデータ取得**(2026-09-23 追加・server-first で必須) | [verification/README.md](../verification/README.md) / [VERIFICATION_P0.md §V6](research/VERIFICATION_P0.md) | ⏳ **未実施(ユーザー実行待ち)** | キット `verification/v6-metadata-check.mjs`(依存なし・Node 18+/Bun・1 回実行で JSON): ① yt-dlp の有無/版(probe)② `--dump-single-json` の取得項目 ③ ページ抽出フォールバック ④ 検索結果ページ ⑤ トレンド。**配備予定マシンで `--mode=all` を 1 回**実行 → `verification/v6-result.json` を送付 → [Verification-Results.md](../verification/Verification-Results.md) へ記録。**連続実行禁止**(前回から 10〜30 分) |

> **設計判断の現状(2026-09-23 方針転換後・正本 = [HANDOVER.md](HANDOVER.md) §4)**: **構成 = サーバー一本**(D10 = 自宅 **Proxmox(LXC/VM)** + **Docker Compose**(Nginx + Bun/Hono API)。**GAS 期を設けず、GAS 版は実装しない**)。**再生 = iframe 一本**(既定 = `youtubeeducation.com/embed/{id}`。公式 embed(`youtube-nocookie.com`)へ差し替え可能な形にする。直リンク再生は実装しない)。**メタデータ = yt-dlp 主 + ページ抽出フォールバック**(D11。第三者 API 不使用 = D2 の「自前実装」を維持)。**動画ダウンロード = 保留(実装対象外)** → 旧スコープの DL 系検証(V1 のストリーム URL 解決 / V2 の直接取得 = CORS / V3 の StreamSaver / DL 機構 = D3〜D5・D9)は**保留として保存**(証跡は残す)。**検索・トレンドは V6 の結果次第**(未確定の間は実装しない)。signature decipherer は実装しない。**P00 の推奨順 = B → C → D → E → F**(B/C は V5・V6 の結果に依存しないため先行可。**ユーザー GO 待ち**)。詳細仕様 = [HANDOVER.md](HANDOVER.md) §8.3。

## Phase 0: 基盤構築

| ID | タスク | 計画書 | 状態 | 進捗 / 証拠 |
|---|---|---|---|---|
| P00-A | リポジトリ再編成(cod-web ゲーム文書 `.archive/` 退避、docs 再編成) | [PHASE0_PLAN.md](planning/PHASE0_PLAN.md) | 完了 | 2026-09-12 退避・README/task-list 再編成 |
| P00-B | **サーバー骨格**(`apps/api` = Bun + Hono: `/api/health` + ルーティング + 設定/環境変数、`deploy/` = docker-compose.yml / nginx.conf / .env.example、ローカル起動手順) | 同上 | 未着手(ユーザー GO 待ち) | V5・V6 の結果に依存しないため先行可(実装仕様 = [HANDOVER.md](HANDOVER.md) §8.3) |
| P00-C | web スキャフォールド(Next.js App Router + Tailwind v4 + M3 トークン + GSAP)+ `packages/shared`(API client + types + vitest) | 同上 | 未着手(ユーザー GO 待ち) | 静的 export = Nginx 配信 |
| P00-D | **メタデータ解決**(`apps/api` = yt-dlp 主 + ページ抽出フォールバック + 正規化 + **O9**: キャッシュ/リトライ+バックオフ/single-flight。**検索・トレンドは V6 の結果次第**) | 同上 | 未着手(**V6 完了 + ユーザー GO 待ち**) | **保留**(実装しない)= signature decipherer / ストリーム URL 解決 / DL 機構(D3〜D5・D9)。仕様 = [HANDOVER.md](HANDOVER.md) §8.3 |
| P00-E | **配備**(Compose 完成 + Nginx/TLS + Proxmox LXC/VM 配備手順 + 運用 = 監視/更新/バックアップ) | 同上 | 未着手 | 実起動はユーザー環境(Proxmox)。Sandbox では `docker compose config` まで |
| P00-F | M3 Expressive 基線(ホーム / watch スケルトン + GSAP 1 種 + 検索 → 視聴 → iframe 再生の縦の一本) | 同上 | 未着手 | |

## 以降のフェーズ(要約、詳細計画書は着手前に作成)

| フェーズ | 内容 | 状態 |
|---|---|---|
| P1 | 再生(**iframe 一本** = `youtubeeducation.com/embed` 既定・公式 embed へ差し替え可)+ watch 情報(関連動画 / コメント) | 未着手 |
| P2 | **ダウンロード機能 — 保留(実装対象外)**。旧設計(Dexie キュー + mp4-muxer/webm-muxer + StreamSaver + 進捗UI)は [planning/PHASE0_PLAN.md](planning/PHASE0_PLAN.md) §10.8 に記録として保存 | 保留 |
| P3 | 機能拡張・ポリッシュ(チャンネル/プレイリスト/コメント/登録/履歴、M3 Expressive 全面展開) | 未着手 |
| P4 | 自宅サーバー運用の強化(監視・バックアップ・公開範囲/認証の調整、SW/PWA、ミラー配布用の単一 HTML 化) | 未着手 |

> 注: 計画書のサブタスク番号(P00-*)とはフェーズ番号(P1〜P4)が独立する。フェーズ計画書の作成時に本表と整合させる。

> **保留項目(2026-09-23 に目標から除外・実装対象外)**: 動画ダウンロード(P2 一式)/ ストリーム URL 解決・signature decipherer(P00-D の一部)/ 自宅サーバーの `/dl` DL 専用 relay・`/jobs` バッチ(P4 の一部)= **D3〜D5・D9**。関連文書は**経緯の記録として保存**(冒頭に保留注記を付与済み)= [research/VERIFICATION_P0.md](research/VERIFICATION_P0.md) / [research/DOWNLOAD_MECHANISM_RESEARCH.md](research/DOWNLOAD_MECHANISM_RESEARCH.md) / [research/SHIATUBE_DEEP_RESEARCH.md](research/SHIATUBE_DEEP_RESEARCH.md) / [research/SIATUBE_CODE_VERIFICATION.md](research/SIATUBE_CODE_VERIFICATION.md)。将来 DL を再検討する場合の出発点。
> 現行スコープの実装詳細 = [planning/PHASE0_PLAN.md](planning/PHASE0_PLAN.md) §10.4(スタック)/ §10.6(API)/ §10.7(再生 = iframe)/ §10.9(サーバー制約)/ §10.10(自宅サーバー構成)/ [HANDOVER.md](HANDOVER.md) §8.3(P00 仕様)。旧 GAS 前提の記述は計画書・HANDOVER で参考注記つき。

## docs/.agent 運用 (DOC-*)

| ID | タスク | 状態 | 進捗 / 証拠 |
|---|---|---|---|
| DOC-1 | cod-web 期ログから ytdl 適用可能な知識の SKILL 化 + cod-web 残骸の削除（ユーザー指示・削除範囲は ask_user で確認済） | 完了(2026-09-21) | ① 新規スキル `.agent/skills/quality-toolchain/SKILL.md`（7 ログから biome 2.x / vitest / coverage / Playwright / TS7 / import 境界の知識をインポート）② `sandbox-constraints` に Git 運用の知見追加（revert -m 1 等）③ `.agent/logs/` の cod-web 由来 45 件を削除（ytdl ログ 1 件のみ残存）④ `.archive/`（cod-web 文書 34 ファイル）を削除 ⑤ AGENTS.md / HANDOVER / docs / .agent の cod-web・.archive 参照を死参照ゼロに更新（grep 検証済）⑥ コミット = 本タスクのコミット（`docs(DOC-1): ...`、push 済み `arena/01a0c3bb-ytdl`）。検証 = docs-only のため §3.1 の整合性 grep（cod-web / .archive 残存 0・相対リンク切れ 0） |
| DOC-2 | 方針転換の文書反映 = **iframe 再生 / DL 保留 / 目標 = 完全に機能する YouTube プロキシ閲覧サイト** + しあTube 実コード確認の記録 + **V5 キット作成**(ユーザー指示 2026-09-23) | 完了(2026-09-23) | ① 新規 `docs/research/SIATUBE_CODE_VERIFICATION.md`(`ajgpw/siatube` @ `44ab1599`(MIT)をクローンして主要ファイルを読了 = iframe 方式・パラメータ供給・GAS 中継・API 面)② 新規 V5 キット 2 件 `verification/v5-browser-iframe-test.html` / `verification/v5b-gas-test.gs` ③ 改訂 = README.md / AGENTS.md / HANDOVER.md(§1〜§14・付録)/ planning/PHASE0_PLAN.md(§2〜§11・R10〜R12 新設)/ task-list.md / skills(index・project-overview・tech-stack)/ docs/README.md / research/README.md / verification/README.md ④ 保留注記 = research/VERIFICATION_P0.md / research/DOWNLOAD_MECHANISM_RESEARCH.md / research/SHIATUBE_DEEP_RESEARCH.md ⑤ コミット = 本タスクのコミット(`docs(DOC-2): ...`、push 済み `arena/01a0c3bb-ytdl`)。検証 = §3.1 の整合性 grep(新規リンク 3 種の実在確認・死参照 0) |
| DOC-3 | **server-first への計画再構成**(ユーザー指示 2026-09-23 =「最初からサーバーを立てて作る」)。GAS 期を廃止し、自宅 Proxmox + Docker Compose(Nginx + Bun/Hono) / メタデータ = yt-dlp 主 + ページ抽出フォールバック / 再生 = iframe(維持)/ DL = 保留(維持)へ全文書を整合。**V6 キット作成** | 完了(2026-09-23) | ① 新規 `verification/v6-metadata-check.mjs`(依存なし・probe と `--mode=all/video/page/search/trend/ytsearch`・10 分ガード・結果を `v6-result.json` に保存)② 改訂 = README.md / docs/HANDOVER.md(§1〜§14・付録)/ AGENTS.md(§0・§1・§3.1・§6.1〜§6.3・§6.5)/ planning/PHASE0_PLAN.md(§2〜§11・R13〜R15 新設・§10.9.1 検証リスト)/ task-list.md / skills(index・tech-stack・project-overview・sandbox-constraints)/ docs/README.md / planning/README.md / research/README.md / verification/README.md・Verification-Results.md ③ 不整合修正 = 簡体字混入(級联/已含む/不经由/佐证)・参照節番号(§10.8 → §10.9.1)④ コミット = 本タスクのコミット(`docs(DOC-3): ...`、push 済み)。検証 = §3.1 の整合性 grep(相対リンク切れ 0・GAS 現行参照 0) |
