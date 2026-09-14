/**
 * V1-f 検証: watch ページの streamingData におけるストリーム URL の提供形式を確認
 * (第 6 回 = v1e の再設計版。~10 秒で完了する設計)
 *
 * v1e 試行 2 が「どれだけ待っても表示されない」だった原因(私の設計ミス):
 *  - 429 自動リトライ(30s+60s sleep)を内蔵したため、1 回の実行が**最大 90 秒以上**
 *    読み込み状態が続く = ブラウザにフィードバックが一切無い。
 *  - 429 が深い状態だと fetch 自体が応答しにくく、GAS の実行時間上限(6 分)に
 *    近づきエラーになる可能性。
 * → 再設計:
 *  - **`?probe=1` = 即返りの自己チェック**(YouTube への fetch 0 回 = いつでも安全)。
 *    = デプロイが最新版かどうかの確認。
 *  - **本番実行 = 1 回だけ fetch(数秒)**。リトライはキット内でやらず、
 *    **429 が出たらページを閉じて 10〜30 分待ってから 1 回だけ開き直す**方式に。
 *    (1 回の実行 = 数秒で必ず JSON が返る)
 *
 * 確認する内容(v1e と同じ):
 *  formats 各形式が **`url` / `signatureCipher` / `ciphertext` / `streamingUrl`
 *  のどれを持っているか**(存在数 + 先頭サンプル値 + 先頭 1 形式の全キー構成)。
 *  - `url` あり   → P00-D(GAS 後端)はそのまま googlevideo 直リンクを返す(最良)
 *  - `signatureCipher`/`ciphertext` → P00-D に復号機構が必要(設計が変わる)
 *
 * 運用方法:
 * 1. https://script.google.com で「新しいプロジェクト」を作成 → このファイルを全て貼付
 * 2. デプロイ → 新しいデプロイ → Web アプリ / 実行: 自分 / アクセス: 全員
 * 3. **まず** WebアプリURL + `?probe=1` を開く
 *    → 数秒で `{"test":"V1f","probe":true,"ok":true,...}` が表示されればデプロイは最新
 *    (表示されない/違うものが出たら、そのページの内容をそのまま送ってください)
 * 4. **前回の実行から 10〜30 分空けてから**、WebアプリURL(`?probe` なし)を**1 回だけ**開く
 *    → 数秒(〜10 秒)で JSON が表示される
 *    → 429 の JSON が返ったら = 閉じて 10〜30 分待って、もう 1 回だけ開き直す(その繰り返し)
 *    **開いた後はリロード・再クリックしないでください**(1 回 = YouTube への fetch 1 回)
 * 5. 表示された **JSON を丸ごとコピー**して送る(チャット貼付 or リポジトリコミット)
 */

var VIDEO_ID = 'dQw4w9WgXcQ';
var KIT = 'v1f';
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

function finish(out) {
  return ContentService.createTextOutput(JSON.stringify(out, null, 1))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  // 自己チェック ping(YouTube への fetch 0 回 = いつでも安全・即返り)
  if (e && e.parameter && e.parameter.probe === '1') {
    return finish({ test: 'V1f', kit: KIT, probe: true, ok: true, ts: new Date().toISOString(),
      note: 'デプロイは最新版です。?probe なしで開くと本番実行(1 回 fetch・数秒)が走ります。' });
  }

  var out = { test: 'V1f', kit: KIT, video: VIDEO_ID, ts: new Date().toISOString() };
  var url = 'https://www.youtube.com/watch?v=' + VIDEO_ID + '&hl=ja&gl=JP';
  var t0 = Date.now();
  try {
    var res = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      headers: { 'User-Agent': UA_DESKTOP, 'Accept-Language': 'ja-JP,ja;q=0.9' }
    });
    out.fetchMs = Date.now() - t0;
    out.httpStatus = res.getResponseCode();
    var html = res.getContentText();
    out.htmlLen = html.length;

    if (out.httpStatus !== 200) {
      // レート制限等は外部リトライ(= 間隔を空けて開き直す)で対応
      out.error = 'fetch status=' + out.httpStatus + '(429 = レート制限。ページを閉じて 10〜30 分待ってから 1 回だけ開き直してください。この JSON そのまま送付でも OK)';
      out.errorPageHead = html.slice(0, 300);
      return finish(out);
    }

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
  } catch (err) {
    out.fetchMs = Date.now() - t0;
    out.fatal = String(err);
  }
  return finish(out);
}
