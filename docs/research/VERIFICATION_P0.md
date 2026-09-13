# P0 検証証跡(Phase 0 着手前)

> 目的: 設計原則 §10.2-4「ブラウザからの直接取得可否(CORS、Range、URL 有効期限、codec/container 対応等)を検証した上で利用する」を実施する。
> 計画書 §10.9 の検証リスト V1〜V4 に対応。
> 実施日: 2026-09-12(ユーザー名: shiratama644 / 分岐: arena/01a094ec-ytdl)
> 第 1 回ユーザー実行結果の記録: 2026-09-13

---

## 0. 検証環境の制約(重要)

本検証はサンドボックス(データセンター IP)から実施したため、**YouTube 系ホストへの直接通信は出口フィルタで遮断**されている:

```
$ curl -sI https://www.youtube.com        → SSL_ERROR_SYSCALL(接続遮断)
$ curl -sI https://siatube.com/health     → SSL_ERROR_SYSCALL
$ git clone https://github.com/...        → 正常(比較)
```

そのため各検証は、**(a) サンドボックスで実施可能な技術検証(実施済み)** と **(b) ユーザー環境(GAS / 実ブラウザ)で実行する検証キット(`verification/` 配下)** に分かれている。

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

**結論(a)**: youtubei.js は Node 系ランタイムでバンドル・初期化可能。`WEB_EMBEDDED_PLAYER` client は API として受理される。

### V1-b(第 1 回): GAS 実環境での解決 — ❌ 失敗(原因特定待ち)

実行: ユーザー / 2026-09-13T04:05:19Z / デプロイ URL `script.google.com/macros/s/AKfycbyfLcxmr90ggtN7OkDJyENF89uTaMLiowOEop3Q4hr1uCe135zjkCI7CFkYn39ly67_EQ/exec`

```json
"A_embedPage": { "ok": false, "httpStatus": 200, "htmlLen": 131971,
  "error": "Error: marker 未検出: ytInitialPlayerResponse" },
"B_playerPost": { "ok": false, "key": "AIzaSyAO…", "httpStatus": 200,
  "playability": "ERROR", "formatCount": 0, "has1080": false, "sampleUrl": null }
```

**所見:**

1. **A: /embed/ ページは取得できている(200 / 131,971 bytes)が `ytInitialPlayerResponse` マーカー不在。**
   ページ長から consent 中間ページではなく実ページと推定。/embed/ ページの player response は
   **`ytInitialPlayerConfig` の `args.player_response`** に入る構造(=/watch/ ページの
   `ytInitialPlayerResponse` とは別物)が有力。→ v1b キットでマーカー級联(両方試行)にして再確認。
2. **B: `INNERTUBE_API_KEY` は embed ページから抽出成功**(`AIzaSyAO…` = WEB 系標準キー)、
   `/youtubei/v1/player` への POST は 200 で応答するが **`playabilityStatus = ERROR` / formats 0**。
   reason は記録していなかった(キットの不足)。
3. 原因候補:
   - (a) `clientVersion: '1.20240701.00.00'`(WEB_EMBEDDED_PLAYER 用ハードコード)が**陳腐化**
   - (b) GAS の出口 = **Google データセンター IP** への bot チェック(= PO トークン壁)
   - (c) context フィールド不足(hl/gl のみで contentCheckOk 等なし)

**v1b(修正版)キット**: `verification/v1b-gas-test.gs`
- A: マーカー級联(`ytInitialPlayerResponse` → `ytInitialPlayerConfig.args.player_response`)+ consent 検知 + htmlHead 記録
- B: 4 client 比較 — `C1_embedded_old`(前回再現) / `C2_embedded_pageVer`(ページから clientVersion 抽出) / `C3_web_pageVer`(WEB client) / `C4_android`(ANDROID 19.09.37、bot チェックに寛容な client として)
- 各 client: `playability` / `reason` / `errorScreen` / `formatCount` / `has1080` / `has140` を記録

**判定(暫定)**: 自社解決(GAS + youtubei.js / raw InnerTube)は**現時点で未成立**。
v1b の結果で「どの client が通るか / bot チェックか version 問題か」を切り分ける。

