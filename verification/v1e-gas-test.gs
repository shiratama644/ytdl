/**
 * V1-e 検証: watch ページの streamingData におけるストリーム URL の提供形式を確認(第 5 回・最小キット)
 *
 * v1d(第 4 回)の結果:
 *  - **GAS 解決成立**: /watch/ ページから ytInitialPlayerResponse を抽出し、
 *    playability=OK / formats 30 種 / 1080p(137) + audio(140) 取得に成功。
 *    (desktop・mobile UA 両方とも OK。/player エンドポイントは依然 dead)
 *  - ただし **sampleUrl = null** = 30 形式どれも `url`(https 直リンク)フィールドを持っていなかった。
 * → 本キットはその原因を確定する: ストリーム URL はどう提供されているのか
 *    - `url` あり   → P00-D(GAS 後端)はそのまま使用(最良)
 *    - `signatureCipher` / `ciphertext` → 復号(= youtubei.js の decipherer / PO token 系)
 *      が必要になる = P00-D の設計が変わる
 *
 * 1 回だけ fetch する最小キット(所要 ~30 秒)。
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

function extractPlayerResponse(html) {
  var re = /ytInitialPlayerResponse\s*=\s*\{/g;
  var m, attempts = 0;
  while ((m = re.exec(html)) !== null) {
    attempts++;
    var start = m.index + m[0].length - 1;
    var blob = balancedSlice(html, start);
    if (!blob) continue;
    try {
      var obj = JSON.parse(blob);
      if (obj && (obj.playabilityStatus || obj.streamingData || obj.videoDetails)) return { obj: obj, attempts: attempts };
    } catch (e) { /* 次の候補へ */ }
  }
  return { obj: null, attempts: attempts };
}

function doGet() {
  var out = { test: 'V1e', video: VIDEO_ID, ts: new Date().toISOString() };
  try {
    var res = UrlFetchApp.fetch('https://www.youtube.com/watch?v=' + VIDEO_ID + '&hl=ja&gl=JP', {
      muteHttpExceptions: true,
      headers: { 'User-Agent': UA_DESKTOP, 'Accept-Language': 'ja-JP,ja;q=0.9' }
    });
    out.httpStatus = res.getResponseCode();
    var html = res.getContentText();
    out.htmlLen = html.length;
    var x = extractPlayerResponse(html);
    out.extractAttempts = x.attempts;
    if (!x.obj) { out.error = 'player response 抽出失敗'; return finish(out); }
    var obj = x.obj;
    out.playability = (obj.playabilityStatus || {}).status || null;
    var sd = obj.streamingData || {};
    out.sdKeys = Object.keys(sd);
    out.expire = sd.expireInSeconds || null;
    var formats = sd.formats || [];
    var adaptive = sd.adaptiveFormats || [];
    var all = formats.concat(adaptive);
    out.formatCount = all.length;

    // URL 系フィールドの存在を確認(全形式を集計)
    var probe = ['url', 'signatureCipher', 'ciphertext', 'streamingUrl'];
    out.fieldPresence = {};
    for (var p = 0; p < probe.length; p++) {
      var cnt = 0, firstVal = null;
      for (var i = 0; i < all.length; i++) {
        if (all[i] && all[i][probe[p]]) {
          cnt++;
          if (firstVal === null) firstVal = String(all[i][probe[p]]).slice(0, 120);
        }
      }
      out.fieldPresence[probe[p]] = { count: cnt, firstSample: firstVal };
    }
    // 各形式のキー構成(先頭 1 形式だけ)
    if (formats.length) {
      out.f0Keys = Object.keys(formats[0]);
      out.f0Sample = JSON.stringify(formats[0]).slice(0, 600);
    }
    if (adaptive.length) {
      out.a0Keys = Object.keys(adaptive[0]);
      out.a0Sample = JSON.stringify(adaptive[0]).slice(0, 600);
    }
  } catch (e) {
    out.fatal = String(e);
  }
  return finish(out);
}

function finish(out) {
  return ContentService.createTextOutput(JSON.stringify(out, null, 1))
    .setMimeType(ContentService.MimeType.JSON);
}
