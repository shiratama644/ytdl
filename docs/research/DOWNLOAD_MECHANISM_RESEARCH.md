# 調査: ダウンロード機構(StreamSaver / 直リンク / 進捗表示)の技術的制約と方式比較

> 依頼(2026-09-13, ユーザー): 「直リンクのみ、StreamSaver.js 等のストリーミングダウンロード機構を利用、
> ダウンロードは進捗などの表記は可能なはず。それらを調べてください」
> 関連: VERIFICATION_P0.md(V2: fetch 全 NG / <video> OK)、PHASE0_PLAN.md §10.8(ダウンロード設計)

---

## 0. 結論(要約)

| 組み合わせ | 成立? | 理由 |
|---|---|---|
| **googlevideo 直リンク + StreamSaver.js** | ❌ **技術的に不可能** | StreamSaver の機構は **SW + `fetch()` + ReadableStream + respondWith**。`fetch` がレスポンス本文を読み取れることが前提。googlevideo.com は `Access-Control-Allow-Origin` を返さないため、ブラウザの fetch は必ず CORS で遮断される(本検証 V2 実測 + 第三者的証拠 §1) |
| **googlevideo 直リンク + ページ内進捗表示** | ❌ 不可 | 直リンク(`<a href>`)はナビゲーションで、ページ JS が転送に関与できない → ページ内での進捗%/速度/キャンセルは原理的に取得できない。CORS 付き fetch のない限り進捗UIは成立しない |
| **ダウンロード専用・オンデマンド relay(再生時なし)+ StreamSaver + 進捗** | ✅ **成立** | サーバーが**ダウンロードのときだけ** googlevideo バイトを中継(サーバー側 fetch は CORS 非対象)。クライアントは自社サーバー(CORS 許可)から fetch → StreamSaver + 完全な進捗UI(%/速度/キャンセル/レジューム)。Invidious(`local=true` proxy) / Piped(proxy mode)が**まさにこの理由で**実装している実在パターン |
| **サーバー側 mux バッチジョブ + 完成ファイル配信 + StreamSaver + 進捗** | ✅ 成立 | サーバーが yt-dlp でダウンロード+mux(再エンコードなし)→ 完成ファイルを自社サーバーから配信(Range/Content-Length/ACAO)→ クライアントは StreamSaver + 進捗。ファイルは永続化・再DL可能 |
| **直リンクのみ(サーバー負荷ゼロ)** | ✅ 成立(縮小機能) | ブラウザネイティブの保存のみ。進捗UI/ファイル名/キュー/形式選択は不可(§3) |

**→ 「直リンクのみ + StreamSaver + 進捗」の完全同時成立は不可能。
ただし「再生経路でサーバー負荷ゼロ」を維持したまま「StreamSaver + 進捗」を得るのは可能 =
"サーバーはダウンロードのときだけ関与"(relay か mux バッチ)。**

---

## 1. StreamSaver.js の機構(何を要求するか)

出典: StreamSaver.js 公式 README / ソース / GitHub issues

- **機構**: Service Worker が特殊な URL への fetch を `respondWith()` で傍受し、
  ページ側が `fetch(url).then(res => res.body.pipeTo(createWriteStream(filename, size)))`
  のように**ストリームをパイプする**。SW がディスクに直接書き込む(メモリに巨大 Blob を保持しない
  = 本プロジェクト設計原則 2 と一致)。
  - 必要な部品: **SW + fetch(streaming response body)+ ReadableStream + WritableStream + respondWith**
  - 公式文書: 「the only solution is to create a service worker that can intercept links and use respondWith()」
- **進捗表示の仕組み**:
  - `createWriteStream(filename, size)` の `size` を渡すと、SW が傍受レスポンスの
    **`Content-Length` ヘッダとして使用**する → ブラウザのネイティブ DL UI に進捗が出る
  - ページ内の自前 UI も可能: fetch 本文のチャンク数をカウント(総量は Content-Length か
    各ストリームの `clen`(googlevideo URL のパスに `clen/<bytes>` として含まれる))で % / 速度 / ETA 算出
  - GitHub issue #152(Download progress)が `size: res.headers.get('Content-Length')` 渡しの実装例
- **キャンセル / レジューム**: `writer.abort()` で即キャンセル。レジュームはソースが
  `Range` をサポートしている場合のみ(= 自社サーバー配信なら完全サポート)
- **ブラウザ対応(公式)**:
  | ブラウザ | 対応 | 欠落 |
  |---|---|---|
  | Chrome / Edge(Chromium) / Opera / Samsung Internet / Android Chrome | ✅ | - |
  | Safari | ❌ | SW の streams |
  | Firefox | ❌ | streams |
  → **StreamSaver は実質 Chromium 系のみ**。`supported` フラグで検出し、Safari/Firefox は
  必ずフォールバックが必要(= 直リンク / Blob)。iOS は StreamSaver 不可 = iOS フォールバック
  設計(720p muxed 直リンク)が確定要件になる。

## 2. googlevideo.com の CORS 実態(証拠)