### V1-b(第 2 回・試行 1) — ❌ 実行前のファイルバージョン不一致(データなし)

実行: ユーザー / 2026-09-14 / デプロイ URL `script.google.com/macros/s/AKfycbz4dxlLUwsEIxyWdQIl3F0zd40dGQCdhc-qC8ZkiPENiH791KOcFia7Qosfzb5viLLK/exec`

```
Exception: パラメータ（String）が ContentService.TextOutput.setMimeType のメソッドの
シグネチャと一致しません。（行 41、ファイル「a.gs」）
```

**解釈**: 行 41 = v1b の `setMimeType` 箇所。例外は **String 引数**に対して出た = ユーザーが
貼付したのが **修正前の v1b(旧コピー)**。リポジトリの最新 v1b は enum 使用済みで
(行 41 = `.setMimeType(ContentService.MimeType.JSON);`)この例外は出ない(リモート raw 確認済み)。
→ **最新版を再取得して再実行**(raw URL + 自己チェック行:
https://raw.githubusercontent.com/shiratama644/ytdl/arena/01a094ec-ytdl/verification/v1b-gas-test.gs)。
実行データは未取得 = V1-b 第 2 回はまだ未実施。

---

## V2: ブラウザからの直接取得(CORS / Range / 有効期限 / codec)

### V2(第 1 回): ユーザー実行 — ⚠️ 部分的に判定(Android 環境で実行)

実行: ユーザー / 2026-09-13 / **SamsungBrowser 30 (Android 10, Chrome 143 core, Linux armv81)**
(指示は PC Chrome だったが、UA 記録から Android 端末での実行と分かる。→ 重要なモバイルデータ点)

| 項目 | 結果 | 判定 |
|---|---|---|
| API 取得(siatube.com) | ok, counts={"total":1161,"muxed":1,"videoOnly":22,"audioOnly":4,"m3u8":0,…} | ✅ |
| codec/container(muxed) | `18/avc1.42001E+mp4a.40.2/mp4`(h264+aac / mp4) | ✅ |
| codec/container(videoOnly) | `160/avc1.4d400c/mp4_dash`(h264 720p / DASH) | ✅ |
| codec/container(audioOnly) | `none`(counts.audioOnly=4 のまま**先頭エントリが null**) | ⚠️ API 形状の癖 |
| URL 有効期限(expire) | **21174 秒残 ≈ 5.9 時間** | ✅(O2 と一致) |
| **A: `<video>` 再生開始** | **playing** | ✅ |
| **B: fetch(muxed 全体)** | **TypeError: Failed to fetch** | ❌ |
| **C: fetch(Range 0-1023)** | **TypeError: Failed to fetch** | ❌ |
| **D1: fetch(videoOnly)** | **TypeError: Failed to fetch** | ❌ |
| D2: fetch(audioOnly) | URL なし(上記の null 癖のため) | - |
| F1: File System Access API | あり | ⚠️ 下記注記 |
| F2: Service Worker | あり | - |
| F3: MediaSource(MSE) | あり | - |
| F4: ネイティブ HLS | あり | ⚠️ 下記注記 |
| F5: mp4 再生 | あり | - |
| UA / Platform | `…SamsungBrowser/30.0 Chrome/143.0.0.0…` / `Linux armv81` | 記録 |

**解釈(現時点での最有力仮説):**

1. **O3 解決(他 IP 取得可否 = 可)**: siatube.com(サーバー IP 118.151.202.141)で解決した URL が、
   ユーザーの Android(別 IP)から `<video>` で**正常再生**した → ストリーム URL は**解決元 IP に
   厳密に縛られていない**(少なくとも再生経路では)。
2. **A=OK かつ B/C/D=Failed to fetch の同時成立 = CORS ブロックの典型パターン。**
   メディア要素(`<video>`)は CORS に拘束されないが、`fetch()` はレスポンスの
   `Access-Control-Allow-Origin` を要求する。同一 URL で A が通る以上、ネットワーク到達性は
   問題なく、**googlevideo.com が ACAO を返していない**ことが最有力(過去に同報告が多数存在)。
   → **「ブラウザから googlevideo を直接 fetch してクライアントで mux → StreamSaver」という
   ダウンロード主経路は、CORS 対策なしでは成立しない**可能性が非常に高い。
3. **注意(未確認点)**: (a) 実行環境が Android(SamsungBrowser)で PC Chrome 未確認、
   (b) ページのオリジン(file:// か等)が記録されていない → v2b で確定させる。
4. **F1(FSA)/F4(ネイティブ HLS)の「あり」は Android としては不自然**(FSA はデスクトップ専用 API、
   ネイティブ HLS は基本的に iOS/Safari のみ)→ 実行環境の混合・もしくは 2026 年型 Chromium の
   機能追加の可能性。v2b は環境ヘッダ(protocol/origin/UA)を先頭に出すため、混入が起きない。
5. **audioOnly 配列に null を含む形状癖**(counts=4 に対し [0]=null)→ v2b は
   `streamUrl` を持つ先頭エントリを採用するよう修正済み。

**v2b(修正版)キット**: `verification/v2b-browser-test.html`(**PC Chrome** で実行のこと)
- 環境ヘッダ(protocol / origin / UA / platform)を先頭に記録
- **T1**: `fetch(cors mode)` — 前回 B と同一
- **T2**: `fetch(no-cors mode)` — **決定的切り分け**: 解決(opaque)= ネットワーク到達 OK かつ
  T1 失敗は CORS / 例外 = ネットワークレベル遮断
- **T3a/b**: 公開 CORS プロキシ(corsproxy.io / allorigins)経由での取得 —
  「**サーバー側 relay なら通る**」= Phase B 自宅サーバー方式の事前実証
- A(`<video>`) / C(Range) / F1-F5 / expire / codec は継続

**判定(暫定)**: 再生経路は確立。fetch 系ダウンロードは **CORS 待ち**(T2/T3 で確定)。

---

## V3: GAS ページからの Service Worker 登録(StreamSaver 経路)

### V3-a: HTTP 契約レベル — ✅ 実施済み

GAS の `?_sw=` ディスパッチをローカル Node サーバーで模倣し確認:

```
GET /macros/s/FAKEID/exec        → status=200 content-type=text/html; charset=utf-8
GET /macros/s/FAKEID/exec?_sw=1  → status=200 content-type=application/javascript; charset=utf-8
```

→ 同一パスに HTML と SW スクリプトを同居させる方式は HTTP 契約上成立。

### V3-b(第 1 回): script.google.com 実環境 — ❌ ページが描画されず(スクリプト未実行)

実行: ユーザー / 2026-09-13 / デプロイ URL `script.google.com/macros/s/AKfycbyDNTf5J8W5BevLOGVF-q6Bp4cm7Wopigd517tLfO8jXQSpeus5vR_HB6h2Gw07WabSbQ/exec`

**ユーザー送付の内容 = ページの HTML ソースそのもの**(`<pre id="out">running…</pre>` のまま、
`<script>` タグ含む)。= ブラウザが HTML を**描画せず、文字列として表示**し、スクリプトが
一切実行されなかった状態と完全に整合する。

**サンドボックスからのリモート確認(2026-09-13):**

| 確認 | 方法 | 結果 |
|---|---|---|
| /exec の本文 | fetch_page(別経路プロキシ) | ページ HTML を返却(ディスパッチ自体は動作) |
| /exec?_sw=1 の本文 | 同上 | SW コード本文を返却(ディスパッチ自体は動作) |
| **/exec のレスポンスヘッダ** | allorigins(サーバー側取得でヘッダ報告) | **`Content-Type: text/plain; charset=utf-8`**, HTTP 200, content_length 1208 |

**結論: ページが `text/plain` として配信されていた**。`createTextOutput()` の既定 MIME が
`text/plain` であるため、MIME 指定がデプロイに反映されていないとこの現象になる。
※ ユーザーの GAS プロジェクト内部からはサンドボックス側では確認できない。

### V3-b(第 2 回: v3b 初回実行) — ❌ ランタイム例外(GAS の新制約を発見)

実行: ユーザー / 2026-09-13 / デプロイ URL `script.google.com/macros/s/AKfycbw8ZWHmctAK9mMXeJkxiMlLXc6DGlnRJLlDckXyYVqVrgH2OG7DGa9SpJasHex5BUY/exec`

```
Exception: パラメータ（String）が ContentService.TextOutput.setMimeType のメソッドの
シグネチャと一致しません。（行 43、ファイル「コード」）
```

**解釈(重要):**
1. v3b は MIME を**文字列リテラル**(`'text/html; charset=utf-8'`)で指定していた → **GAS の
   `ContentService.TextOutput.setMimeType` は `ContentService.MimeType` 列挙型のみを受け付け、
   String は例外**だった(行 43 = 該当箇所と完全一致)。「文字列リテラル化」の対策は誤り =
   **修正済み: 全て enum に戻す**。
2. **逆説的に重要な証拠**: 例外が「行 43」で出た = **ユーザーの新規プロジェクトには v3b のコードが
   忠実にデプロイされ、doGet が実行されていた**。→ 第 1 回 V3 の text/plain は「enum 指定が GAS で
   無効」ではなく、**デプロイバージョンの問題(旧版を配信し続けていた / MIME 行が欠落して既定の
   text/plain になっていた)** と再診断する(enum 指定は V1 の JSON 配信で正常動作した実績あり)。

**v3b(修正版・enum 修正済み)キット**: `verification/v3b-gas-test.gs` — 上記問題への 4 重対策:
1. MIME は **`ContentService.MimeType` 列挙型**で指定(String は GAS で例外 = 第 2 回の発見)
2. **`?probe=1` の JSON ping** — デプロイが v3b 版かを一発で確認可能(JSON 配信は V1 で動作確認済み)
3. ページ JS が **`document.contentType`** を記録(配信 MIME の自己診断)+ self-fetch によるページ自身の content-type 確認
4. **テキスト表示された場合のフォールバック**: 画面に常時表示するコンソールコマンド
   (ページのオリジンで実行されるため SW 取得・登録は same-origin で成立)
+ 結果の自動コピー / `window.onerror` キャプチャ / 15 秒 watchdog

**判定(暫定)**: GAS からの SW 配信は**未確認**(第 1 回: text/plain 配信でテスト自体未実行 /
第 2 回: setMimeType 例外で未実行)。修正済み v3b(enum)の再実行の結果が StreamSaver 経路の
成立可否を決定する。

---

## V4: iOS Safari の挙動 — ⏳ 未実施(任意)

V2 の第 1 回が Android 実行だったため、モバイル側のデータは一部確保済み。
iOS 固有(FSA なし / SW / 再生)の最終確認は `verification/v2-browser-test.html` を iOS で実行。
§10.8 の iOS フォールバック(720p muxed 直リンク)既定化の判定に使用する。

---

## 設計への影響(2026-09-13 に確定した判断を含む)

| # | 事項 | 結論 | 状態 |
|---|---|---|---|
| 1 | **再生経路**(dual `<video>` DASH 直読み) | **成立を確認**(ユーザー環境 Android で playing) | 確定済み(V2 第 1 回 A) |
| 2 | **DL 経路**(fetch → muxer → StreamSaver) | googlevideo 直接 fetch は **CORS で不可**(V2 実測 + 第三者的証拠)。**ユーザー決定(2026-09-13)**: 自宅サーバーは siatube 型の動画全面プロキシにはしない(高負荷のため)。→ **A(DL 専用 relay + クライアント mux + StreamSaver + 進捗UI)主 + B(yt-dlp バッチ + 完成ファイル)フォールバック**(主方式はユーザー選択済み・[DOWNLOAD_MECHANISM_RESEARCH.md §6](DOWNLOAD_MECHANISM_RESEARCH.md))。**relay はダウンロード時のみに限定(再生には一切使用しない=ユーザーの常設制約)**。GAS 期は C(720p 以下直リンク) | 確定済み |
| 3 | **GAS 期セルフ解決**(youtubei.js / raw InnerTube) | **ユーザー決定(2026-09-13): youtubei.js による自前実装(siatube.com API は使用しない)**。第 1 回で playability ERROR(原因未特定)→ v1b が**実装の可行性ゲート**になる。NG だった場合の対策は**自前解決の範囲内**(4 client 比較の結果に応じた client 選択 / version 更新 / PO token 生成等)で対応 | v1b 実行待ち |
| 4 | ~~GAS 期リゾルの代替戦略~~ | **決定(2026-09-13): (b) セルフ解決のみ**。siatube.com API 依存は不採用(第三者依存・O1 の可用性リスクを排除)。shiatube の実測 API 形状は**参考資料**としては残す(応答正規化・PO token の知見) | 確定済み |
| 5 | **GAS からの SW 配信** | DL 設計確定により **GAS 期は StreamSaver 不使用(直リンク)** → V3-b は**参考**(PWA/オフライン機能の判断材料)に降格 | v3b は任意 |

---

## 付: 運用上の観察(設計メモ)

| # | 観察 | 設計メモ |
|---|---|---|
| O1 | siatube.com の `/api/stream` を第三者(取得プロキシ IP)から連続で叩くと、2 回目で**空 HTML** が返る | 中央 API 依存型の既知脆弱性。暫定戦略 4-(a) を採る場合は本プロジェクト側でリトライ / キャッシュを必須とする |
| O2 | ストリーム URL の `expire` は解決時刻から**約 6 時間**(第 1 回実測: 5.9h) | DL キューの「URL 失効前までに処理する」前提・再解決トリガーの閾値に使用 |
| O3 | ~~ストリーム URL の `ip=`(解決サーバー IP)の他 IP 取得可否が未判定~~ | **解決(V2 第 1 回)**: 別 IP(Android 端末)で `<video>` 再生 OK → 再生経路では IP 縛りなし。fetch 経路の他 IP 動作は v2b T3(relay=別 IP)で確認(v2b スキップ判断により未実施 = DL がサーバー側パイプラインになるため非必須) |
| O4 | siatube API の `streams.audioOnly` 配列に **null エントリ**を含む(counts=4 に対し [0]=null) | 本プロジェクトのリゾラ実装時は `streamUrl` 持ちエントリをフィルタして扱う |
| O5 | GAS の `ContentService` 出力が **text/plain で配信された事例**(V3 第 1 回) | 本プロジェクトの GAS 期でも、デプロイの MIME 指定・バージョン管理を厳密に(= v3b 型の `?probe=` ピングを本番コードにも組み込むべき) |
| O6 | ユーザー環境の FSA / ネイティブ HLS「あり」記録が Android UA と矛盾 | 実行環境の混入疑い。v2b はスキップ判断のため、本プロジェクトのブラウザ能力判定は iOS(V4)のみ残る(任意) |
| O7 | GAS `setMimeType` は **`ContentService.MimeType` 列挙型のみ**受け付ける — String は例外を投げる(V3 第 2 回実測: 「パラメータ（String）が ContentService.TextOutput.setMimeType のメソッドのシグネチャと一致しません」) | 本プロジェクトの GAS 実装でも MIME 指定は必ず列挙型で記述する(文字列リテラル禁止) |

---

## 状態サマリ

| ID | 状態 | 次アクション |
|---|---|---|
| V1-a | ✅ 完了(サンドボックス) | - |
| V1-b | ❌ 第 1 回失敗 → 再検証 | **`verification/v1b-gas-test.gs`** を GAS で実行し JSON を送付(※ setMimeType は enum 修正済み) |
| V2 | ⚠️ 第 1 回(Android)部分判定(再生 OK / fetch 全 NG → CORS 最有力) | **ユーザー判断(2026-09-13): v2b 未実施** — DL をサーバー側パイプラインとする設計では、CORS はクライアントが googlevideo 直接 fetch しない限り無関係のため |
| V3-a | ✅ 完了(サンドボックス) | - |
| V3-b | ❌ 第 1 回: text/plain 配信で未実行 / 第 2 回: setMimeType 例外で未実行 | **`verification/v3b-gas-test.gs`(enum 修正版)** を**新しいプロジェクト**で実行(まず `?probe=1` を確認)し結果を送付(**最重要**) |
| V4 | ⏳ 待ち(任意) | 同一 HTML を iOS で実行 |
