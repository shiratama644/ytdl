/**
 * V1 検証: GAS から YouTube のストリーム解決ができるか (WEB_EMBEDDED_PLAYER)
 *
 * 運用方法:
 * 1. https://script.google.com で「新しいプロジェクト」を作成
 * 2. このファイルを全て貼付
 * 3. デプロイ → 新しいデプロイ → Web アプリ
 *    - 実行するユーザー: 自分
 *    - アクセスできるユーザー: 全員
 * 4. WebアプリURL をブラウザで開く → JSON が表示される
 * 5. 表示された JSON を丸ごとコピーして開発者に送る
 *
 * 検証するもの:
 *  - A: /embed ページから ytInitialPlayerResponse を取得できるか (c=WEB_EMBEDDED_PLAYER の中身)
 *  - B: /youtubei/v1/player に POST して streamingData を取得できるか (youtubei.js と同経路)
 */

var VIDEO_ID = 'dQw4w9WgXcQ';

function doGet() {
  var out = { test: 'V1', video: VIDEO_ID, ts: new Date().toISOString() };
  out.A_embedPage = testA();
  out.B_playerPost = testB();
  return ContentService.createTextOutput(JSON.stringify(out, null, 1))
    .setMimeType(ContentService.MimeType.JSON);
}

function testA() {
  var r = { ok: false };
  try {
    var res = UrlFetchApp.fetch('https://www.youtube.com/embed/' + VIDEO_ID, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
        'Accept-Language': 'ja,en;q=0.9'
      },
      muteHttpExceptions: true
    });
    r.httpStatus = res.getResponseCode();
    var html = res.getContentText();
    r.htmlLen = html.length;
    var d = JSON.parse(extractJson(html, 'ytInitialPlayerResponse'));
    r.playability = d.playabilityStatus ? d.playabilityStatus.status : null;
    r.reason = d.playabilityStatus ? d.playabilityStatus.reason : null;
    var sd = d.streamingData || {};
    var formats = (sd.formats || []).concat(sd.adaptiveFormats || []);
    r.formatCount = formats.length;
    r.itags = formats.map(function (f) {
      return String(f.itag) + ':' + (f.qualityLabel || f.audioQuality || '?');
    });
    r.has1080 = formats.some(function (f) { return f.qualityLabel === '1080p'; });
    r.has140 = formats.some(function (f) { return String(f.itag) === '140'; });
    var withUrl = formats.filter(function (f) { return f.url; });
    r.sampleUrl = withUrl.length ? withUrl[0].url.substring(0, 150) : null;
    r.ok = r.playability === 'OK' && withUrl.length > 0;
  } catch (e) {
    r.error = String(e);
  }
  return r;
}

function testB() {
  var r = { ok: false };
  try {
    var page = UrlFetchApp.fetch('https://www.youtube.com/embed/' + VIDEO_ID, { muteHttpExceptions: true }).getContentText();
    var km = page.match(/INNERTUBE_API_KEY["']?\s*[:=]\s*["']([A-Za-z0-9_-]{30,})["']/);
    var key = km ? km[1] : null;
    r.key = key ? key.substring(0, 8) + '…' : null;
    if (!key) throw new Error('INNERTUBE_API_KEY 取得失敗');
    var body = {
      context: { client: { clientName: 'WEB_EMBEDDED_PLAYER', clientVersion: '1.20240701.00.00', hl: 'ja', gl: 'JP' } },
      videoId: VIDEO_ID
    };
    var res = UrlFetchApp.fetch('https://www.youtube.com/youtubei/v1/player?key=' + key, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(body),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'
      },
      muteHttpExceptions: true
    });
    r.httpStatus = res.getResponseCode();
    var d = JSON.parse(res.getContentText());
    r.playability = d.playabilityStatus ? d.playabilityStatus.status : null;
    var sd = d.streamingData || {};
    var formats = (sd.formats || []).concat(sd.adaptiveFormats || []);
    r.formatCount = formats.length;
    r.has1080 = formats.some(function (f) { return f.qualityLabel === '1080p'; });
    r.sampleUrl = formats.filter(function (f) { return f.url; }).length
      ? formats.filter(function (f) { return f.url; })[0].url.substring(0, 150) : null;
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
