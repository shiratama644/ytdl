# P0 検証証跡(Phase 0 着手前)

> 目的: 設計原則 §10.2-4「ブラウザからの直接取得可否(CORS、Range、URL 有効期限、codec/container 対応等)を検証した上で利用する」を実施する。
> 計画書 §10.9 の検証リスト V1〜V4 に対応。
> 実施日: 2026-09-12(ユーザー名: shiratama644 / 分岐: arena/01a094ec-ytdl)

---

## 0. 検証環境の制約(重要)

本検証はサンドボックス(データセンター IP)から実施したため、**YouTube 系ホストへの直接通信は出口フィルタで遮断**されている:

```
$ curl -sI https://www.youtube.com        → SSL_ERROR_SYSCALL(接続遮断)
$ curl -sI https://siatube.com/health     → SSL_ERROR_SYSCALL
$ git clone https://github.com/...        → 正常(比較)
```

そのため各検証は、**(a) サンドボックスで実施可能な技術検証(実施済み)** と **(b) ユーザー環境(GAS / 実ブラウザ)で実行する検証キット(`verification/` 配下、未実施)** に分かれている。

---

## V1: GAS からストリーム解決できるか

### V1-a: youtubei.js バンドル + Node(GAS V8 同等系)での初期化 — ✅ 実施済み

| 項目 | 結果 |
|---|---|
| youtubei.js バージョン | 18.0.0(npm 最新) |
| esbuild バンドル | `--bundle --platform=node --format=esm` → **1,300,650 bytes** で生成成功 |
| Node | v22.22.3 |
| `Innertube.create({ client: "WEB_EMBEDDED_PLAYER", cache: false })` | 設定は受理され、内部 `_Player.create` が **YouTube への TLS 接続を試みる段階まで到達** |
| 失敗内容 | `Client network socket disconnected before secure TLS connection was established` = **サンドボックスの出口遮断**(設定エラーではない) |

**結論(a)**: youtubei.js は Node 系ランタイムでバンドル・初期化可能。`WEB_EMBEDDED_PLAYER` client は API として受理される。→ GAS V8 での動作は高い確度で期待できる(ただし GAS 固有の挙動は V1-b で確認)。

### V1-b: GAS 実環境での解決 — ⏳ ユーザー実行待ち

キット: `verification/v1-gas-test.gs`(GAS Webアプリ、2 分で実行可)
確認項目:
- `/embed/{id}` から `ytInitialPlayerResponse` を抽出して streamingData を読めるか
- `/youtubei/v1/player` への POST(WEB_EMBEDDED_PLAYER context)が通るか
- **1080p / itag 140(m4a) が存在するか**、URL サンプル

判定基準: `A_embedPage.ok === true` かつ `has1080 === true`。
失敗時の代替: 計画書 §10.9 既定の raw InnerTube フォールバック(キットの B パスがそのままその実装になる)。

---

## V2: ブラウザからの直接取得(CORS / Range / 有効期限 / codec)

### サンドボックスでの試行 — ❌ 判定不能(環境制約)

- 前調査ターンで取得した googlevideo URL(`itag=18`, `expire=1789227370` = 2026-09-12 15:36 UTC)を fetch_page(別経路の取得プロキシ)で GET → **HTTP 500**(プロキシ側のバイナリ/接続問題と推定)
- サンドボックス直接 curl は出口遮断(§0)
- → **実ブラウザでのみ判定可能**(CORS はブラウザの Origin 付きリクエストでのみ正しい結論が出る)

### ユーザー実行: `verification/v2-browser-test.html` — ⏳ 待ち

PC Chrome で「実行」→「結果をコピー」で送付。確認項目:

| テスト | 内容 | 判定基準 |
|---|---|---|
| A | `<video src=googlevideo URL>` 再生(fetch 不经由) | 6 秒以内に `playing` |
| B | `fetch(muxed URL)` 全体 + **ACAO ヘッダ**確認 + 実バイト数 | status 200 + バイト取得(AAO=* なら任意オリジン OK) |
| C | `fetch(Range: bytes=0-1023)` | **status 206** + content-range(= レジューム可能) |
| D1/D2 | videoOnly / audioOnly の fetch(DASH 2 成分 = DL 経路の実体) | 206/200 + バイト |
| E | `expire` パラメータからの残り有効時間 | 60 秒以上 |
| F1-F5 | FSA / SW / MSE / ネイティブ HLS / mp4 能力 + UA 記録 | 記録 |
| codec | muxed / videoOnly / audioOnly の formatId・codec・container | 記録(DL の拡張子行列 §10.8 と突合) |

