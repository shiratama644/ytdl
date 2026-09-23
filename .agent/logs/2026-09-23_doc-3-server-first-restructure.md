# DOC-3: server-first への計画再構成(GAS 廃止 + V6 キット)

> Date: 2026-09-23(JST) / Commit: `c3f1e14` / Branch: `arena/01a0c3bb-ytdl`(セッション固定ブランチ)
> 補足: 直接の前段 = `4873f4e`(DOC-2 = iframe 転換・DL 保留・V5 キット。**DOC-2 のログは未作成**のため、
> DOC-2 の内容も本ログの §2 に併記する)。

## 1. 指示内容 (Task Summary)

- ユーザー指示(2026-09-23):「**プロジェクトは最初からサーバーを立てて作っていく方針です**」。
- `ask_user` で確定した 4 点:
  1. **GAS を外す**(サーバー一本。GAS 版は実装しない。V1 証跡・GAS キットは参考保存)
  2. スタック = **Bun + Hono + Nginx(Docker Compose。Proxmox LXC/VM 想定)**
  3. メタデータ = **yt-dlp 主(`--dump-single-json`)+ 自前ページ抽出フォールバック**
  4. 配備先 = **自宅 Proxmox**(ドメイン + TLS は既存手段)
- 維持される決定: 再生 = **iframe 一本**(`youtubeeducation.com/embed` 既定・公式 embed 差し替え可)/ DL = **保留** /
  機能範囲 = しあTube 相当フル(DL 除く)/ siatube.com API 不使用 / **O9(429 対策)はサーバー API でも必須**。
- ゴール: 上記を**全文書に反映**し、参照済みで未作成だった **V6 キットを作成**する(不整合の解消)。

## 2. 実行内容 (Executed Actions)

| # | 対象 | 内容 |
|---|---|---|
| 1 | `verification/v6-metadata-check.mjs`(**新規**・572 行) | 依存なし(Node 18+ / Bun)。`probe`(ネットワーク 0 回)/ `all` / `video` / `page` / `search` / `trend` / `ytsearch`。**10 分ガード**(前回実行から 10 分未満は中断・`--force` で回避)、結果を `v6-result.json` に保存。抽出 = 代入文の全候補列挙 → 括弧バランス切片 → `JSON.parse`(V1-d の移植) |
| 2 | `README.md` | サーバー一本の構成・スタック・構成図・V5/V6・旧 GAS を実装しない注記 |
| 3 | `docs/HANDOVER.md` | §1〜§14 + 付録を改訂。D10〜D12 追加、§7.8〜§7.9、§8.1(V5)/ §8.2(V6)/ §8.3(P00 仕様)、§13 推奨順 B → C → D → E → F |
| 4 | `AGENTS.md` | §0(サーバー一本)/ §3.1(検証コマンド)/ §6.1(スタック)/ §6.2(Sandbox = Bun・Docker 未実測)/ §6.3(旧 GAS 運用 → サーバー運用)/ §6.5(D10〜D12) |
| 5 | `docs/planning/PHASE0_PLAN.md` | §2 目的 / §3 範囲 / §5 DoD / §6 テスト方法 / §9 サブタスク再定義 / §10.2 アーキ図 / §10.4 スタック / §10.5 構成 / §10.6 API / §10.9 サーバー制約 / **§10.9.1 検証リスト(V5・V6)** / §10.10 本体構成 / §11 リスク(**R13〜R15 追加**) |
| 6 | `docs/task-list.md` | V5 行の分離(キット② は V6 へ)/ **V6 行追加** / P00-B〜F の再定義 / P4 の性格変更 / **DOC-3 行追加** |
| 7 | skills 4 件 + `docs/README.md` / `planning/README.md` / `research/README.md` | server-first への読み替え・V5/V6・D1〜D12 |
| 8 | `docs/research/VERIFICATION_P0.md` | V5 節の更新 + **V6 節(V6-1〜V6-6)追加**、状態サマリに V6 行 |
| 9 | `verification/README.md` / `Verification-Results.md` | V6 の実行手順(probe → `--mode=all`)/ 結果の貼り先 |
| 10 | 不整合修正 | 簡体字混入(`級联`→`連鎖`・`已含む`・`不经由`・`佐证`)/ 節番号参照(§10.8 → §10.9.1)/ `v5b-gas-test.gs` = 参考扱いの明示 |

