/**
 * V3 検証: GAS ページから Service Worker を登録できるか (StreamSaver 経路の成立可否)
 *
 * 運用方法:
 * 1. https://script.google.com で「新しいプロジェクト」を作成
 * 2. このファイルを全て貼付
 * 3. デプロイ → 新しいデプロイ → Web アプリ
 *    - 実行するユーザー: 自分
 *    - アクセスできるユーザー: 全員
 * 4. WebアプリURL をブラウザで開く → 画面のテキストを丸ごとコピーして開発者に送る
 *
 * 検証するもの:
 *  - doGet のクエリディスパッチ (?_sw=1) で application/javascript を返せるか
 *  - ブラウザがそれを Service Worker スクリプトとして登録できるか
 *  - scope がページをカバーするか
 */

function doGet(e) {
  if (e && e.parameter && e.parameter._sw === '1') {
    return ContentService.createTextOutput(SW_CODE)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(PAGE_HTML)
    .setMimeType(ContentService.MimeType.HTML);
}

var SW_CODE = [
  '/* v3-test-sw */',
  'self.addEventListener("install", function (e) { self.skipWaiting(); });',
  'self.addEventListener("activate", function (e) { e.waitUntil(self.clients.claim()); });'
].join('\n');

var PAGE_HTML = [
  '<!doctype html><html><head><meta charset="utf-8"></head><body>',
  '<h3>V3: GAS + Service Worker test</h3>',
  '<pre id="out">running…</pre>',
  '<script>',
  '(async () => {',
  '  const L = [];',
  '  const log = (s) => L.push(s);',
  '  log("ts: " + new Date().toISOString());',
  '  log("origin: " + location.origin);',
  '  log("href: " + location.href);',
  '  log("topLevel: " + (window.top === window));',
  '  log("swAvailable: " + ("serviceWorker" in navigator));',
  '  try {',
  '    const swUrl = location.href.split("?")[0] + "?_sw=1";',
  '    const r = await fetch(swUrl);',
  '    log("swFetchStatus: " + r.status);',
  '    log("swContentType: " + r.headers.get("content-type"));',
  '    const body = (await r.text()).slice(0, 40);',
  '    log("swBodyHead: " + body);',
  '    const reg = await navigator.serviceWorker.register(swUrl);',
  '    log("registerOK: true");',
  '    log("scope: " + reg.scope);',
  '    const ctrl = await Promise.race([',
  '      navigator.serviceWorker.ready.then(() => "ready"),',
  '      new Promise((res) => setTimeout(() => res("timeout-5s"), 5000))',
  '    ]);',
  '    log("ready: " + ctrl);',
  '  } catch (err) {',
  '    log("FAILED: " + (err && err.message ? err.message : String(err)));',
  '  }',
  '  document.getElementById("out").textContent = L.join("\\n");',
  '})();',
  '</script></body></html>'
].join('\n');