**設計への影響**: B が NG(AAO なし)なら、GAS 期の DL は「B 相当の fetch が不可」→ 720p 直リンク + P4 relay 依存に縮小。C が NG(206 不可)ならレジューム設計を再考。

---

## V3: GAS ページからの Service Worker 登録(StreamSaver 経路)

### V3-a: HTTP 契約レベル — ✅ 実施済み

GAS の `?_sw=` ディスパッチをローカル Node サーバーで模倣し確認:

```
GET /macros/s/FAKEID/exec        → status=200 content-type=text/html; charset=utf-8
GET /macros/s/FAKEID/exec?_sw=1  → status=200 content-type=application/javascript; charset=utf-8
```

→ 同一パスに HTML と SW スクリプト(JAVASCRIPT MIME)を同居させる方式は HTTP 契約上成立。SW 登録時のスクリプト URL がクエリ付きであること・JS MIME であることはブラウザ仕様の範囲内。

### V3-b: script.google.com 実環境での SW 登録 — ⏳ ユーザー実行待ち(最重要)

キット: `verification/v3-gas-test.gs`。確認項目:
- `?_sw=1` の fetch が `application/javascript` を返すか
- `navigator.serviceWorker.register(...)` が成功するか(**GAS のレスポンス挙動 — キャッシュ・ヘッダ — が SW 登録を壊さないか**)
- `scope` がページ(`/macros/s/<id>/`)をカバーするか

**これが OK なら**: GAS 期でも StreamSaver 経路が成立(設計原則 2 の主経路が維持)。
**NG なら**: FSA 第一のフォールバックに切替(R9)、または P4 早期移行。

---

## V4: iOS Safari の挙動 — ⏳ ユーザー実行待ち(任意)

同じ `v2-browser-test.html` を iOS で開いて実行。確認項目: FSA なしの確認(既知)、SW 登録可否、`<video>` 再生可否、fetch の ACAO 挙動、UA 記録。
→ §10.8 の iOS フォールバック(720p muxed 直リンク)を既定にするかの判定。

---

## 付: 運用上の観察(設計メモ)

| # | 観察 | 設計メモ |
|---|---|---|
| O1 | siatube.com の `/api/stream` を第三者(取得プロキシ IP)から連続で叩くと、2 回目で**空 HTML** が返る(1 回目は正常 JSON) | 中央 API 依存型の既知脆弱性。本プロジェクトは自社 API(自家解決)を第一に設計しており、参照用途での依存はしない(§10.2) |
| O2 | 取得した stream URL の `expire` は解決時刻から**約 6.1 時間**(`mt=1789205323` → `expire=1789227370`) | DL キューの「URL 失効前までに処理する」前提に使用。キュー待ち長時間放置時の再解決トリガーの閾値に使用 |
| O3 | ストリーム URL の `ip=118.151.202.141`(解決サーバーの IP)は、異なる IP からの取得可否が未判定(O1 で実測不能) | V2 の A/B/C が異なる IP(ユーザー環境)から実行されるため、結果は「他 IP 取得可否」の第一データになる |

---

## 状態サマリ

| ID | 状態 | 次アクション |
|---|---|---|
| V1-a | ✅ 完了(サンドボックス) | - |
| V1-b | ⏳ 待ち | `verification/v1-gas-test.gs` を GAS で実行し JSON を送付 |
| V2 | ⏳ 待ち | `verification/v2-browser-test.html` を PC Chrome で実行し結果を送付 |
| V3-a | ✅ 完了(サンドボックス) | - |
| V3-b | ⏳ 待ち(最重要) | `verification/v3-gas-test.gs` を GAS で実行し画面テキストを送付 |
| V4 | ⏳ 待ち(任意) | 同一 HTML を iOS で実行 |
