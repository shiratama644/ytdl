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

### V1-b(第 2 回・試行 2) — ❌ 全 client 失敗(データ取得・分析済み)

実行: ユーザー / 2026-09-13T21:55:16Z / 結果は `verification/Verification-Results.md`
(コミット `c53eddb`)に記録済み。

**embedPage**: HTTP 200 / 131,516 B / **実ページ**(consent ではない)だが
**`ytInitialPlayerResponse` も `ytInitialPlayerConfig` も不在**。
`INNERTUBE_API_KEY` 抽出 OK(`AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8`)+
**`versionExtracted = 2.20260911.01.00`**(実行 3 日前の最新 build = version 陳腐化ではない)。

| client | clientVersion | 結果 |
|---|---|---|
| C1 WEB_EMBEDDED_PLAYER(旧ハードコード) | 1.20240701.00.00 | **ERROR** / reason「この動画は再生できません」/ formats 0 |
| C2 WEB_EMBEDDED_PLAYER(ページ最新 ver) | 2.20260911.01.00 | **ERROR** / 同上 / formats 0 |
| C3 WEB(ページ最新 ver) | 2.20260911.01.00 | **UNPLAYABLE** /「動画を再生できません」/ formats 0 |
| C4 ANDROID | 19.09.37 | **HTTP 400**(playability 応答自体なし=リクエスト形状の拒否) |

**解釈:**
1. **version 陳腐化は排除**(C2 が最新 2.20260911.01.00 でも ERROR)。
2. reason は**汎用メッセージ**で「Sign in to confirm you're not a bot」ではない
   → 典型的な**ソフトな制限パターン**: GAS の出口 = **Google データセンター IP** への
   InnerTube `/player` への制限(PO token / visitorData / playbackContext 等の欠如が
   トリガーとなり得る)。
3. **重要な陽性シグナル**: embed ページ自体は 200/131KB の実 HTML を返している
   → GAS の IP は youtube.com に到達可能。**制限は `/player` エンドポイント単位**。
4. **embed ページは player response をインラインしない**(= キーと version のだけある
   「シェル」)→ 解決経路は `/player` POST か、**`/watch/` ページの
   `ytInitialPlayerResponse`(インラインで入るのが通常)**のどちらか。
5. C4 の 400 = ANDROID リクエストの形状問題(別の修正が必要)。

**判定: GAS での自社解決は現時点で未成立(全 client)。**
次の一手 = **v1c キット**(① **`/watch/` ページからの `ytInitialPlayerResponse` 抽出を主経路に**
= PO token 不要の可能性が高い / ② `/player` POST を visitorData + playbackContext 付きで改善 /
③ playabilityStatus 全体(errorScreen・messages)を記録 / ④ bot チェックページの検知)。
- **watch ページが streamingData を返せば** → GAS 解決は成立(PO token 不要)。
- **watch ページも bot-check/ERROR なら** → データセンター IP 壁と判定。
  → **アーキテクチャ分岐: リゾラの置き場を再検討**(GAS 期にリゾラを持たせない =
  初期から自宅サーバー(yt-dlp・residential IP)が解決源 / Phase A のスコープ変更)。
  これは D2(自前解決)は維持したまま「どこで実行するか」の変更なので、ユーザーと合意する。

### V1-c(第 3 回・試行 1) — ⚠️ キット側の抽出バグ(YouTube 側は陽性シグナル取得済み)

実行: ユーザー / 2026-09-13T22:51Z / 生データ: `verification/v1c-res.md`(コミット `bf513ab`)

| 経路 | httpStatus | 結果 |
|---|---|---|
| **watchPage(desktop)** | **200** / 718,271B / lang=ja-JP | `ytInitialPlayerResponse` **マーカー存在** / consent=false / botCheck=false / **抽出失敗 = キットバグ(O8)** |
| watchPageMobile | **200** / 709,084B | 同上(同じバグで抽出失敗) |
| players C2b/C3b/C4b | — | **全スキップ**(API キー抽出の正規表現が新形式 `setINNERTUBE_API_KEY(...)` に非マッチ → キー取得失敗) |

**キットバグ 2 点(私の実装ミス = ユーザー環境・YouTube 側の問題ではない):**
1. **O8-① マーカーの初回出現誤認**: `ytInitialPlayerResponse` という文字列はページ先頭の
   `WIZ_global_data` 等の別構文にも含まれ、「初回出現の直後の `=` → 最初の `{`」からの
   バランス走査が**不正な領域**(JS オブジェクトリテラル・JSON として無効)を切り出した
   → `SyntaxError: Expected property name or '}' in JSON at position 1`。
2. **O8-② API キー抽出の非マッチ**: 新版 watch ページは
   `ytcfg.setINNERTUBE_API_KEY('AIza...')` 形式。旧 `INNERTUBE_API_KEY:` 形式の正規表現が
   非マッチ → `/player` 改善版テストが未実施。

**解釈(重要な陽性シグナル):**
1. **`/watch/` ページは GAS から完全に取得可能**(200 / 718KB / 本物の ja-JP ページ /
   consent でも bot-check でもない)= **データセンター IP 壁は確定していない**。
   (v1b との違い: embed ページは player response の「シェル」だったに対し、
   **watch ページは `ytInitialPlayerResponse` を含んでいる** = 主経路候補が有力)
