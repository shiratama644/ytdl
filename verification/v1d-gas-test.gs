/**
 * V1-d 検証: GAS から YouTube のストリーム解決ができるか(第 4 版・抽出バグ修正)
 *
 * v1c(第 3 回)の結果:
 *  - /watch/ ページは **200 / 718KB で正常取得**(consent でも bot チェックでもなく /
 *    ytInitialPlayerResponse マーカー存在) → **データセンター IP 壁は確定していない**
 *  - だが私の抽出が 2 つのバグで失敗(= ユーザー環境の問題ではない):
 *    ① マーカー `ytInitialPlayerResponse` の「初回出現位置」が WIZ_global_data 内の
 *       別の構文に命中 → 誤った { … } 領域を切り出して JSON.parse 失敗
 *       ("Expected property name or '}' in JSON at position 1")
 *    ② API キー抽出の正規表現が新形式 `ytcfg.setINNERTUBE_API_KEY('AIza...')` に
 *       非マッチ → /player 改善版テストが全スキップ
 * → v1d は抽出のみを修正し、同じ測定を実施:
 *  1. 主経路候補: /watch/ ページから `ytInitialPlayerResponse` を直接抽出
 *     (desktop UA + mobile UA 2 種)。**PO token を通さない別経路**
 *  2. 補助: /player POST を visitorData + playbackContext + userAgent 付きで
 *     (C2b embedded / C3b WEB / C4b ANDROID=アプリ UA)
 *  3. playabilityStatus の messages 配列を全部記録 + bot チェック / consent 自動検知
 *
 * 判定の見通し:
 *  - watchPage(または Mobile)の playability=OK かつ formatCount>0 → **GAS 解決成立**(主経路=watch 抽出)
 *  - 全経路が ERROR/UNPLAYABLE 且つ bot チェック検出 → **データセンター IP 壁** =
 *    リゾラの置き場を再検討(= 設計上の分岐点、ユーザーと合意して決定)
 *
 * 運用方法:
 * 1. https://script.google.com で「新しいプロジェクト」を作成(旧プロジェクトの更新NG)
 * 2. このファイルを全て貼付
 * 3. デプロイ → 新しいデプロイ → Web アプリ / 実行: 自分 / アクセス: 全員
 * 4. WebアプリURL をブラウザで開く → JSON が表示される
 * 5. 表示された JSON を丸ごとコピーして送る(チャット貼付 or リポジトリコミット)
 */

var VIDEO_ID = 'dQw4w9WgXcQ';
var UA_DESKTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
var UA_MOBILE = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36';
var UA_ANDROID_APP = 'com.google.android.youtube/19.09.37 (Linux; U; Android 14) gzip';

/* ---------- ユーティリティ ---------- */

/**
 * ブレケット(中括弧/角括弧)のバランスで JSON オブジェクトを切り出す。
 * start は '{' の位置。文字列内の " \ { } を正しく扱う。
 */
function balancedSlice(html, start) {
  var depth = 0, inStr = false, esc = false;
  for (var i = start; i < html.length; i++) {
    var ch = html[i];
    if (inStr) {
      if (esc) { esc = false; }
      else if (ch === '\\') { esc = true; }
      else if (ch === '"') { inStr = false; }
    } else {
      if (ch === '"') { inStr = true; }
      else if (ch === '{' || ch === '[') { depth++; }
      else if (ch === '}' || ch === ']') {
        depth--;
        if (depth === 0) return html.slice(start, i + 1);
      }
    }
  }
  return null;
}

/**
 * v1d 修正①: 「マーカーの初回出現」ではなく**代入文そのもの** `ytInitialPlayerResponse = {`
 * を正規表現で列挙し、各候補からバランス切片 → JSON.parse → 実プレイヤーレスポンスか検証
 * (playabilityStatus / streamingData / videoDetails のいずれか必須)。
 * 先頭の WIZ_global_data 内の擬似出現(= 不正 JSON / 検証不能)は自動的にスキップされる。
 */
