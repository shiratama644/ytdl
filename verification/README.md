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
   → CORS(ACAO 欠如)が最有力。**PC Chrome での確定切り分け**が必要(`v2b`)。
2. **V1(GAS)**: /embed/ ページに `ytInitialPlayerResponse` マーカーなし + player POST が
   **playability ERROR**(reason 未記録)→ マーカー級联 + 複数 client 比較の**診断キット**が必要(`v1b`)。
3. **V3(GAS)**: ページが **`text/plain` として配信され描画されず**(リモートヘッダ確認済み)、
   スクリプト未実行 → MIME 文字列リテラル + `?probe=` ピング + コンソールフォールバック付き(`v3b`)。

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

1. 上記と同様に**新しいプロジェクト**で `v3b-gas-test.gs` を貼付しデプロイ
2. **まず** WebアプリURL の末尾に `?probe=1` を付けて開く
   → `{"test":"V3b",...}` の JSON が表示されればデプロイは最新です(なければ JSON を送ってください)
3. その URL(`?probe` なし)を開く:
   - **ページが描画された場合**: ボックスに結果が出る → 「結果をコピー」ボタン(または手動)で送ってください
   - **文字として表示された場合**: そのまま画面下部の「コンソールコマンド」を、
     F12 → コンソールに貼り付けて Enter → コンソール出力をコピーして送ってください

→ 確認できること: **script.google.com 上で Service Worker を登録できるか**(StreamSaver 経路の成立可否)

### 3. V2 再検証: `v2b-browser-test.html`(1 分)

**PC の Chrome** でファイルをダブルクリックして開く(前回は Android で実行され、能力フラグの解釈が
曖昧になっているため)→ 「実行」ボタン → 完了したら「結果をコピー」で送ってください。
(先頭に表示される protocol/origin/UA を必ずそのままにしてください)

→ 確認できること: **CORS の確定切り分け**(no-cors mode + 公開 proxy 経由の relay 実証)+ Range / 再生 / 能力

### 4. V4: 同一の `v2b-browser-test.html` を iOS(Safari)で開く(任意・時間がある時)

iPhone に送って開き、「実行」→「結果をコピー」。iOS は FSA が無く SW の挙動も異なるため、
DL フォールバック方針の確定に必要です。

## 結果の使い道

第 2 回結果を受領次第、`docs/research/VERIFICATION_P0.md` に証跡として追記し、
設計(再生経路 / DL 経路 / GAS 期と自宅サーバー期の機能分割 / リゾラ戦略)を確定し、
P00(サイト構築)着手へと進みます。
