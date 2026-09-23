# 検証結果(最新のみ)

> 運用: **1 ファイル = 最新の結果のみ**(過去のラウンドは git 履歴 + [`../docs/research/VERIFICATION_P0.md`](../docs/research/VERIFICATION_P0.md) に残ります)。
> **次にここへ貼るもの = V5 の結果**(2026-09-23 追加): ① [`v5-browser-iframe-test.html`](v5-browser-iframe-test.html) の JSON(V5-1 / V5-2 / V5-3 / V5-5)
> ② [`v5b-gas-test.gs`](v5b-gas-test.gs) の JSON(V5-4 = trend / search)。手順 = [`README.md`](README.md)。
> 以下は現在の内容 = **V1f**(2026-09-15・旧スコープ = `/watch/` ページ抽出のストリーム URL 形式。現行では参照情報)。

## Test Result: V1f

{
 "test": "V1f",
 "kit": "v1f",
 "video": "dQw4w9WgXcQ",
 "ts": "2026-09-15T22:00:00.502Z",
 "fetchMs": 1273,
 "httpStatus": 200,
 "htmlLen": 722675,
 "extractAttempts": 1,
 "playability": "OK",
 "sdKeys": [
  "expiresInSeconds",
  "formats",
  "adaptiveFormats",
  "serverAbrStreamingUrl"
 ],
 "expire": null,
 "formatCount": 30,
 "fieldPresence": {
  "url": {
   "count": 0,
   "firstSample": null
  },
  "signatureCipher": {
   "count": 30,
   "firstSample": "s=NE0OE0AE0s2JYwRAIgZO6fQyU4tYBcq3kdrSGhrMxDTnZOa4udRkNup41IrOgCIBpSApSOxttvDO-FMxCnvkVw2JuQMRj3nSPWzS3tVVu5&sp=sig&url="
  },
  "ciphertext": {
   "count": 0,
   "firstSample": null
  },
  "streamingUrl": {
   "count": 0,
   "firstSample": null
  }
 },
 "f0Keys": [
  "itag",
  "mimeType",
  "bitrate",
  "width",
  "height",
  "lastModified",
  "quality",
  "fps",
  "qualityLabel",
  "projectionType",
  "audioQuality",
  "approxDurationMs",
  "audioSampleRate",
  "audioChannels",
  "signatureCipher",
  "qualityOrdinal"
 ],
 "f0Sample": "{\"itag\":18,\"mimeType\":\"video/mp4; codecs=\\\"avc1.42001E, mp4a.40.2\\\"\",\"bitrate\":444226,\"width\":640,\"height\":360,\"lastModified\":\"1766960953317159\",\"quality\":\"medium\",\"fps\":25,\"qualityLabel\":\"360p\",\"projectionType\":\"RECTANGULAR\",\"audioQuality\":\"AUDIO_QUALITY_LOW\",\"approxDurationMs\":\"213089\",\"audioSampleRate\":\"44100\",\"audioChannels\":2,\"signatureCipher\":\"s=NE0OE0AE0s2JYwRAIgZO6fQyU4tYBcq3kdrSGhrMxDTnZOa4udRkNup41IrOgCIBpSApSOxttvDO-FMxCnvkVw2JuQMRj3nSPWzS3tVVu5&sp=sig&url=https://rr3---sn-nx5e6nle.googlevideo.com/videoplayback%3Fexpire%3D1789531200%26ei%3D4L-pavLJKbyqy_sPi_OmmQk%26ip%3D107.178.203.",
 "a0Keys": [
  "itag",
  "mimeType",
  "bitrate",
  "width",
  "height",
  "initRange",
  "indexRange",
  "lastModified",
  "contentLength",
  "quality",
  "fps",
  "qualityLabel",
  "projectionType",
  "averageBitrate",
  "colorInfo",
  "approxDurationMs",
  "signatureCipher",
  "qualityOrdinal"
 ],
 "a0Sample": "{\"itag\":313,\"mimeType\":\"video/webm; codecs=\\\"vp9\\\"\",\"bitrate\":18076636,\"width\":3840,\"height\":2160,\"initRange\":{\"start\":\"0\",\"end\":\"220\"},\"indexRange\":{\"start\":\"221\",\"end\":\"893\"},\"lastModified\":\"1766963492248817\",\"contentLength\":\"358608461\",\"quality\":\"hd2160\",\"fps\":25,\"qualityLabel\":\"2160p\",\"projectionType\":\"RECTANGULAR\",\"averageBitrate\":13466333,\"colorInfo\":{\"primaries\":\"COLOR_PRIMARIES_BT709\",\"transferCharacteristics\":\"COLOR_TRANSFER_CHARACTERISTICS_BT709\",\"matrixCoefficients\":\"COLOR_MATRIX_COEFFICIENTS_BT709\"},\"approxDurationMs\":\"213040\",\"signatureCipher\":\"s=3E0WE0AE0s2JYwRAIgNWAnnWT5MuMsnON1"
}
