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

## 第 2 回結果(2026-09-13/14)と第 3 回キットの由来

1. **V1 / v1b(実行済み・コミット `c53eddb`)**: **全 client 失敗** —
   C1/C2(WEB_EMBEDDED_PLAYER、最新 version 2.20260911.01.00)= `ERROR「この動画は再生できません」` /
   C3(WEB)= `UNPLAYABLE` / C4(ANDROID)= `HTTP 400`。
   version 陳腐化は排除。embed ページ自体は 200/131KB で実取得可(制限は `/player` 単位)
   → **データセンター IP + PO token/visitorData 欠如の疑い**。
   → **第 3 回 `v1c`**: **`/watch/` ページの `ytInitialPlayerResponse` 抽出を主経路に**
   (PO token 不要の可能性)+ `/player` 改善(visitorData+playbackContext)+
   playabilityStatus 詳細(messages)記録 + bot チェック自動検知。
2. **V3 / v3b**: 実行未了。DL 設計確定(GAS 期 = 直リンク)により**参考レベルに降格**
   (PWA/オフライン機能の判断材料)。任意。

## 第 3 回: ユーザー側で実行していただくもの(合計 ~2 分)

> **すべて「新しい GAS プロジェクト」でお願いします**(旧プロジェクトのデプロイは
> 旧バージョンを配信し続けるため)。ファイルは**必ず下記の raw URL から取得**してください
> (手元の古いコピーは setMimeType 例外で失敗します: 過去に 2 回発生)。

### 1. V1 再検証(第 3 回): `v1c-gas-test.gs`(2 分)— **最重要・これだけやってください**

1. [v1c-gas-test.gs (raw)](https://raw.githubusercontent.com/shiratama644/ytdl/arena/01a094ec-ytdl/verification/v1c-gas-test.gs)
   を開いて中身を**全てコピー**
2. [script.google.com](https://script.google.com) で「新しいプロジェクト」→ 貼付
   **自己チェック**: `doGet()` の最後の行が
   `.setMimeType(ContentService.MimeType.JSON);`(**列挙型**)になっていること
   (文字列 `'application/json...'` が出ていたら古い版=使わないで)
3. **デプロイ → 新しいデプロイ → Web アプリ** / 実行: **自分** / アクセス: **全員**
4. WebアプリURL をブラウザで開く
5. 表示される **JSON を丸ごとコピー**して送ってください(チャット貼付 or リポジトリへコミット)

→ 確認できること: **`/watch/` ページから streamingData を直接取得できるか**(= PO token 不要で
GAS 解決が成立するか)。watch も bot-check/ERROR なら = データセンター IP 壁と判定し、
**リゾラの置き場(初期から自宅サーバーへ)の設計判断**に持ち上がる。

### 2. V3 再検証: `v3b-gas-test.gs`(2 分)— **参考(任意・時間がある時)**

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

- **v1c の結果**が届いたら: `docs/research/VERIFICATION_P0.md` に証跡として追記し、
  GAS 期リゾラの可行性を判定する:
  - **watch ページで streamingData OK** → 主経路 = watch 抽出で確定。P00-D(GAS 後端)着手。
  - **全経路 bot-check/ERROR** → データセンター IP 壁 = **設計分岐**(リゾラを初期から
    自宅サーバー(yt-dlp)へ = Phase A のスコープ変更)をユーザーと合意して決定。
- **P00-B/C/E/F**(Next.js スキャフォールド・shared・単一 HTML ビルド・M3 基線)は v1c に
  依存しない = ユーザーの GO 次第で着手可能。
