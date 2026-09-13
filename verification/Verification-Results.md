v2-browser-test.html
```
API取得(siatube.com) | OK | ok, counts={"total":1161,"muxed":1,"videoOnly":22,"audioOnly":4,"m3u8":0,"manualSubtitles":35,"automaticCaptions":1099,"audioLanguages":1,"m3u8Languages":0,"manualSubtitleLanguages":5,"automaticCaptionLanguages":157}
codec/container(muxed) | OK | 18/avc1.42001E+mp4a.40.2/mp4
codec/container(videoOnly) | OK | 160/avc1.4d400c/mp4_dash
codec/container(audioOnly) | NG | none
URL有効期限(expire) | OK | 21174秒残
A: <video> 再生開始 | ? | 試行中…
A: <video> 再生開始 | OK | playing
B: fetch(muxed 全体) | ? | 試行中…
B: fetch(muxed 全体) | NG | TypeError: Failed to fetch
C: fetch(Range 0-1023) | ? | 試行中…
C: fetch(Range 0-1023) | NG | TypeError: Failed to fetch
D1: fetch(videoOnly) | ? | 試行中…
D1: fetch(videoOnly) | NG | TypeError: Failed to fetch
D2: fetch(audioOnly) | NG | URL なし
F1: File System Access API | ? | あり
F2: Service Worker | ? | あり
F3: MediaSource(MSE) | ? | あり
F4: ネイティブHLS | ? | あり
F5: mp4 再生 | ? | あり
UA | ? | Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/30.0 Chrome/143.0.0.0 Mobile Safari/537.36
UA-Platform | ? | Linux armv81
```

[v1-gas-test.gs](https://script.google.com/macros/s/AKfycbyfLcxmr90ggtN7OkDJyENF89uTaMLiowOEop3Q4hr1uCe135zjkCI7CFkYn39ly67_EQ/exec)
```txt
{
 "test": "V1",
 "video": "dQw4w9WgXcQ",
 "ts": "2026-09-13T04:05:19.674Z",
 "A_embedPage": {
  "ok": false,
  "httpStatus": 200,
  "htmlLen": 131971,
  "error": "Error: marker 未検出: ytInitialPlayerResponse"
 },
 "B_playerPost": {
  "ok": false,
  "key": "AIzaSyAO…",
  "httpStatus": 200,
  "playability": "ERROR",
  "formatCount": 0,
  "has1080": false,
  "sampleUrl": null
 }
}
```

[v3-gas-test.gs](https://script.google.com/macros/s/AKfycbyDNTf5J8W5BevLOGVF-q6Bp4cm7Wopigd517tLfO8jXQSpeus5vR_HB6h2Gw07WabSbQ/exec)
```txt
<!doctype html><html><head><meta charset="utf-8"></head><body>
<h3>V3: GAS + Service Worker test</h3>
<pre id="out">running…</pre>
<script>
(async () => {
  const L = [];
  const log = (s) => L.push(s);
  log("ts: " + new Date().toISOString());
  log("origin: " + location.origin);
  log("href: " + location.href);
  log("topLevel: " + (window.top === window));
  log("swAvailable: " + ("serviceWorker" in navigator));
  try {
    const swUrl = location.href.split("?")[0] + "?_sw=1";
    const r = await fetch(swUrl);
    log("swFetchStatus: " + r.status);
    log("swContentType: " + r.headers.get("content-type"));
    const body = (await r.text()).slice(0, 40);
    log("swBodyHead: " + body);
    const reg = await navigator.serviceWorker.register(swUrl);
    log("registerOK: true");
    log("scope: " + reg.scope);
    const ctrl = await Promise.race([
      navigator.serviceWorker.ready.then(() => "ready"),
      new Promise((res) => setTimeout(() => res("timeout-5s"), 5000))
    ]);
    log("ready: " + ctrl);
  } catch (err) {
    log("FAILED: " + (err && err.message ? err.message : String(err)));
  }
  document.getElementById("out").textContent = L.join("\n");
})();
</script></body></html>

```