- **DOC-2 の内容(併記)**: ① 新規 `docs/research/SIATUBE_CODE_VERIFICATION.md`(`ajgpw/siatube` @ `44ab1599` 読了 =
  iframe 方式・params 供給・GAS 中継・API 面)② V5 キット 2 件(`v5-browser-iframe-test.html` / `v5b-gas-test.gs`)
  ③ iframe 転換・DL 保留を全主要文書へ反映(`4873f4e`)。
- 検証(docs-only + キット): 相対リンク **143 件 → 切れ 0** / テーブル列数一致 / `node --check`(V6 キット)/
  抽出ロジックのユニット確認(偽マーカー非採用・引用符内括弧の無視・件数集計)/ `git status` clean。
- commit `c3f1e14` → `git push origin arena/01a0c3bb-ytdl`(`git ls-remote` で先端一致を確認)。

## 3. 気づいたこと・知見 (Insights & Lessons Learned)

- **DOC-2 のログ未作成**(ask_user がスキップされたため)。ログ運用は「追加のみ」なので、本ログで補った。
  次回以降は commit/push 直後に `.agent/logs/` を書く(hook `log-task.md`)。
- **参照だけ先に書かれた未作成ファイル**は不整合の温床(HANDOVER §8.2/§9 が `v6-metadata-check.mjs` を参照済みだった)。
  「文書に書いたら同時に実体を作る」を守る。
- **簡体字の混入**は過去ログ・旧キットにも残っていた(`級联` 等)。日本語文書では**同じ意味の語(連鎖・既に含まれる)**へ
  統一した。`edit_file` の fuzzy 失敗時は python3 の assert 付き置換が確実(継続有効)。
- **旧呼称の扱い**: 「Phase A / GAS 期」「Phase B」が残る箇所は、注記で「当時の呼称」と明示して保存する
  (証跡を書き換えると経緯が追えなくなるため)。DL 関連(§10.7/§10.8・DOWNLOAD_MECHANISM_RESEARCH)は**保留注記のみ**で保存。
- **キットの設計**(再発防止): 旧 GAS キットの UX 事故(長待リトライで無音)を踏まえ、V6 は
  ① probe で即返り ② 1 回の実行にリクエストを集約(`--mode=all` = 3〜4 件)③ **10 分ガード**を実装。
- **サンドボックスでは V6 の実走ができない**(egress ブロック)。probe モードと抽出ロジックのユニット確認までを
  サンドボックスで行い、実際の取得可否は**ユーザーの自宅環境**で確認する。

## 4. 次にすべきこと (Next Actions)

1. **ユーザーに V5 と V6 の実行を依頼**(または続きのセッションで依頼):
   - V5 = `verification/v5-browser-iframe-test.html`(ブラウザ。`?probe=1` → 3 枠 → 結果コピー)
   - V6 = `verification/v6-metadata-check.mjs`(`node v6-metadata-check.mjs` → `--mode=all`。結果は `v6-result.json`)
   - **連続実行はしない**(10〜30 分空ける)。
2. 結果受領後: `verification/Verification-Results.md` へ記録 → `docs/research/VERIFICATION_P0.md`(§V5/§V6)と
   `PHASE0_PLAN.md` §10.9.1 の判定を更新 → NG の項目は `ask_user` で機能の保留/代替を相談。
3. **P00 の GO 待ち**(V5/V6 に依存しない P00-B = サーバー骨格 / P00-C = web は先行可)。
   実装時は Sandbox の `bun --version` / `docker version` を実測し、不可なら「実環境検証待ち」として報告。
4. 未着手の残件: `.agent/skills/quality-toolchain` の Bun/Docker 前提更新は P00-B 着手時に実施(現時点では変更不要)。
