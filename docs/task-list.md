# Task List(ytdl)

> 進捗の唯一の正本。各タスクの詳細は `docs/planning/` の計画書。
> 状態: `未着手` / `進行中` / `完了` / `停止(要判断)`
>
> **⚠️ 方針転換(2026-09-23)**: 再生 = **iframe 一本**(既定 `youtubeeducation.com/embed`・公式 embed へ差し替え可。直リンク再生は実装しない)。**動画ダウンロードは目標・スコープから外し「保留(実装対象外)」**。
> 正本 = [../README.md](../README.md) / [HANDOVER.md](HANDOVER.md)(§2 目標・§4 判断表) / [planning/PHASE0_PLAN.md](planning/PHASE0_PLAN.md)(§10.7 再生・§10.8 保留注記・§11 リスク)。

## 検証(Phase 0 着手前)

| ID | タスク | 証跡 | 状態 | 進捗 / 証拠 |
|---|---|---|---|---|
| V1-a | youtubei.js バンドル + Node 初期化(WEB_EMBEDDED_PLAYER 受入) | [VERIFICATION_P0.md](research/VERIFICATION_P0.md) | 完了 | 2026-09-12 / v18.0.0・1.3MB バンドル・create() 到達(通信はサンドボックス遮断) |
| V1-b | GAS 実環境でのストリーム解決(1080p 確認) | 同上 | **✅ 完了(第 1〜6 回 2026-09-13〜15)**/ **現行: `/watch/` 抽出 = メタデータ解決として継続、decipherer / ストリーム URL 解決 = 保留** | 最終結論(v1f・コミット `6143012`): `/player` = GAS IP から不可(×3 ラウンド)/**`/watch/` ページ抽出 = 可行**(playability OK / 30 形式 / 1080p(137)+audio(140))/**ストリーム URL = 全 30 形式 `signatureCipher`(復号必須 = youtube-dlp 型 transform 逆変換)**。**Phase A リゾラ = watch 抽出 + signature decipherer + O9(リトライ+バックオフ / キャッシュ / single-flight)で確定**。**P00-D 着手可(冒頭 = 復号済み URL の fetch 実動作スパイク)**。経緯: 第 1 回失敗 → v1b 全 client 失敗(version 陳腐化排除)→ v1c 抽出バグ(watch ページ取得は OK)→ v1d **成功**→ v1e 429(=O9)→ v1e 試行 2 長待ち化(設計ミス)→ v1f **完了** |
| V2 | ブラウザ直接取得(CORS/Range/有効期限/codec) | 同上 | ✅ 完了(部分判定で確定・v2b は D8 でスキップ)/ **直リンク再生の保留に伴い参照情報** | **第 1 回(2026-09-13・ユーザーの Android 実行)**: `<video>` 再生 **OK** / fetch(B・C・D)全て **Failed to fetch** → **CORS(ACAO 欠如)が最有力**。expire ≈5.9h 確認 / O3(他 IP 再生)解決。**第 2 回(v2b)はユーザー判断でスキップ**(DL をサーバー側パイプラインとするため; v2b ファイルは任意の残置物) |
| V3-a | GAS `?_sw=` ディスパッチの HTTP 契約検証 | 同上 | 完了 | 2026-09-12 / ローカル模倣で HTML・JS MIME 同居確認 |
| V3-b | script.google.com での SW 登録 | 同上 | ⏳ 保留項目の参考(DL 保留に伴う) | **第 1 回**: ページが **text/plain として配信**され描画されず(リモートヘッダ確認済み) / **第 2 回**: v3b の `setMimeType(String)` が例外 — **GAS は `MimeType` 列挙型のみ受け付け**(O7)。enum 修正済み。→ **第 3 回待ち(参考)**: DL 設計確定で **GAS 期は StreamSaver 不使用(直リンク)** になったため「最重要」から**降格** = PWA/オフライン機能の判断材料。実行は任意・タイミングはユーザー次第(修正版 `verification/v3b-gas-test.gs` を新しいプロジェクトで、まず `?probe=1`) |
| V4 | iOS Safari 挙動 | 同上 | ⏳ 保留項目の参考(DL 保留に伴う) | ユーザー実行待ち(任意): `verification/v2b-browser-test.html`(iOS の DL fallback = 直リンク設計の裏取り) |
| V5 | **iframe 到達性 + GAS IP からの検索・トレンド抽出**(2026-09-23 追加・現行スコープで必須) | [verification/README.md](../verification/README.md) / [VERIFICATION_P0.md §V5](research/VERIFICATION_P0.md) | ⏳ **未実施(ユーザー実行待ち)** | キット① `verification/v5-browser-iframe-test.html`(① `youtubeeducation.com/embed` の描画・再生 ② 公式 embed 到達性 ③ Player API 直接読込可否 ⑤ 広告/画質/ログインの目視。`?probe=1` 内蔵)/ キット② `verification/v5b-gas-test.gs`(④ GAS からの検索・トレンド抽出。**1 実行 = 1 fetch**)。結果 = ユーザー送付後に [Verification-Results.md](../verification/Verification-Results.md) へ記録 |

> **設計判断の現状(2026-09-23 方針転換後・正本 = [HANDOVER.md](HANDOVER.md) §4)**: **再生 = iframe 一本**(既定 = `youtubeeducation.com/embed/{id}`。公式 embed(`youtube-nocookie.com`)へ差し替え可能な形にする。直リンク再生は実装しない)。**動画ダウンロード = 保留(実装対象外)** → 旧スコープの DL 系検証(V1 のストリーム URL 解決 / V2 の直接取得 = CORS / V3 の StreamSaver / DL 機構 = D3〜D5)は**保留として保存**(証跡は残す)。**リゾラ = 自前実装(siatube.com API 不使用)= 維持**し、役割は **メタデータ解決**(`/watch/` ページ抽出 = V1-d で実証済み)に限定。**検索・トレンドは V5 の結果次第**(未確定の間は実装しない)。signature decipherer は実装しない。**P00 の推奨順 = B → C → F → E → D**(D = メタデータ解決のみ。**V5 の結果 + ユーザー GO 待ち**)。詳細仕様 = [HANDOVER.md](HANDOVER.md) §8.2。

## Phase 0: 基盤構築

| ID | タスク | 計画書 | 状態 | 進捗 / 証拠 |
|---|---|---|---|---|
| P00-A | リポジトリ再編成(cod-web ゲーム文書 `.archive/` 退避、docs 再編成) | [PHASE0_PLAN.md](planning/PHASE0_PLAN.md) | 完了 | 2026-09-12 退避・README/task-list 再編成 |
| P00-B | web スキャフォールド(Next.js + Tailwind v4 + M3 トークン + GSAP) | 同上 | 未着手 | |
| P00-C | packages/shared(API client 双方向輸送 + types) | 同上 | 未着手 | |
| P00-D | GAS 後端(doGet ディスパッチ + **メタデータ解決 = `/watch/` ページ抽出** + O9: リトライ+バックオフ / キャッシュ / single-flight。検索・トレンドは V5 の結果次第) | [PHASE0_PLAN.md](planning/PHASE0_PLAN.md) | 未着手(**V5 完了 + ユーザー GO 待ち**) | **保留**(実装しない)= signature decipherer / ストリーム URL 解決 / DL 機構(D3〜D5・D9)。仕様 = [HANDOVER.md](HANDOVER.md) §8.2 |
| P00-E | 単一 HTML ビルド + GAS デプロイ手順 | 同上 | 未着手 | |
| P00-F | M3 Expressive 基線(ホーム / watch スケルトン) | 同上 | 未着手 | |

## 以降のフェーズ(要約、詳細計画書は着手前に作成)

| フェーズ | 内容 | 状態 |
|---|---|---|
| P1 | 再生(**iframe 一本** = `youtubeeducation.com/embed` 既定・公式 embed へ差し替え可)+ watch 情報(関連動画 / コメント) | 未着手 |
| P2 | **ダウンロード機能 — 保留(実装対象外)**。旧設計(Dexie キュー + mp4-muxer/webm-muxer + StreamSaver + 進捗UI)は [planning/PHASE0_PLAN.md](planning/PHASE0_PLAN.md) §10.8 に記録として保存 | 保留 |
| P3 | 機能拡張・ポリッシュ(チャンネル/プレイリスト/コメント/登録/履歴、M3 Expressive 全面展開) | 未着手 |
| P4 | 自宅サーバー移行(Bun + Hono + yt-dlp + SW。主目的は DL relay / バッチ) — **保留**(現行スコープ = iframe 再生 + メタデータ解決では不要。§10.10 = 将来オプション) | 保留 |

> 注: 計画書のサブタスク番号(P00-*)とはフェーズ番号(P1〜P4)が独立する。フェーズ計画書の作成時に本表と整合させる。

> **保留項目(2026-09-23 に目標から除外・実装対象外)**: 動画ダウンロード(P2 一式)/ ストリーム URL 解決・signature decipherer(P00-D の一部)/ 自宅サーバーの `/dl` DL 専用 relay・`/jobs` バッチ(P4 の一部)= **D3〜D5・D9**。関連文書は**経緯の記録として保存**(冒頭に保留注記を付与済み)= [research/VERIFICATION_P0.md](research/VERIFICATION_P0.md) / [research/DOWNLOAD_MECHANISM_RESEARCH.md](research/DOWNLOAD_MECHANISM_RESEARCH.md) / [research/SHIATUBE_DEEP_RESEARCH.md](research/SHIATUBE_DEEP_RESEARCH.md)。将来 DL を再検討する場合の出発点。
> 現行スコープの実装詳細 = [planning/PHASE0_PLAN.md](planning/PHASE0_PLAN.md) §10.7(再生 = iframe)/ §10.6(API)/ [HANDOVER.md](HANDOVER.md) §8.2(P00-D 仕様)。

## docs/.agent 運用 (DOC-*)

| ID | タスク | 状態 | 進捗 / 証拠 |
|---|---|---|---|
| DOC-1 | cod-web 期ログから ytdl 適用可能な知識の SKILL 化 + cod-web 残骸の削除（ユーザー指示・削除範囲は ask_user で確認済） | 完了(2026-09-21) | ① 新規スキル `.agent/skills/quality-toolchain/SKILL.md`（7 ログから biome 2.x / vitest / coverage / Playwright / TS7 / import 境界の知識をインポート）② `sandbox-constraints` に Git 運用の知見追加（revert -m 1 等）③ `.agent/logs/` の cod-web 由来 45 件を削除（ytdl ログ 1 件のみ残存）④ `.archive/`（cod-web 文書 34 ファイル）を削除 ⑤ AGENTS.md / HANDOVER / docs / .agent の cod-web・.archive 参照を死参照ゼロに更新（grep 検証済）⑥ コミット = 本タスクのコミット（`docs(DOC-1): ...`、push 済み `arena/01a0c3bb-ytdl`）。検証 = docs-only のため §3.1 の整合性 grep（cod-web / .archive 残存 0・相対リンク切れ 0） |
| DOC-2 | 方針転換の文書反映 = **iframe 再生 / DL 保留 / 目標 = 完全に機能する YouTube プロキシ閲覧サイト** + しあTube 実コード確認の記録 + **V5 キット作成**(ユーザー指示 2026-09-23) | 完了(2026-09-23) | ① 新規 `docs/research/SIATUBE_CODE_VERIFICATION.md`(`ajgpw/siatube` @ `44ab1599`(MIT)をクローンして主要ファイルを読了 = iframe 方式・パラメータ供給・GAS 中継・API 面)② 新規 V5 キット 2 件 `verification/v5-browser-iframe-test.html` / `verification/v5b-gas-test.gs` ③ 改訂 = README.md / AGENTS.md / HANDOVER.md(§1〜§14・付録)/ planning/PHASE0_PLAN.md(§2〜§11・R10〜R12 新設)/ task-list.md / skills(index・project-overview・tech-stack)/ docs/README.md / research/README.md / verification/README.md ④ 保留注記 = research/VERIFICATION_P0.md / research/DOWNLOAD_MECHANISM_RESEARCH.md / research/SHIATUBE_DEEP_RESEARCH.md ⑤ コミット = 本タスクのコミット(`docs(DOC-2): ...`、push 済み `arena/01a0c3bb-ytdl`)。検証 = §3.1 の整合性 grep(新規リンク 3 種の実在確認・死参照 0) |
