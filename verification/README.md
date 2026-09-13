# 検証キット(Phase 0 着手前)

設計原則「ブラウザからの直接取得可否を検証した上で利用する」の実施計画。
計画書: [`../docs/planning/PHASE0_PLAN.md`](../docs/planning/PHASE0_PLAN.md)(§10.9 検証リスト V1〜V4)
結果記録: [`../docs/research/VERIFICATION_P0.md`](../docs/research/VERIFICATION_P0.md)
第 1 回実行結果(ユーザー送付): [`Verification-Results.md`](Verification-Results.md)

## サンドボックス側で実施済み

| ID | 内容 | 結果 |
|---|---|---|
| V1-a | youtubei.js 18.0.0 を esbuild で Node 向けバンドル(1.3MB)し、`Innertube.create({client:"WEB_EMBEDDED_PLAYER"})` を実行 | ✅ バンドル/ロード/クライアント設定の受入 OK |
| V3-a | GAS の `?_sw=` ディスパッチをローカルサーバーで模倣 | ✅ HTTP 契約レベルで成立 |
| 付 | siatube.com API の第三者からの繰り返しアクセス観測 | ⚠️ 2 回目以降に空 HTML が返る現象を確認(中央 API の利用可能性リスク) |

## 第 1 回(2026-09-13)で判明したこと → 第 2 回キットの由来

1. **V2(ユーザーの Android 実行)**: `<video>` 再生は **OK**、fetch は全て **Failed to fetch**
   → CORS(ACAO 欠如)が最有力。→ **ユーザー判断: `v2b` はスキップ**(DL をサーバー側パイプラインとすれば
   クライアントは googlevideo を直接 fetch しないため。`v2b-browser-test.html` は任意の残置物)。
2. **V1(GAS)**: /embed/ ページに `ytInitialPlayerResponse` マーカーなし + player POST が
   **playability ERROR**(reason 未記録)→ マーカー級联 + 複数 client 比較の**診断キット**が必要(`v1b`)。
3. **V3(GAS)**: ページが **`text/plain` として配信され描画されず**(リモートヘッダ確認済み)、
   スクリプト未実行 → `?probe=` ピング + コンソールフォールバック付き(`v3b`)。
   さらに **v3b 初回実行(ユーザー)で GAS の制約を発見**: `setMimeType` は **`MimeType` 列挙型のみ**
   受け付け、String は例外(O7)。v3b/v1b は enum 使用に**修正済み**。

## 第 2 回: ユーザー側で実行していただくもの(合計 ~5 分)

> **前回と違う点: すべて「新しい GAS プロジェクト」でお願いします。**
> 旧プロジェクトのデプロイは旧バージョンを配信し続けるためです。

### 1. V1 再検証: `v1b-gas-test.gs`(2 分)

1. [script.google.com](https://script.google.com) で「新しいプロジェクト」
2. `v1b-gas-test.gs` を**全て貼付**
3. **デプロイ → 新しいデプロイ → Web アプリ** / 実行: **自分** / アクセス: **全員**
4. WebアプリURL をブラウザで開く
5. 表示される **JSON を丸ごとコピー**して送ってください

→ 確認できること: embed ページの正しい構造(`ytInitialPlayerConfig`)で解決できるか /
どの client(WEB_EMBEDDED_PLAYER 新旧版 / WEB / ANDROID)で playability OK になるか /
ERROR の reason(bot チェックか version 問題かの切り分け)

### 2. V3 再検証: `v3b-gas-test.gs`(2 分) — **最重要・最初にやってください**

> **(2026-09-13 修正)** v3b 初回実行で `setMimeType(String)` が例外になったため、
> MIME 指定を `ContentService.MimeType` 列挙型に**全て修正済み**。
> 前の v3b プロジェクトは破棄(新しいプロジェクトで作ってください)。

1. 上記と同様に**新しいプロジェクト**で `v3b-gas-test.gs` を貼付しデプロイ
2. **まず** WebアプリURL の末尾に `?probe=1` を付けて開く
   → `{"test":"V3b",...}` の JSON が表示されればデプロイは最新です(なければ JSON を送ってください)
3. その URL(`?probe` なし)を開く:
   - **ページが描画された場合**: ボックスに結果が出る → 「結果をコピー」ボタン(または手動)で送ってください
   - **文字として表示された場合**: そのまま画面下部の「コンソールコマンド」を、
     F12 → コンソールに貼り付けて Enter → コンソール出力をコピーして送ってください

→ 確認できること: **script.google.com 上で Service Worker を登録できるか**(StreamSaver 経路の成立可否)

### 3. V2 再検証: `v2b-browser-test.html`(1 分)— **任意(ユーザー判断: スキップ)**

ユーザー判断(2026-09-13): 自宅サーバー期に DL をサーバー側パイプラインとするため、
ブラウザが googlevideo を直接 fetch する場面がなくなり、CORS の確定テストは不要と判断。
→ もし後で「GAS 期に直リンク以外の DL を入れる」等と方針が変わったら、このテストを
PC Chrome で実行して送ってください(ファイルはそのまま有効)。

### 4. V4: 同一の `v2b-browser-test.html` を iOS(Safari)で開く(任意・時間がある時)

iPhone に送って開き、「実行」→「結果をコピー」。iOS は FSA が無く SW の挙動も異なるため、
DL フォールバック方針の確定に必要です。

## 結果の使い道

第 2 回結果を受領次第、`docs/research/VERIFICATION_P0.md` に証跡として追記し、
設計(再生経路 / DL 経路 / GAS 期と自宅サーバー期の機能分割 / リゾラ戦略)を確定し、
P00(サイト構築)着手へと進みます。
