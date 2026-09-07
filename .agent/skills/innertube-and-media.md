# Skill: Innertube & Media

> `youtubei.js`（Innertube）取得・シリアライズ・動画プレイヤー（video.js / dashjs）・プロキシ。

## Innertube 取得（`lib/innertube.ts`）

- `getInnertube()` をシングルトンで使い回す。`youtubei.js` の Innertube クライアントを返す。
- Route Handler からはこの関数の戻り値を使って `getInfo` / `getComments` / `search` / `getHome` 等を呼ぶ。
- データレスポンスは `any` / `unknown` の生ノードとして返り、`lib/serialize.ts` でアプリ型へ変換する。

## 動画再生（video.js）

- `components/player/VideoPlayer.tsx` が video.js ラッパー。
- **video.js 本体と `videojs-contrib-dash` はブラウザ実行時（`useEffect` 内）に動的 import**。SSR（Node）では `window` を参照するためモジュール評価不可。
- `manifestUrl` は DASH（`/api/dash/[videoId]`）または HLS（ライブ `/api/live/[videoId]`）。
- `qualityOptions` から画質選択（`setAutoSwitchQuality` / `setQualityFor` を dash 経由で制御）。
- `isLive` 時は LIVE バッジを表示し、`liveui: true` を渡す。

## Dash ストリーミング（`app/api/dash/[videoId]`）

- `videojs-contrib-dash` が `dashjs` を透過的に使う。ダウンロードはクライアント側で DASH セグメントを取得する設計。

## プロキシ（`app/api/proxy`）

- バイナリ/ストリームをプロキシする Route Handler。SSRF 対策の `isAllowed`（内部関数）で対象 URL を制限する（**エクスポートされていない**）。
- Range リクエスト対応。動画・サムネイル・画像の中継に使う。

## ダウンロード（`lib/download-queue.ts` / `lib/ffmpeg.ts`）

- `DownloadQueue` は p-queue ベース。`create()` で `videoId` と itag（`videoItag` / `audioItag`）を指定し、映像・音声の URL を `getInfo` から取得。
- 状態機械: `queued → downloading-video / downloading-audio → muxing → done | error | cancelled`。
- `muxAVWithFfmpeg`（`lib/ffmpeg.ts`）で映像＋音声を多重化。`ffmpeg-static` のバイナリを使う。
- 進捗は `subscribe(id)` で購読し、クライアントへ SSE でプッシュ。
- **設計**: クライアントは itag を選んで送るだけで、サーバー側（`lib/download-queue.ts`）がフォーマットを解決する。itag はハードコードしない。

## 注意点

- `app/api/proxy/route.ts` の `isAllowed` はエクスポートされていないため、直接ユニットテストできない。可能なら関数をエクスポートするか、公開 API 経由でテストする。
- `video.js` は SSR で使えないため、ユニットテストでは jsdom + モックが必要。
