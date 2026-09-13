/**
 * V3-b(修正版) 検証: GAS ページから Service Worker を登録できるか (StreamSaver 経路の成立可否)
 *
 * 前回 V3 で判明した問題への対応:
 *  - ページが Content-Type: text/plain として配信され、HTML として描画されず、
 *    インラインスクリプトが一切実行されなかった(ユーザーが見たのはソース文字列)
 *  - 原因候補: デプロイの MIME 指定が反映されていない(旧デプロイ / 貼付崩れ?)
 *
 * v3b 初回実行(2026-09-13)で判明した GAS の制約:
 *  - setMimeType(String) は**例外**を投げる:
 *    "パラメータ（String）が ContentService.TextOutput.setMimeType のメソッドのシグネチャと一致しません"
 *    = GAS の setMimeType は ContentService.MimeType **列挙型のみ**を受け付ける
 *  → 本ファイルは全て列挙型(MimeType.HTML / JAVASCRIPT / JSON)を使用(修正済み)
 *
 *  → 対策:
 *    1. MIME は ContentService.MimeType 列挙型で指定(文字列リテラルは GAS で無効 = 上記例外)
 *    2. ?probe=1 の JSON ping を追加(= 本デプロイが更新された証拠 + JSON は前回動作確認済み)
 *    3. ページ JS が document.contentType を記録(配信 MIME の自己診断)
 *    4. ページが文字列として表示された場合用の「コンソールコマンド」を画面に常時表示
 *
 * 運用方法:
 * 1. https://script.google.com で「新しいプロジェクト」を作成(旧プロジェクトの流用不可)
 * 2. このファイルを全て貼付
 * 3. デプロイ → 新しいデプロイ → Web アプリ
 *    - 実行するユーザー: 自分 / アクセスできるユーザー: 全員
 *    - 既存デプロイがある場合は「デプロイの管理 → 編集(ペン) → バージョン: 新規バージョン」
 * 4. まず WebアプリURL に "?probe=1" を付けて開く → {"test":"V3b","pageMime":"text/html..."} が出るか確認
 * 5. その後の URL を開く(ページが「描画」されるはず):
 *    - 正常: 結果がボックスに表示される → ボタン or 手動でコピーして送る
 *    - テキストとして見える: 画面下の「コンソールコマンド」を DevTools コンソールに貼る → コンソール出力を送る
 */

function doGet(e) {
  if (e && e.parameter) {
    if (e.parameter._sw === '1') {
      return ContentService.createTextOutput(SW_CODE)
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    if (e.parameter.probe === '1') {
      return ContentService.createTextOutput(JSON.stringify({
        test: 'V3b',
        ts: new Date().toISOString(),
        pageMime: 'text/html; charset=utf-8',
        swMime: 'application/javascript; charset=utf-8',
        note: 'v3b デプロイ確認。次は ?probe なし URL を開くこと。'
      }, null, 1)).setMimeType(ContentService.MimeType.JSON);
    }
  }
  return ContentService.createTextOutput(PAGE_HTML)
    .setMimeType(ContentService.MimeType.HTML);
}

var SW_CODE = [
  '/* v3b-test-sw */',
  'self.addEventListener("install", function (e) { self.skipWaiting(); });',
  'self.addEventListener("activate", function (e) { e.waitUntil(self.clients.claim()); });'
].join('\n');

// コンソール用コマンド(ページがテキストとして表示された場合のフォールバック用)。
// ページのオリジンで実行されるため、?_sw=1 取得・SW 登録ともに same-origin で成立。
var CONSOLE_CMD = [
  '(async () => {',
  '  const u = location.href.split("?")[0] + "?_sw=1";',
  '  const out = [];',
  '  out.push("origin: " + location.origin);',
  '  const r = await fetch(u);',
  '  out.push("swFetchStatus: " + r.status);',
  '  out.push("swContentType: " + r.headers.get("content-type"));',
  '  out.push("swBodyHead: " + (await r.text()).slice(0, 40));',
  '  try {',
  '    const reg = await navigator.serviceWorker.register(u);',
  '    out.push("registerOK: true");',
  '    out.push("scope: " + reg.scope);',
  '    const to = new Promise((s) => { setTimeout(() => s("timeout-5s"), 5000); });',
  '    const readyP = navigator.serviceWorker.ready.then(() => "ready");',
  '    out.push("ready: " + await Promise.race([readyP, to]));',
  '  } catch (err) {',
  '    out.push("FAILED: " + (err && err.message ? err.message : String(err)));',
  '  }',
  '  console.log(out.join("\\n"));',
  '})();'
].join('\n');

var PAGE_HTML = [
  '<!doctype html><html><head><meta charset="utf-8"></head><body>',
  '<h3>V3b: GAS + Service Worker test</h3>',
  '<p id="done" style="display:none;font-size:18px;font-weight:bold;background:#d8f0d8;padding:.6rem">✅ 完了 — 下のボックスをコピーして送ってください</p>',
  '<pre id="out" style="background:#f5f5f5;padding:.8rem;overflow:auto">running…</pre>',
  '<button onclick="copyOut()" style="font-size:15px;padding:.5rem 1rem">結果をコピー</button>',
  '<h4>※ このページが「文字として表示されている」場合</h4>',
  '<p>MIME が text/plain になっています。F12 でコンソールを開き、次を貼り付けて Enter(ページはこのままで OK):</p>',
  '<pre style="background:#eef;padding:.5rem;font-size:11px;word-break:all" id="cmd"></pre>',
  '<script>',
  'document.getElementById("cmd").textContent = ' + JSON.stringify(CONSOLE_CMD) + ';',
  'window.onerror = function (m) { document.getElementById("out").textContent += "\\n[onerror] " + m; };',
  '(async () => {',
  '  const L = [];',
  '  const log = (s) => L.push(s);',
  '  const finish = async () => {',
  '    document.getElementById("out").textContent = L.join("\\n");',
  '    document.getElementById("done").style.display = "block";',
  '    try { await navigator.clipboard.writeText(L.join("\\n")); } catch (e) {}',
  '  };',
  '  const timer = setTimeout(() => { log("WATCHDOG: 15秒経っても未完了 — スクリプトは実行されたがフェッチが停止している可能性"); finish(); }, 15000);',
  '  log("ts: " + new Date().toISOString());',
  '  log("document.contentType: " + document.contentType);',
  '  log("origin: " + location.origin);',
  '  log("href: " + location.href);',
  '  log("topLevel: " + (window.top === window));',
  '  log("swAvailable: " + ("serviceWorker" in navigator));',
  '  try {',
  '    const selfUrl = location.href.split("?")[0];',
  '    const sp = await fetch(selfUrl);',
  '    log("pageFetchStatus: " + sp.status);',
  '    log("pageContentType: " + sp.headers.get("content-type"));',
  '    const swUrl = selfUrl + "?_sw=1";',
  '    const r = await fetch(swUrl);',
  '    log("swFetchStatus: " + r.status);',
  '    log("swContentType: " + r.headers.get("content-type"));',
  '    const body = (await r.text()).slice(0, 40);',
  '    log("swBodyHead: " + body);',
  '    const regs = await navigator.serviceWorker.getRegistrations();',
  '    log("existingRegs: " + regs.length);',
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
  '  clearTimeout(timer);',
  '  await finish();',
  '})();',
  'function copyOut() {',
  '  const t = document.getElementById("out").textContent;',
  '  if (navigator.clipboard) { navigator.clipboard.writeText(t).then(() => alert("コピーしました")); }',
  '  else { window.prompt("手動コピー:", t); }',
  '}',
  '</script></body></html>'
].join('\n');
