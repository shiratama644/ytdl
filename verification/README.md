# 検証キット(Phase 0 着手前)

設計原則「ブラウザからの直接取得可否を検証した上で利用する」の実施計画。
計画書: [`../docs/planning/PHASE0_PLAN.md`](../docs/planning/PHASE0_PLAN.md)(§10.8 検証リスト V1〜V5。2026-09-23 更新)
結果記録: [`../docs/research/VERIFICATION_P0.md`](../docs/research/VERIFICATION_P0.md)
生結果: [`Verification-Results.md`](Verification-Results.md)(**1 ファイル = 最新の結果のみ**運用・現在は v1f の JSON。旧ラウンドは git 履歴 + VERIFICATION_P0.md に残る)

> **状態(2026-09-23 更新)**: **方針転換(再生 = iframe 一本 / 動画 DL = 保留・実装対象外)** により、旧スコープの検証キット(V1〜V4)は**完了または保留の確定**となり、**新しく V5 を実行していただきます**(下記・現行スコープで必須)。
> V1〜V4 の実行手順は**記録として保持**(V3-b / V4 = 保留項目の参考。V1 = 完了した証跡 = `/watch/` ページ抽出は現行のメタデータ解決で使用)。旧スコープの検証項目を新規に増やす予定はありません。

## ⏭ 次に実行するもの(2026-09-23 追加・現行スコープで必須): V5

> 仕様 = [`../docs/HANDOVER.md`](../docs/HANDOVER.md) §8.1 / 結果の記録先 = [`Verification-Results.md`](Verification-Results.md)(1 ファイル = 最新のみ)。
> 判定結果は [VERIFICATION_P0.md §V5](../docs/research/VERIFICATION_P0.md) と計画書 §10.8 に反映します。

### 1. キット①(ブラウザで開く): [`v5-browser-iframe-test.html`](v5-browser-iframe-test.html) — 3〜5 分

1. ファイルを **PC のブラウザ**(Chrome 推奨。ローカルファイルで動作します)で開く
2. **まず** URL の末尾に `?probe=1` を付けて開く → 自己診断の JSON(`"probe":true` を含む)が出れば**最新版**
   (出ない場合はページの表示内容をそのまま送ってください)
3. `?probe` なしで開き、表示される 3 つの枠を確認する:
   - **枠 A = V5-1**: `youtubeeducation.com` の埋め込みが**描画・再生できるか**(しあTube の既定方式)
   - **枠 B = V5-2**: 公式 embed(`www.youtube-nocookie.com`)が**描画・再生できるか**(差し替え候補)
   - **枠 C = V5-3**: 埋め込み先から **Player API(`https://www.youtube.com/iframe_api`)を直接読めるか**
     (= 再生位置の制御・終了検知ができるか)
4. **V5-5(目視)**: 枠 A / 枠 B の各動画について ① 広告(全画面・オーバーレイ)の有無 ② 画質メニューの内容
   ③ ログイン要求の有無 を、その下の入力欄で選ぶ
5. 画面下部の「**結果をコピー**」を押して、その文字列を**そのまま送付**(チャット貼付 or [`Verification-Results.md`](Verification-Results.md) へコミット)

> **可能であれば**: 学校・職場の**フィルタが有効なネットワーク**で実行してください(到達性の確認が目的のため、
> その環境の結果が最も重要です)。自宅回線では「正常に再生できる」ことの確認になります。

### 2. キット②(GAS): [`v5b-gas-test.gs`](v5b-gas-test.gs) — 1 回 ~10 秒

