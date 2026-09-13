/**
 * V1-c 検証: GAS から YouTube のストリーム解決ができるか(第 3 版)
 *
 * v1b(第 2 回)の結果を受け:
 *  - /embed/ ページは実取得可能(200/131KB)だが player response マーカーが**両方とも不在**
 *  - /player POST は全 client 失敗(最新 clientVersion でも ERROR/UNPLAYABLE、ANDROID は 400)
 *  - version 陳腐化は排除。汎用 reason = データセンター IP + PO token/visitorData 欠如の疑い
 * → v1c は**別経路を先に試す**:
 *  1. 主経路候補: /watch/ ページから `ytInitialPlayerResponse` を直接抽出
 *     (= /player POST を通さない。PO token 不要の可能性がある)
 *  2. 補助: /player POST を **visitorData + playbackContext + userAgent 付き**で改善
 *  3. 補助: /watch/ を **モバイル UA** でも取得( player response が異なる可能性)
 *  4. playabilityStatus の詳細(reason / errorScreen / **messages**)を全部記録
 *     (= 「bot チェックか / その他か」を reason だけでなく messages で判定)
 *  5. bot チェック・consent ページの自動検知
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
 * 5. 表示された JSON を丸ごとコピーして送る
 */

var VIDEO_ID = 'dQw4w9WgXcQ';
var UA_DESKTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36';
var UA_MOBILE = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Mobile Safari/537.36';
var UA_ANDROID_APP = 'com.google.android.youtube/19.09.37 (Linux; U; Android 14) gzip';

function doGet() {
  var out = { test: 'V1c', video: VIDEO_ID, ts: new Date().toISOString() };
  out.watchPage = fetchWatchPage(UA_DESKTOP);
  out.watchPageMobile = fetchWatchPage(UA_MOBILE);

  var vd = genVisitorData();
  var key = out.watchPage.apiKey || out.watchPageMobile.apiKey || out.watchPage.keyFromEmbed;
  var ver = out.watchPage.versionExtracted || out.watchPageMobile.versionExtracted;

  out.players = {
    'C2b_embedded_ctx': playerPost({
      clientName: 'WEB_EMBEDDED_PLAYER',
      clientVersion: ver || '2.20260911.01.00',
      ua: UA_DESKTOP,
      visitorData: vd,
      thirdParty: { embedUrl: 'https://www.youtube.com' }
    }, key),
    'C3b_web_ctx': playerPost({
      clientName: 'WEB',
      clientVersion: ver || '2.20260911.01.00',
      ua: UA_DESKTOP,
      visitorData: vd
    }, key),
    'C4b_android_ctx': playerPost({
      clientName: 'ANDROID',
      clientVersion: '19.09.37',
      ua: UA_ANDROID_APP,
      visitorData: vd,
      android: { sdkVersion: 34, osName: 'Android', osVersion: '14' }
    }, key)
  };
  return ContentService.createTextOutput(JSON.stringify(out, null, 1))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ===== /watch/ ページ取得 + ytInitialPlayerResponse 抽出 ===== */

function fetchWatchPage(ua) {
  var r = { ok: false, ua: ua === UA_DESKTOP ? 'desktop' : 'mobile' };
  try {
    var res = UrlFetchApp.fetch('https://www.youtube.com/watch?v=' + VIDEO_ID, {
      headers: { 'User-Agent': ua, 'Accept-Language': 'ja,en;q=0.9' },
      muteHttpExceptions: true
    });
    r.httpStatus = res.getResponseCode();
    var html = res.getContentText();
    r.htmlLen = html.length;
    r.htmlHead = html.substring(0, 200);
    r.consentPage = /consent\.youtube\.com|before you continue/i.test(html);
    r.botCheck = /please\s+confirm\s+you.?re\s+not\s+a\s+bot|sign\s+in\s+to\s+confirm|captcha|recaptcha|regwatch/i.test(html);
    r.hasMarker_playerResponse = html.indexOf('ytInitialPlayerResponse') >= 0;

    if (r.hasMarker_playerResponse) {
      var d = JSON.parse(extractJson(html, 'ytInitialPlayerResponse'));
      fillPlayerData(r, d);
    } else {
      r.markerUsed = null;
    }

    var km = html.match(/INNERTUBE_API_KEY["']?\s*[:=]\s*["']([A-Za-z0-9_-]{30,})["']/);
    r.apiKey = km ? km[1] : null;
    var vm = html.match(/\b\d+\.\d{8}\.\d{2}\.\d{2}\b/);
    r.versionExtracted = vm ? vm[0] : null;
    r.ok = !!(r.playability === 'OK' && r.formatCount > 0);
  } catch (e) {
    r.error = String(e);
  }
  return r;
}

/* ===== /player POST(改善版: visitorData + playbackContext + userAgent 付き) ===== */

function playerPost(attempt, key) {
  var r = { ok: false, clientName: attempt.clientName, clientVersion: attempt.clientVersion };
  try {
    if (!key) throw new Error('INNERTUBE_API_KEY なし(watch ページから抽出失敗)');
    var client = {
      clientName: attempt.clientName,
      clientVersion: attempt.clientVersion,
      hl: 'ja', gl: 'JP',
      userAgent: attempt.ua,
      visitorData: attempt.visitorData
    };
    if (attempt.android) {
      client.androidSdkVersion = attempt.android.sdkVersion;
      client.osName = attempt.android.osName;
      client.osVersion = attempt.android.osVersion;
    }
    var body = {
      context: { client: client },
      videoId: VIDEO_ID,
      contentCheckOk: true,
      racyCheckOk: true,
      playbackContext: {
        contentPlaybackContext: {
          html5: attempt.clientName !== 'ANDROID',
          audioQuality: 'HIGH'
        }
      }
    };
    if (attempt.thirdParty) body.context.thirdParty = attempt.thirdParty;

    var res = UrlFetchApp.fetch('https://www.youtube.com/youtubei/v1/player?key=' + key, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(body),
      headers: { 'User-Agent': attempt.ua },
      muteHttpExceptions: true
    });
    r.httpStatus = res.getResponseCode();
    var d = JSON.parse(res.getContentText());
    fillPlayerData(r, d);
    r.ok = r.playability === 'OK' && r.formatCount > 0;
  } catch (e) {
    r.error = String(e);
  }
  return r;
}