1. **本検証 V2(ユーザー Android 実測)**: 同一 URL で `<video>` 再生 OK / `fetch()` は
   全て `TypeError: Failed to fetch`(muxed 全体・Range・videoOnly)。
   = メディア要素(CORS 非対象)は通るが、CORS 対象の fetch は不通 → ACAO 欠如の典型。
2. **第三者的実証(Piped)**: Piped の実運用 issue(#3211)に、`https://...googlevideo.com/videoplayback/...`
   へのブラウザ fetch が **"No 'Access-Control-Allow-Origin' header is present on the requested
   resource"** でブロックされた記録がそのまま存在。
3. **業界の実務**: Invidious は `/videoplayback?host=...&local=true`(プロキシモード)、
   Piped は別ドメインの proxy(`pipedproxy-*.example`、nginx で `/videoplayback` を中継)を
   用意している。= **「googlevideo をブラウザが直接 fetch できない」は周知の制約で、
   大規模 OSS 実装は全てサーバー側中継で解決している**。
4. 付随事象(中継実装上の注意):
   - **Range なしの中継は Google 側でスロットリングされる**(Invidious issue #3302:
     プロキシ側が Range ヘッダ付きでチャンク分割取得するのが定石)
   - 中継は **host を googlevideo 系に whitelist 限定**する必要がある(任意 URL 中継は
     オープンプロキシ化 = 既知の脆弱性、Invidious issue #1605)
   - ストリーム URL の `required.httpHeaders` に**カスタム User-Agent** が含まれる場合がある。
     ブラウザ fetch は UA を上書きできないが、**サーバー側中継は指定どおりの UA を送れる**
     = 中継経路は required-headers 要件にも強制的に対応できる(再生 <video> は不要だった: V2 実測)

## 3. 「直リンクのみ」で何ができて何ができないか

`<a href="https://...googlevideo.../videoplayback...">` をクリックした場合:

| 機能 | 可否 | 根拠 |
|---|---|---|
| ブラウザネイティブの保存(モバイル: メディアビューから「動画を保存」/ シェア→ファイル) | ✅(OS/ブラウザ依存の UX) | 端末のメディア処理が受け持つ |
| デスクトップでの保存 | ⚠️(タブが開いて動画再生 → 右クリック等で保存) | 以下 |
| `download` 属性によるファイル名制御 | ❌ **クロスオリジンは無効化** | Chrome 65+: ファイル名ヒントを破棄(一部 MIME はナビゲーション経路で完全ブロック)/ Firefox・Safari: 属性を完全に無視してナビゲート。根拠: 同名ポリシー上「他オリジンのファイル名書き換えは特権操作」だから |
| **ページ内進捗 UI( % / 速度 / ETA / キャンセル)** | ❌ **原理的に不可** | ページ JS が転送に関与しない(ナビゲーション)。進捗UI は fetch(本文チャンク計数)のみで成立 |
| キュー管理・並列 DL・形式/品質選択(webm 等) | ❌(= 機能自体が存在しない) | DL の制御自体がブラウザネイティブに委譲されるため |
| レジューム | ❌(ブラウザ実装依存) | ページ側で制御不能 |

→ **直リンクは「縮小機能」でしかなかった**: 進捗/ファイル名/キュー/形式選択のいずれも
ページから制御できない。ユーザー要望「StreamSaver + 進捗表示」とは両立しない。

## 4. 達成可能な方式(いずれも「サーバーはダウンロード時のみ関与、再生経路は googlevideo 直 = 負荷ゼロ」)

### 方式 A: ダウンロード専用・オンデマンド relay + クライアント側 mux(= 当初設計の通り)

```
[再生] ブラウザ <video> ──直──> googlevideo          (サーバー関与ゼロ・常時)
[DL ] ブラウザ fetch ──> 自社サーバー /dl?src=... ──fetch(RequiredUA+Range)──> googlevideo
       (ACAO / Content-Length / Content-Disposition 付き返却)
       → mp4-muxer / webm-muxer(Web Worker, 再エンコードなし)→ StreamSaver → ディスク
```

- **前提の成立**: 自社サーバーは自社管理のヘッダを全部つけられる(ACAO / Content-Length /
  Content-Disposition: attachment; filename=... / Accept-Ranges)。クライアント fetch は通る。
- **得られる UX**: StreamSaver(メモリ非保持)✅ / ページ内進捗( % = 受信バイト / 総量
  (各ストリームの clen の合計・relay の Content-Length))✅ / 速度・ETA ✅ / キャンセル即効 ✅ /
  レジューム(Range 完全)✅ / 形式(mp4/webm)・品質(144p–4K)・キュー・並列 ✅
- **サーバー負荷**: バイトポンプのみ(再エンコード・mux なし=低 CPU)、ディスク不使用(ストリーミング)、
  **ダウンロード発生時のみ**。常時プロキシ(再生中継)ではない。
- **実装上の注意(§2-4)**: upstream 取得は Range チャンク付き(スロットリング回避)、
  host whitelist(googlevideo 限定)、required UA ヘッダ適用、`expire` 失効時の再解決。
- **既知の先行例**: Invidious `local=true` / Piped proxy = 全く同じ仕組み・同じ動機。

### 方式 B: サーバー側 mux バッチジョブ + 完成ファイル配信

```
[DL ] クライアントのキュー(Dexie)→ 自社サーバー /jobs
       → yt-dlp でダウンロード + mux(再エンコードなし、mp4/webm)→ ディスクに完成ファイル
       → Nginx 配信(静的 / Range / Content-Length / ACAO / Content-Disposition)
       → クライアントは完成ファイルを fetch → StreamSaver(または通常 DL)→ 進捗UI
```

- **得られる UX**: 進捗(完成ファイルの Content-Length が確定で判る=最も正確)✅ /
  レジューム(静的 Range=完璧)✅ / StreamSaver ✅ / 形式・品質・キュー ✅
- **サーバー負荷**: ダウンロード発生時のみだが、**mux CPU + ディスク I/O + ファイル永続化**
  が方式 A より重い(ファイルは再 DL / 共有用に使えるのが利点)
- クライアントの mux 処理が不要になる(ブラウザ CPU 負荷ゼロ)が、当初設計の
  「クライアント側 mp4-muxer + StreamSaver」は退場する。

### 方式 C: 直リンクのみ(§3)

- サーバー負荷ゼロ。UX は §3 の縮小機能(進捗UI なし / ファイル名制御なし / ブラウザネイティブ保存)。
- iOS / Firefox のフォールバックとしては全方式で必要(§1 の StreamSaver 非対応)。

### 方式 A / B / C 比較

| | A: relay+クライアントmux | B: サーバーmuxバッチ | C: 直リンク |
|---|---|---|---|
| StreamSaver | ✅ | ✅ | ❌ |
| ページ内進捗( % / 速度) | ✅(clen 推定) | ✅(確定値・最良) | ❌ |
| キャンセル | ✅ 即効 | ⚠️(ジョブ停止は要実装) | ❌ |
| レジューム | ✅(Range) | ✅(静的 Range・最良) | ❌ |
| 形式/品質(144p–4K・mp4/webm) | ✅(ブラウザ側mux) | ✅(yt-dlp) | ❌(URL 固定) |
| サーバー負荷(毎 DL) | 低(バイトポンプのみ) | 中(+mux CPU+ディスク) | **ゼロ** |
| サーバーの常時負荷 | **ゼロ**(再生は直) | **ゼロ**(再生は直) | **ゼロ** |
| 当初設計(原則 2/3)との整合 | **最高**(クライアントmux・再エンコードなし) | 高い(mux はサーバー側) | 低い(機能縮小) |
| 実装の先例 | Invidious/Piped(大規模実証済み) | 一般的な self-host | - |

## 5. フェーズ別の提案

| フェーズ | DL 方式 | 備考 |
|---|---|---|
| **GAS 期(MVP)** | **方式 C(720p 以下 muxed 直リンク)** | GAS の ContentService はバイナリ/ストリーミング不向き(バッファ・サイズ上限・実行時間)のため、relay も mux も非現実的。モバイルはブラウザネイティブ保存で実用級 |
| **自宅サーバー期** | **方式 A(主)** + 方式 B(フォールバック/補完) | A = 当初設計どおり「クライアント mux + StreamSaver + 進捗」、サーバーは低負荷のバイトポンプ( DL 時のみ)。B = A で不安定になった場合(bot チェック・PO トークン等)に yt-dlp 経由で完成ファイルを渡す補完経路。C = iOS/Firefox 向けのフォールバック(全方式共通で必要) |

---

## 6. 決定記録

- **自宅サーバー期 DL 主方式 = A 主 + B フォールバック(ユーザー選択、2026-09-13)**:
  - **A(主)**: DL 専用オンデマンド relay(`/dl`) + クライアント側 mux(mp4-muxer/webm-muxer・Web Worker・再エンコードなし) + StreamSaver(SW は自ドメイン) + 進捗UI(% / 速度 / ETA / キャンセル / レジューム)
  - **B(フォールバック)**: A が不安定になった場合(bot チェック / PO token 等)→ yt-dlp バッチ(ダウンロード+mux) + 完成ファイル配信(Nginx・Range)
  - **C(全環境共通フォールバック)**: 720p 以下 muxed 直リンク = **GAS 期の DL 方式** + iOS / Firefox(StreamSaver 非対応)
  - **再生経路**: 全フェーズで googlevideo 直(サーバー関与ゼロ)。**relay はダウンロード時のみに限定(再生には一切使用しない)= ユーザーの常設制約(2026-09-13 再確認)**
  - **リゾラ**: siatube.com API は使用せず **youtubei.js で自前実装**(同日のユーザー判断。GAS 期 = 本調査の方式 A/C と独立して成立する解決経路)
  → `PHASE0_PLAN.md` §10.2 / §10.6(`/dl` エンドポイント) / §10.8 / §10.10 と `task-list.md` に反映済み。