1. [script.google.com](https://script.google.com) で「**新しいプロジェクト**」→ `v5b-gas-test.gs` の中身を**全て貼付**
2. **デプロイ → 新しいデプロイ → Web アプリ** / 実行: **自分** / アクセス: **全員**
3. **まず** URL の末尾に `?probe=1` を付けて開く → `{"test":"V5b","probe":true,...}` が出れば**最新版**
4. `?test=trend` を**1 回だけ**開く → トレンド抽出(V5-4 の前半)の JSON が返る
5. **10〜30 分空けてから** `?test=search&q=<任意のキーワード>` を**1 回だけ**開く → 検索結果抽出(V5-4 の後半)の JSON
   (`q` を省略した場合は既定キーワードを使用。日本語キーワードを URL エンコードして渡しても構いません)
   - **1 回の実行 = YouTube への fetch 1 回**(数秒で返ります)。**リロード・再クリックはしないでください**(429 = O9 の原因)
   - `429` の JSON が出た場合は、その JSON を送った上で **10〜30 分待ってからもう 1 回だけ**開き直してください
6. 表示された **JSON を丸ごとコピー**して送付

→ 結果が届き次第 **V5-4 の可否を判定**します(NG の場合は検索・トレンド機能を保留 = 計画書 R11、ユーザーに確認)。

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

## 第 2 回・第 3 回結果と第 4 回キット(v1d)の由来

1. **V1 / v1b(第 2 回・実行済み・コミット `c53eddb`)**: **全 client 失敗** —
   C1/C2(WEB_EMBEDDED_PLAYER、最新 version 2.20260911.01.00)= `ERROR「この動画は再生できません」` /
   C3(WEB)= `UNPLAYABLE` / C4(ANDROID)= `HTTP 400`。
   version 陳腐化は排除。embed ページ自体は 200/131KB で実取得可(制限は `/player` 単位)
   → **データセンター IP + PO token/visitorData 欠如の疑い**。
   → **第 3 回 `v1c`**: **`/watch/` ページの `ytInitialPlayerResponse` 抽出を主経路に**
   (PO token 不要の可能性)+ `/player` 改善(visitorData+playbackContext)+
   playabilityStatus 詳細(messages)記録 + bot チェック自動検知。
2. **V1 / v1c(第 3 回・実行済み・コミット `bf513ab`・生データ `verification/v1c-res.md`)**:
   **キット側の抽出バグ 2 点で未了**(= ユーザー環境・YouTube 側の問題ではない) —
   - **陽性シグナル**: `/watch/` ページは **200 / 718KB(ja-JP)で取得成功** +
     `ytInitialPlayerResponse` マーカー存在 + consent でも botCheck でもない
     → **データセンター IP 壁は確定していない**。
   - バグ①: マーカーの初回出現が `WIZ_global_data` 内の別構文に命中 → 不正な `{ … }` 領域を
     JSON.parse 失敗("Expected property name or '}' in JSON at position 1")。
   - バグ②: API キー抽出の正規表現が新形式 `ytcfg.setINNERTUBE_API_KEY('...')` に非マッチ
     → `/player` 改善版テストが全スキップ。
   → **第 4 回 `v1d`**: 抽出のみ修正。代入文 `ytInitialPlayerResponse = {` を正規表現で**全候補列挙**
   → バランス切片 → JSON.parse → 実レスポンス判定(偽出現は自動スキップ・敵対的モック検証済み)+
   API キー/バージョンの新形式対応(3 段 fallback)+ 他は v1c と同じ測定。
3. **V1 / v1d(第 4 回・実行済み・コミット `37b3b94`)**: **✅ 成功 = GAS 解決が成立** —
   - **watchPage(desktop & mobile)**: playability=OK / formats 30 種 / 1080p(137)+ audio(140) /
     videoTitle 正しい** → 本番リゾラ = **`/watch/` ページの `ytInitialPlayerResponse` 抽出**
     (Invidious 同型)で確定。**アーキ分岐(リゾラを初期から自宅サーバーへ)= 不採用**。
   - `/player` エンドポイントは依然 dead(ERROR / UNPLAYABLE / ANDROID 400)= 使わない。
   - **残る未確認事項**: 30 形式すべてに **`url` フィールドが無い**(sampleUrl=null)
     → ストリーム URL が `signatureCipher`/`ciphertext` として提供されている場合
     P00-D に復号機構が必要になる = 設計が変わる。
   → **第 5 回 `v1e`**(最小キット・~30 秒): watch 1 回 fetch で **formats のフィールド構成**
     (`url` / `signatureCipher` / `ciphertext` / `streamingUrl` の存在 + 先頭 1 形式のサンプル)を記録。
4. **V3 / v3b**: 実行未了。DL 設計確定(GAS 期 = 直リンク)により**参考レベルに降格**
   (PWA/オフライン機能の判断材料)。任意。

## (旧スコープ)第 6 回: ユーザー側で実行していただくもの — 記録(2026-09-23 以降に実行する必要はありません)

> **すべて「新しい GAS プロジェクト」でお願いします**(旧プロジェクトのデプロイは
> 旧バージョンを配信し続けるため)。ファイルは**必ず下記の raw URL から取得**してください
> (手元の古いコピーは v1c の抽出バグ or setMimeType 例外になります: 過去に複数回発生)。

### 1. V1 残確認(第 6 回): `v1f-gas-test.gs` — **✅ 完了(2026-09-15)**

> **v1d で GAS 解決は成立しました**(watch ページから playability OK / 30 形式 / 1080p 取得成功)。
> 残るは **ストリーム URL の提供形式**の確認 1 点です: v1d の 30 形式すべてに `url` フィールドが
> 無く、`signatureCipher`(復号が必要な形式)かもしれない。これだけで P00-D(GAS 後端)の
> 設計が変わるため、最小キットで確認します。
>
> **⚠️ 試行 1 = HTTP 429 / 試行 2(リトライ内蔵版) = 「どれだけ待っても表示されない」でした**
> (= 私の設計ミス: キット内リトライで 1 回の実行が最大 90 秒以上・フィードバックなし。
> 429 の間は fetch 自体が応答しにくいため長待ちになった)。
> → **v1f で再設計**: ① **`?probe=1` の即返り自己チェック**(YouTube を叩かない = いつでも安全)
> ② **1 回の実行 = 1 回だけ fetch(数秒で必ず JSON 返り)** ③ 429 なら**外部でリトライ**
> (閉じて 10〜30 分待って 1 回だけ開き直す)。

1. [v1f-gas-test.gs (raw)](https://raw.githubusercontent.com/shiratama644/ytdl/<セッション固定ブランチ>/verification/v1f-gas-test.gs)
   = ブランチ名は `git branch --show-current` で確認(過去セッションのブランチ名は記録しない = HANDOVER §10)
   を開いて中身を**全てコピー**
2. [script.google.com](https://script.google.com) で「新しいプロジェクト」→ 貼付
   **自己チェック**: `doGet()` の最後の行が
   `.setMimeType(ContentService.MimeType.JSON);`(**列挙型**)になっていること
   (文字列 `'application/json...'` が出ていたら古い版=使わないで)
3. **デプロイ → 新しいデプロイ → Web アプリ** / 実行: **自分** / アクセス: **全員**
4. **まず** WebアプリURL の末尾に `?probe=1` を付けて開く
   → 数秒で `{"test":"V1f","probe":true,"ok":true,...}` が出れば**デプロイは最新**
   (出なければ、そのページの内容をそのまま送ってください = デプロイの問題)
5. **前回の実行から 10〜30 分空けてから**、WebアプリURL(`?probe` なし)を**1 回だけ**開く
   → **数秒(〜10 秒)で JSON が表示されるはず**
   → **429 の JSON が出たら**: その JSON を送付 + ページを閉じて **10〜30 分待ってから
   もう 1 回だけ**開き直す(その繰り返しで結構です)
   **⚠️ 開いた後のリロード・再クリックはしないでください**(1 回 = YouTube への fetch 1 回)
6. 表示される **JSON を丸ごとコピー**して送ってください(チャット貼付 or リポジトリへコミット)

**結果(コミット `6143012`)**: ✅ **全 30 形式 = `signatureCipher`**(`url`=0 / `ciphertext`=0 /
`streamingUrl`=0)。`signatureCipher` = `s=<暗号化シグネチャ>&sp=sig&url=<URL エンコード済みの
videoplayback URL>`(base URL には `expire`/`ei`/`ip=` が已含む)→ **復号が必要**
(youtube-dlp 型の transform 逆変換)。

→ **V1(GAS 解決)= ✅ 全項目完了**。Phase A リゾラ = **watch ページ抽出 + signature
decipherer + O9**(リトライ+バックオフ / キャッシュ / single-flight)で確定 =
**P00-D 着手可**(冒頭 = 復号済み URL の fetch 実動作スパイク)。
(副産物: 429 体験は **O9** として記録済み。)

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

- **次 = V5(2026-09-23 追加・現行スコープで必須)**: V5-1/V5-2 で**既定プレイヤーの提供元を決定**(`youtubeeducation.com` を第一候補とし、不可なら公式 embed)/
  V5-3 で**再生制御(位置・終了検知)の実装可否** / V5-4 で**検索・トレンド機能の可否** / V5-5 で **UI の注意書き**を確定。
- **旧スコープの整備状況**(参考): **V1 = 完了**(`/watch/` ページ抽出 = **メタデータ解決として現行でも使用**。signature decipherer / ストリーム URL 解決は**保留**) /
  **V2 = 完了・判定確定**(直リンク再生の保留に伴い参照情報) / **V3-b・V4 = 保留項目の参考**(DL 再開時に参照)。
- 現行スコープの実装仕様 = [`../docs/HANDOVER.md`](../docs/HANDOVER.md) §8.2(P00-D = メタデータ解決)/
  [`../docs/planning/PHASE0_PLAN.md`](../docs/planning/PHASE0_PLAN.md) §10.7(再生 = iframe)。