function extractPlayerResponse(html) {
  var re = /ytInitialPlayerResponse\s*=\s*\{/g;
  var m, attempts = 0, lastErr = null;
  while ((m = re.exec(html)) !== null) {
    attempts++;
    var start = m.index + m[0].length - 1; // '{' の位置
    var blob = balancedSlice(html, start);
    if (!blob) continue;
    try {
      var obj = JSON.parse(blob);
      if (obj && (obj.playabilityStatus || obj.streamingData || obj.videoDetails)) {
        return { obj: obj, attempts: attempts, blobLen: blob.length };
      }
    } catch (e) {
      lastErr = String(e);
    }
  }
  return { obj: null, attempts: attempts, blobLen: 0, lastErr: lastErr };
}

/**
 * v1d 修正②: API キー抽出を新形式対応。
 * 優先度: setINNERTUBE_API_KEY('...') → INNERTUBE_API_KEY: "..." →
 *         公開キー fallback(v1b で embed ページから抽出に成功した実績あり)
 */
function extractApiKey(html) {
  var pats = [
    { re: /setINNERTUBE_API_KEY\(\s*['"]([A-Za-z0-9_\-]{20,})['"]/, src: 'setINNERTUBE_API_KEY' },
    { re: /INNERTUBE_API_KEY['"]?\s*[:=]\s*['"]([A-Za-z0-9_\-]{20,})['"]/, src: 'INNERTUBE_API_KEY-colon' }
  ];
  for (var i = 0; i < pats.length; i++) {
    var m = html.match(pats[i].re);
    if (m) return { key: m[1], src: pats[i].src };
  }
  return { key: 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8', src: 'fallback-public(v1b proven)' };
}

/** clientVersion 抽出(旧: ytcfg / 新: setINNERTUBE_CONTEXT_CLIENT_VERSION 両対応) */
function extractVersion(html) {
  var m = html.match(/INNERTUBE_CONTEXT_CLIENT_VERSION['"]?\s*[:=]\s*['"]([^'"]+)['"]/);
  if (!m) m = html.match(/setINNERTUBE_CONTEXT_CLIENT_VERSION\(\s*['"]([^'"]+)['"]/);
  return m ? m[1] : null;
}

/** visitorData を生成(YouTube の実装を模した擬似 random base64) */
function genVisitorData() {
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.';
  var b = '';
  for (var i = 0; i < 19; i++) b += chars.charAt(Math.floor(Math.random() * chars.length));
  b += '-';
  for (var j = 0; j < 19; j++) b += chars.charAt(Math.floor(Math.random() * chars.length));
  // b64encode(16 random bytes + 20 base64 chars) の簡易近似
  var bin = '';
  for (var k = 0; k < 16; k++) bin += String.fromCharCode(Math.floor(Math.random() * 256));
  var b64 = Utilities.base64Encode(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return b64 + b;
}

/** playabilityStatus の messages 配列を文字列化(runs[].text を連結) */
function flattenMessages(ps) {
  if (!ps || !ps.messages) return null;
  var out = [];
  for (var i = 0; i < ps.messages.length; i++) {
    var msg = ps.messages[i];
    if (msg && msg.runs) {
      var t = '';
      for (var j = 0; j < msg.runs.length; j++) t += msg.runs[j].text;
      out.push(t);
    }
  }
  return out.length ? out : null;
}

/* ---------- 主経路: /watch/ ページ抽出 ---------- */

function fetchWatchPage(ua) {
  var url = 'https://www.youtube.com/watch?v=' + VIDEO_ID + '&hl=ja&gl=JP';
  try {
    var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true, headers: { 'User-Agent': ua, 'Accept-Language': 'ja-JP,ja;q=0.9' } });
    return { code: res.getResponseCode(), html: res.getContentText() };
  } catch (e) {
    return { code: -1, html: null, error: String(e) };
  }
}

function testWatchPage(uaLabel, ua) {
  var r = { ok: false, ua: uaLabel };
  var wp = fetchWatchPage(ua);
  r.httpStatus = wp.code;
  if (wp.html === null) { r.error = wp.error; return r; }
  r.htmlLen = wp.html.length;
  r.htmlHead = wp.html.slice(0, 200);
  r.consentPage = /consent\.youtube\.com|consent\.google/.test(wp.html.slice(0, 3000));
  r.botCheck = /Sign in to confirm|confirm you're not a bot|unusual traffic|Enable JavaScript/.test(wp.html);
  r.hasMarker_playerResponse = wp.html.indexOf('ytInitialPlayerResponse') !== -1;

  var x = extractPlayerResponse(wp.html);
  r.extractAttempts = x.attempts;
  r.extractBlobLen = x.blobLen;
  if (!x.obj) {
    r.error = 'player response 抽出失敗(attempts=' + x.attempts + (x.lastErr ? '; lastErr=' + x.lastErr : '') + ')';
    return r;
  }
  var obj = x.obj;
  var ps = obj.playabilityStatus || {};
  var formats = ((obj.streamingData || {}).formats) || [];
  var adaptive = ((obj.streamingData || {}).adaptiveFormats) || [];
  r.ok = true;
  r.playability = ps.status || 'ABSENT';
  r.reason = ps.reason || null;
  r.messages = flattenMessages(ps);
  r.errorScreen = ps.errorScreen || null;
  r.videoTitle = (obj.videoDetails || {}).title || null;
  r.formatCount = formats.length + adaptive.length;
  var itags = [];
  var all = formats.concat(adaptive);
  for (var i = 0; i < all.length; i++) {
    if (all[i] && all[i].itag) itags.push(all[i].itag);
  }
  r.itags = itags;
  r.has1080 = itags.indexOf(137) !== -1 || itags.indexOf(108) !== -1 || itags.indexOf(303) !== -1;
  r.has140 = itags.indexOf(140) !== -1;
  // サンプル URL(署名確認・後続テスト用)
  r.sampleUrl = null;
  for (var k = 0; k < all.length; k++) {
    if (all[k] && all[k].url && all[k].url.indexOf('https://') === 0) { r.sampleUrl = all[k].url.slice(0, 160) + '...'; break; }
  }
  // 派生: version / apiKey は watch ページから
  r.version = extractVersion(wp.html);
  var key = extractApiKey(wp.html);
  r.apiKey = key.key;
  r.apiKeySrc = key.src;
  return r;
}

/* ---------- 補助: /player POST(改善版) ---------- */

function playerPost(key, clientName, clientVersion, ua, extra) {
  var r = { ok: false, clientName: clientName, clientVersion: clientVersion };
  if (!key) { r.error = 'INNERTUBE_API_KEY なし'; return r; }
  var context = {
    client: {
      clientName: clientName,
      clientVersion: clientVersion,
      hl: 'ja', gl: 'JP'
    }
  };
  if (extra && extra.client) {
    for (var k in extra.client) context.client[k] = extra.client[k];
  }
  var body = {
    context: context,
    videoId: VIDEO_ID,
    playbackContext: { audioQuality: 'HIGH_QUALITY' }
  };
  if (ua) body.context.client.userAgent = ua;
  if (extra && extra.visitorData) body.context.client.visitorData = extra.visitorData;
  var url = 'https://www.youtube.com/youtubei/v1/player?key=' + key;
  try {
    var res = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      headers: ua ? { 'User-Agent': ua } : {},
      payload: JSON.stringify(body),
      muteHttpExceptions: true
    });
    r.httpStatus = res.getResponseCode();
    var json = null;
    try { json = JSON.parse(res.getContentText()); } catch (e) { r.error = 'invalid JSON: ' + String(e); return r; }
    if (!json || json.error) { r.error = (json && json.error && json.error.message) || ('HTTP ' + res.getResponseCode()); return r; }
    var ps = json.playabilityStatus || {};
    var formats = ((json.streamingData || {}).formats) || [];
    var adaptive = ((json.streamingData || {}).adaptiveFormats) || [];
    r.ok = true;
    r.playability = ps.status || 'ABSENT';
    r.reason = ps.reason || null;
    r.messages = flattenMessages(ps);
    r.formatCount = formats.length + adaptive.length;
    var itags = [];
    var all = formats.concat(adaptive);
    for (var i = 0; i < all.length; i++) if (all[i] && all[i].itag) itags.push(all[i].itag);
    r.itags = itags;
    r.has1080 = itags.indexOf(137) !== -1 || itags.indexOf(108) !== -1 || itags.indexOf(303) !== -1;
    r.has140 = itags.indexOf(140) !== -1;
    r.sampleUrl = null;
    for (var q = 0; q < all.length; q++) {
      if (all[q] && all[q].url && all[q].url.indexOf('https://') === 0) { r.sampleUrl = all[q].url.slice(0, 160) + '...'; break; }
    }
    return r;
  } catch (e) {
    r.error = String(e);
    return r;
  }
}

/* ---------- エントリポイント ---------- */

function doGet() {
  var out = {
    test: 'V1d',
    video: VIDEO_ID,
    ts: new Date().toISOString(),
    watchPage: null,
    watchPageMobile: null,
    players: {}
  };
  try {
    out.watchPage = testWatchPage('desktop', UA_DESKTOP);
    out.watchPageMobile = testWatchPage('mobile', UA_MOBILE);
    // /player 改善版: watch ページから抽出した key/version を使用
    var key = (out.watchPage && out.watchPage.apiKey) || (out.watchPageMobile && out.watchPageMobile.apiKey) || null;
    var version = (out.watchPage && out.watchPage.version) || (out.watchPageMobile && out.watchPageMobile.version) || null;
    var vd = genVisitorData();
    out.players._key = key;
    out.players._keySrc = (out.watchPage && out.watchPage.apiKeySrc) || (out.watchPageMobile && out.watchPageMobile.apiKeySrc) || null;
    out.players._version = version;
    out.players._visitorData = vd;
    out.players.C2b_embedded_ctx = playerPost(key, 'WEB_EMBEDDED_PLAYER', version || '2.20260911.01.00', null, {
      client: { thirdParty: { embedUrl: 'https://www.google.com' }, visitorData: vd },
      visitorData: vd
    });
    out.players.C3b_web_ctx = playerPost(key, 'WEB', version || '2.20260911.01.00', null, {
      client: { visitorData: vd }, visitorData: vd
    });
    out.players.C4b_android_ctx = playerPost(key, 'ANDROID', '19.09.37', UA_ANDROID_APP, {
      client: { osName: 'Android', osVersion: '14', androidSdkVersion: 34, visitorData: vd },
      visitorData: vd
    });
  } catch (e) {
    out.fatal = String(e);
  }
  return ContentService.createTextOutput(JSON.stringify(out, null, 1))
    .setMimeType(ContentService.MimeType.JSON);
}