/* ===== playability / streamingData の記録共通 ===== */

function fillPlayerData(r, d) {
  r.markerUsed = d && d.videoId ? 'from-response' : r.markerUsed;
  if (d && d.playabilityStatus) {
    r.playability = d.playabilityStatus.status;
    r.reason = d.playabilityStatus.reason || null;
    // messages 配列(bot チェック等の詳細が入る)
    if (d.playabilityStatus.messages && d.playabilityStatus.messages.length) {
      var texts = [];
      for (var i = 0; i < d.playabilityStatus.messages.length; i++) {
        var m = d.playabilityStatus.messages[i];
        if (m.simpleText) texts.push(m.simpleText);
        else if (m.runs) {
          var t = '';
          for (var j = 0; j < m.runs.length; j++) t += m.runs[j].text || '';
          if (t) texts.push(t);
        }
      }
      r.messages = texts.join(' | ').substring(0, 400);
    }
    if (d.playabilityStatus.errorScreenPlayerConfig) {
      var sc = d.playabilityStatus.errorScreenPlayerConfig.errorScreenRenderer || {};
      if (sc.reason) {
        r.errorScreen = sc.reason.simpleText || ((sc.reason.runs || [])[0] || '');
      }
    }
  }
  var sd = (d && d.streamingData) || {};
  var formats = (sd.formats || []).concat(sd.adaptiveFormats || []);
  r.formatCount = formats.length;
  r.itags = formats.map(function (f) { return String(f.itag) + ':' + (f.qualityLabel || f.audioQuality || '?'); }).slice(0, 40);
  r.has1080 = formats.some(function (f) { return f.qualityLabel === '1080p'; });
  r.has140 = formats.some(function (f) { return String(f.itag) === '140'; });
  var withUrl = formats.filter(function (f) { return f.url; });
  r.sampleUrl = withUrl.length ? withUrl[0].url.substring(0, 120) : null;
}

/* ===== visitorData 生成(簡易: 16,19 先頭 + 19 バイト乱数の base64) ===== */

function genVisitorData() {
  var bin = String.fromCharCode(16, 19);
  for (var i = 0; i < 19; i++) bin += String.fromCharCode(Math.floor(Math.random() * 256));
  return Utilities.base64Encode(bin);
}

/** marker の直後にある JSON オブジェクトを、波括弧バランスで抽出する */
function extractJson(html, marker) {
  var i = html.indexOf(marker);
  if (i < 0) throw new Error('marker 未検出: ' + marker);
  var start = html.indexOf('{', i);
  var depth = 0, inStr = false, esc = false;
  for (var j = start; j < html.length; j++) {
    var c = html.charAt(j);
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
    } else {
      if (c === '"') inStr = true;
      else if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) return html.substring(start, j + 1);
      }
    }
  }
  throw new Error('JSON 抽出失敗(波括弧が閉じない)');
}
