# 検証キット(Phase 0 着手前)

設計原則「ブラウザからの直接取得可否を検証した上で利用する」の実施計画。
計画書: [`../docs/planning/PHASE0_PLAN.md`](../docs/planning/PHASE0_PLAN.md)(§10.9 検証リスト V1〜V4)
結果記録: [`../docs/research/VERIFICATION_P0.md`](../docs/research/VERIFICATION_P0.md)

## サンドボックス側で実施済み(このリポジトリのコミット履歴参照)

| ID | 内容 | 結果 |
|---|---|---|
| V1-a | youtubei.js 18.0.0 を esbuild で Node 向けバンドル(1.3MB)し、`Innertube.create({client:"WEB_EMBEDDED_PLAYER"})` を実行 | ✅ バンドル/ロード/クライアント設定の受入 OK。実際の YouTube 通信はサンドボックスの出口制限で遮断(= 要ユーザー側) |
| V3-a | GAS の `?_sw=` ディスパッチをローカルサーバーで模倣(同一パスで HTML / `application/javascript` 返却) | ✅ HTTP 契約レベルで成立 |
| 付 | siatube.com API の第三者からの繰り返しアクセス観測 | ⚠️ 2 回目以降に空 HTML が返る現象を確認(中央 API の利用可能性リスク) |

## ユーザー側で実行していただくもの(合計 ~5 分)

### 1. V1 実行: `v1-gas-test.gs`(2 分)

1. [script.google.com](https://script.google.com) で「新しいプロジェクト」
2. `v1-gas-test.gs` を**全て貼付**
3. **デプロイ → 新しいデプロイ → Web アプリ** / 実行: **自分** / アクセス: **全員**
4. WebアプリURL をブラウザで開く
5. 表示される **JSON を丸ごとコピー**して送ってください

→ 確認できること: GAS(=Google の出口 IP)から embedded player のストリーム解決が可能か / 1080p が得られるか / InnerTube POST 経路

### 2. V3 実行: `v3-gas-test.gs`(2 分)

同じ手順(`v3-gas-test.gs` を貼付して Web アプリとしてデプロイ)。**別のプロジェクト**で作成してください。
URL を開くと画面にテキストが表示されるので、**それを丸ごとコピー**してください。

→ 確認できること: **script.google.com 上で Service Worker を登録できるか**(StreamSaver 経路の成立可否 = 最重要)

### 3. V2 実行: `v2-browser-test.html`(1 分)

PC の Chrome でファイルを**ダブルクリックして開く** → 「実行」ボタン → 完了したら「結果をコピー」で送ってください。

→ 確認できること: googlevideo の **CORS(ACAO)・Range(206)・<video> 再生・DASH 2 成分の fetch・URL 有効期限・codec/container**

### 4. V4 実行: 同一の `v2-browser-test.html` を iOS(Safari)で開く(任意・時間がある時)

メール/AirDrop/iCloudDrive 等で iPhone に送って開き、「実行」→「結果をコピー」。
iOS は FSA が無く SW の挙動も異なるため、DL フォールバック方針の確定に必要です。

## 結果の使い道

4 つの結果を受領次第、`docs/research/VERIFICATION_P0.md` に証跡として追記し、
設計(再生経路 / DL 経路 / GAS 期と自宅サーバー期の機能分割)を確定します。
