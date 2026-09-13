/**
 * V1-b(修正版) 検証: GAS から YouTube のストリーム解決ができるか
 *
 * 前回の V1 で判明した問題への対応:
 *  - A: /embed/ ページに `ytInitialPlayerResponse` が無く、`ytInitialPlayerConfig`
 *    (→ args.player_response) に入る可能性 → マーカー級联(両方試す)
 *  - B: playabilityStatus=ERROR の reason が未記録 → 記録 + 複数 client 比較
 *    (WEB_EMBEDDED_PLAYER 旧版 / ページ抽出版 / WEB / ANDROID)
 *
 * 運用方法(前回と同じ):
 * 1. https://script.google.com で「新しいプロジェクト」を作成
 * 2. このファイルを全て貼付(旧プロジェクトの更新ではなく、新規作成推奨)
 * 3. デプロイ → 新しいデプロイ → Web アプリ
 *    - 実行するユーザー: 自分 / アクセスできるユーザー: 全員
 * 4. WebアプリURL をブラウザで開く → JSON が表示される
 * 5. 表示された JSON を丸ごとコピーして開発者に送る
 */

var VIDEO_ID = 'dQw4w9WgXcQ';
var UA_DESKTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36';
var UA_ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Mobile Safari/537.36';

function doGet() {
  var out = { test: 'V1b', video: VIDEO_ID, ts: new Date().toISOString() };
  var pageInfo = fetchEmbedPage();
  out.embedPage = pageInfo;
  out.clients = {};
  var versionFromPage = pageInfo.versionExtracted;
  var key = pageInfo.apiKey;

  var attempts = [
    { id: 'C1_embedded_old', clientName: 'WEB_EMBEDDED_PLAYER', clientVersion: '1.20240701.00.00', ua: UA_DESKTOP },
    { id: 'C2_embedded_pageVer', clientName: 'WEB_EMBEDDED_PLAYER', clientVersion: versionFromPage || '1.20240701.00.00', ua: UA_DESKTOP },
    { id: 'C3_web_pageVer', clientName: 'WEB', clientVersion: versionFromPage || '2.20240701.00.00', ua: UA_DESKTOP },
    { id: 'C4_android', clientName: 'ANDROID', clientVersion: '19.09.37', ua: UA_ANDROID }
  ];
  for (var i = 0; i < attempts.length; i++) {
    out.clients[attempts[i].id] = playerPost(attempts[i], key);
  }
  return ContentService.createTextOutput(JSON.stringify(out, null, 1))
    .setMimeType('application/json; charset=utf-8');
}

function fetchEmbedPage() {
  var r = { ok: false };
  try {
    var res = UrlFetchApp.fetch('https://www.youtube.com/embed/' + VIDEO_ID, {
      headers: { 'User-Agent': UA_DESKTOP, 'Accept-Language': 'ja,en;q=0.9' },
      muteHttpExceptions: true
    });
    r.httpStatus = res.getResponseCode();
    var html = res.getContentText();
    r.htmlLen = html.length;
    r.htmlHead = html.substring(0, 200);
    r.consentPage = /consent\.youtube\.com|before you continue|同意/i.test(html);
    r.hasMarker_playerResponse = html.indexOf('ytInitialPlayerResponse') >= 0;
    r.hasMarker_playerConfig = html.indexOf('ytInitialPlayerConfig') >= 0;

    // マーカー級联: ytInitialPlayerResponse → ytInitialPlayerConfig(args.player_response)
    var d = null;
    if (r.hasMarker_playerResponse) {
      r.markerUsed = 'ytInitialPlayerResponse';
      d = JSON.parse(extractJson(html, 'ytInitialPlayerResponse'));
    } else if (r.hasMarker_playerConfig) {
      r.markerUsed = 'ytInitialPlayerConfig';
      var cfg = JSON.parse(extractJson(html, 'ytInitialPlayerConfig'));
      d = (cfg.args && cfg.args.player_response) || cfg.player_response || cfg;
    }
    if (d) {
      r.playability = d.playabilityStatus ? d.playabilityStatus.status : null;
      r.reason = d.playabilityStatus ? (d.playabilityStatus.reason || null) : null;
      var sd = d.streamingData || {};
      var formats = (sd.formats || []).concat(sd.adaptiveFormats || []);
      r.formatCount = formats.length;
      r.itags = formats.map(function (f) { return String(f.itag) + ':' + (f.qualityLabel || f.audioQuality || '?'); });
      r.has1080 = formats.some(function (f) { return f.qualityLabel === '1080p'; });
      r.has140 = formats.some(function (f) { return String(f.itag) === '140'; });
      var withUrl = formats.filter(function (f) { return f.url; });
      r.sampleUrl = withUrl.length ? withUrl[0].url.substring(0, 120) : null;
    }

    // API キー + ページ上の clientVersion 抽出
    var km = html.match(/INNERTUBE_API_KEY["']?\s*[:=]\s*["']([A-Za-z0-9_-]{30,})["']/);
    r.apiKey = km ? km[1] : null;
    var vm = html.match(/\b\d+\.\d{8}\.\d{2}\.\d{2}\b/);
    r.versionExtracted = vm ? vm[0] : null;
    r.ok = !!(d && d.playabilityStatus && d.playabilityStatus.status === 'OK' && r.formatCount > 0);
  } catch (e) {
    r.error = String(e);
  }
  return r;
}

function playerPost(attempt, key) {
  var r = { ok: false, clientName: attempt.clientName, clientVersion: attempt.clientVersion };
  try {
    if (!key) throw new Error('INNERTUBE_API_KEY なし(embed ページから抽出失敗)');
    var body = {
      context: { client: {
        clientName: attempt.clientName,
        clientVersion: attempt.clientVersion,
        hl: 'ja', gl: 'JP'
      } },
      videoId: VIDEO_ID,
      contentCheckOk: true,
      racyCheckOk: true
    };
    if (attempt.clientName === 'ANDROID') {
      body.context.client.androidSdkVersion = 34;
    }
    var res = UrlFetchApp.fetch('https://www.youtube.com/youtubei/v1/player?key=' + key, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(body),
      headers: { 'User-Agent': attempt.ua },
      muteHttpExceptions: true
    });
    r.httpStatus = res.getResponseCode();
    var d = JSON.parse(res.getContentText());
    r.playability = d.playabilityStatus ? d.playabilityStatus.status : null;
    r.reason = d.playabilityStatus ? (d.playabilityStatus.reason || null) : null;
    if (d.playabilityStatus && d.playabilityStatus.errorScreenPlayerConfig) {
      var sc = d.playabilityStatus.errorScreenPlayerConfig.errorScreenRenderer || {};
      r.errorScreen = sc.reason ? (sc.reason.simpleText || (sc.reason.runs || [])[0] || '') : null;
    }
    var sd = d.streamingData || {};
    var formats = (sd.formats || []).concat(sd.adaptiveFormats || []);
    r.formatCount = formats.length;
    r.has1080 = formats.some(function (f) { return f.qualityLabel === '1080p'; });
    r.has140 = formats.some(function (f) { return String(f.itag) === '140'; });
    var withUrl = formats.filter(function (f) { return f.url; });
    r.sampleUrl = withUrl.length ? withUrl[0].url.substring(0, 120) : null;
    r.ok = r.playability === 'OK' && formats.length > 0;
  } catch (e) {
    r.error = String(e);
  }
  return r;
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