2. 残る課題は**ページ内 JSON の抽出精度**だけ。→ **v1d キット**(抽出のみ修正):
   - 代入文 `ytInitialPlayerResponse = {` を正規表現で**全候補列挙** → バランス切片 →
     JSON.parse → `playabilityStatus/streamingData/videoDetails` を持つ実レスポンスを採用
     (先頭の偽出現は自動的にスキップ = 敵対的モックで再現検証済み)
   - API キー抽出を新形式対応(`setINNERTUBE_API_KEY(...)`)+ 公開キー fallback(v1b 実績)
   - clientVersion も新形式対応
3. **アーキ分岐(IP 壁 → リゾラを初期から自宅サーバーへ)は保留**。v1d で
   playability が取れて初めて判定する。

**判定: 未了(キット再実行へ)。P00-D ゲートは v1d の結果に。**

### V1-d(第 4 回) — ✅ **成功: GAS 解決が成立(主経路 = `/watch/` ページ抽出)**

実行: ユーザー / 2026-09-14T12:11Z / 生データ: `verification/Verification-Results.md`(コミット `37b3b94`)

| 経路 | 結果 |
|---|---|
| **watchPage(desktop)** | **playability=OK** / 200・676,330B・ja-JP / 抽出 1 回目で成功(blob 48,406B)/ **formats 30 種** / **has1080(137)= true / has140 = true** / videoTitle 正しい |
| **watchPageMobile** | **playability=OK** / 200・720,412B / 抽出 1 回目成功(blob 93,445B)/ formats 30 種・同上 |
| players C2b(embedded+ctx) | **ERROR**「この動画は再生できません」(=/player は依然 dead) |
| players C3b(WEB+ctx) | **UNPLAYABLE**「動画を再生できません」 |
| players C4b(ANDROID+アプリ UA) | **HTTP 400**「Precondition check failed.」 |

**取得した itags(30)**: 18(360p muxed MP4)/ 133〜137(H.264 DASH 240p〜1080p)/ 160・140・249〜251
(audio)/ 394〜399(VP9)/ 400・401・242〜248・271・278・313・598〜600(AV1 系)/
**注意: itag 22・37(mp4 720p/1080p muxed)= なし** → muxed 直リンクは **itag 18(360p)のみ**。
version = 2.20260911.00.00 / API キーはページから抽出に成功(ページは `"INNERTUBE_API_KEY":"..."`
クォート付きコロンの形 = v1c の非マッチ原因も確定: 旧正規表現はキー名の直後の `:` を必須だった)。

**解釈:**
1. **GAS 解決 = 成立**。Google データセンター IP からも **watch ページの HTML スクレイピング経路は
   完全に開いている**(playability OK + 完全な形式リスト + 正しいタイトル)。
   一方 `/player` エンドポイントは 3 ラウンド連続で dead → **本番リゾラ = `/watch/` ページの
   `ytInitialPlayerResponse` 抽出**(Invidious と同型)で確定。
2. **アーキテクチャ分岐(リゾラを初期から自宅サーバーへ)= 不採用**。Phase A(GAS 期)の
   設計は有効のまま。
3. **D1(再生)は成立**: H.264 DASH(133〜137)+ audio(140/160/251)で 2 要素 DASH シンクロ再生が
   1080p まで可能(VP9/AV1 もあり)。
4. **D4(DL・GAS 期)の実効範囲 = この動画では muxed 360p(itag 18)のみ**
   (itag 22/37 がレスポンスに無い)。仕様は「720p **以下**」の上限指定なので違反ではないが、
   GAS 期 DL の画質は動画ごとの形式セットに依存 = **高画質 DL(144p〜4K)は Phase B
   (自宅サーバー・yt-dlp)の機能**であることをユーザーに周知する。
5. **残る唯一の未確認事項**: 30 形式すべてに **`url` フィールドが無い**(sampleUrl=null)。
   → ストリーム URL が `signatureCipher` / `ciphertext` として提供されている可能性 =
   その場合 P00-D に**復号機構**(youtubei.js decipherer / PO token 系)が必要になり設計が変わる。
   → **v1e キット**(最小・watch 1 回 fetch で formats のフィールド構成を記録)で確定させる。

**判定: V1-b = ✅ 成立(watch 抽出)。P00-D 着手ゲート = v1e(ストリーム URL 形式の確定)のみ。**

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
| 3 | **GAS 期セルフ解決**(youtubei.js / raw InnerTube) | **ユーザー決定(2026-09-13): youtubei.js による自前実装(siatube.com API は使用しない)**。**v1d(第 4 回)= ✅ 成立**:`/watch/` ページの `ytInitialPlayerResponse` 抽出で **playability OK / formats 30 種 / 1080p+140 取得成功**(desktop・mobile 両方)。**`/player` エンドポイントは 3 ラウンド連続 dead** → 本番リゾラ = **watch ページ抽出**(Invidious 同型)で確定。**アーキ分岐(リゾラを初期から自宅サーバーへ)= 不採用**。**残る未確認事項**: formats に `url` フィールドが無い(sampleUrl=null)→ `signatureCipher`/`ciphertext` 提供の可能性 = P00-D に復号機構要の場合がある → **次 = v1e**(最小キット・フィールド構成の確定) | **v1e 実行待ち** |
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
