/**
 * V5b 検証キット②: GAS からの「検索結果」と「トレンド」の抽出テスト(2026-09-23 追加)
 *
 * 確認したいこと(V5-4): iframe 方式ではバックエンドの役割が**メタデータ解決**に変わる。
 *   V1 で実証済みなのは `/watch/` ページ抽出のみ。**検索(**`?test=search`**)とトレンド(**`?test=trend`**)**が
 *   GAS(データセンター IP)から取得できるかを、このキットで 1 回ずつ確認する。
 *   → 可: Phase A でも検索・トレンド機能を実装できる / 不可: 該当機能は保留(計画書 R11・ユーザーに確認)
 *
 * 使い方(重要: **1 回の実行 = YouTube への fetch 1 回**):
 *   1. https://script.google.com で「新しいプロジェクト」→ このファイルを全て貼付
 *   2. デプロイ → 新しいデプロイ → Web アプリ / 実行: 自分 / アクセス: 全員
 *   3. **まず** WebアプリURL の末尾に `?probe=1` を付けて開く
 *      → 数秒で `{"test":"V5b","probe":true,"ok":true,...}` が返れば**デプロイは最新**(fetch 0 回・いつでも安全)
 *   4. `?test=trend` を**1 回だけ**開く → トレンド抽出の結果が JSON で返る
 *   5. **10〜30 分空けてから** `?test=search&q=<任意のキーワード>` を**1 回だけ**開く
 *      → 検索結果抽出の結果が JSON で返る(`q` 省略時は既定キーワード)
 *   6. 表示された **JSON を丸ごとコピー**して送付(チャット貼付 or Verification-Results.md へコミット)
 *
 * 注意:
 *   - **リロード・再クリックはしない**でください(1 回 = fetch 1 回)。429 が出たら、閉じて
 *     10〜30 分待ってから 1 回だけ開き直します(O9 = レート制限。キット内では自動リトライしません)。
 *   - 実行は 1 回あたり数秒〜10 秒程度で必ず JSON を返します(長待ちさせない設計)。
 *   - 参考: `?test=watch&v=<videoId>` で `/watch/` ページ抽出の再確認もできます(既定では使いません)。
 *   - setMimeType は **ContentService.MimeType 列挙型**を使用(O7: 文字列を渡すと例外)。
 */

var KIT = 'v5b-2026-09-23';
var DEFAULT_QUERY = 'ニュース';
var UA_DESKTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
var HEADERS = {
  'User-Agent': UA_DESKTOP,
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ja-JP,ja;q=0.9,en;q=0.8'
};

/** ブレース/ブラケットの対応を数えて JSON 断片を切り出す(文字列・エスケープを考慮)。 */
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
        if (depth === 0) { return html.slice(start, i + 1); }
      }
    }
  }
  return null;
}

/**
 * `ytInitialData = {` の候補を全列挙 → バランス切片 → JSON.parse(実データ判定つき)。
 * (v1d/v1f と同じ「偽出現を自動スキップする」方針。WIZ_global_data 内の別構文に命中する問題への対処)
 */
function extractInitialData(html) {
  var re = /ytInitialData\s*=\s*\{/g;
  var m, attempts = 0;
  while ((m = re.exec(html)) !== null) {
    attempts++;
    var start = m.index + m[0].length - 1;
    var blob = balancedSlice(html, start);
    if (!blob) { continue; }
    try {
      var obj = JSON.parse(blob);
      if (obj && (obj.contents || obj.header || obj.metadata)) {
        return { obj: obj, attempts: attempts, mode: 'balancedSlice + JSON.parse' };
      }
    } catch (e) { /* 次の候補へ */ }
  }
  return { obj: null, attempts: attempts, mode: 'failed' };
}

/** 抽出できなかった場合の縮退: videoId の出現数だけでも記録する(判定材料)。 */
function regexProbe(html) {
  var ids = {};
  var re = /"videoId"\s*:\s*"([A-Za-z0-9_-]{11})"/g;
  var m, total = 0;
  while ((m = re.exec(html)) !== null) {
    total++;
    if (!ids[m[1]]) { ids[m[1]] = 0; }
    ids[m[1]]++;
    if (total > 5000) { break; }
  }
  var unique = Object.keys(ids);
  return { videoIdOccurrences: total, uniqueVideoIdCount: unique.length, sampleVideoIds: unique.slice(0, 5) };
}

/** テキスト表現(simpleText / runs)を 1 行に。 */
function textOf(t) {
  if (!t) { return null; }
  if (typeof t === 'string') { return t.slice(0, 140); }
  if (t.simpleText) { return String(t.simpleText).slice(0, 140); }
  if (t.runs && t.runs.length) {
    var s = '';
    for (var i = 0; i < t.runs.length && i < 4; i++) { s += (t.runs[i].text || ''); }
    return s.slice(0, 140) || null;
  }
  return null;
}

/** renderer 木を走査して件数と先頭項目を集める(visitCap で CPU 上限に配慮)。 */
function collectItems(root, limit, visitCap) {
  var counts = {}, items = [], visited = 0, stack = [root];
  var isItem = { videoRenderer: 1, gridVideoRenderer: 1, compactVideoRenderer: 1, reelItemRenderer: 1 };
  while (stack.length && visited < visitCap) {
    var node = stack.pop();
    visited++;
    if (!node || typeof node !== 'object') { continue; }
    if (Object.prototype.toString.call(node) === '[object Array]') {
      for (var i = node.length - 1; i >= 0; i--) { if (node[i] && typeof node[i] === 'object') { stack.push(node[i]); } }
      continue;
    }
    var keys = Object.keys(node);
    for (var k = 0; k < keys.length; k++) {
      var key = keys[k];
      if (/Renderer$/.test(key)) { counts[key] = (counts[key] || 0) + 1; }
      if (isItem[key] && items.length < limit) {
        var r = node[key] || {};
        var it = {
          kind: key,
          videoId: r.videoId || null,
          title: textOf(r.title) || textOf(r.headline),
          channel: textOf(r.ownerText) || textOf(r.longBylineText) || textOf(r.shortBylineText),
          views: textOf(r.viewCountText),
          length: textOf(r.lengthText),
          published: textOf(r.publishedTimeText)
        };
        if (it.videoId || it.title) { items.push(it); }
      }
      var v = node[key];
      if (v && typeof v === 'object') { stack.push(v); }
    }
  }
  return { counts: counts, items: items, visited: visited, truncated: visited >= visitCap };
}

/** 1 回だけ fetch して本文とメタ情報を返す(自動リトライはしない = 429 は外部リトライ)。 */
function fetchOnce(url) {
  var t0 = Date.now();
  var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true, headers: HEADERS });
  var html = res.getContentText();
  var out = {
    fetchMs: Date.now() - t0,
    httpStatus: res.getResponseCode(),
    htmlLen: html.length,
    finalUrl: (function () { try { return String(res.getHeaders()['Location'] || ''); } catch (e) { return ''; } })()
  };
  out.html = html;
  return out;
}

/** よくある遮断/同意/ボット判定ページの兆候(断定はしない・記録のみ)。 */
function pageMarkers(html) {
  return {
    hasYtInitialData: html.indexOf('ytInitialData') >= 0,
    hasYtInitialPlayerResponse: html.indexOf('ytInitialPlayerResponse') >= 0,
    hasConsentHint: html.indexOf('consent') >= 0 || html.indexOf('同意') >= 0,
    hasBotHint: html.indexOf('unusual traffic') >= 0 || html.indexOf('not a robot') >= 0 || html.indexOf('captcha') >= 0,
    hasSorryHint: html.indexOf('/sorry/') >= 0,
    title: (html.match(/<title[^>]*>([\s\S]{0,120}?)<\/title>/i) || [null, null])[1]
  };
}

function finish(out) {
  return ContentService.createTextOutput(JSON.stringify(out, null, 1))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  var p = (e && e.parameter) ? e.parameter : {};

  // 自己診断(YouTube への fetch 0 回 = いつでも安全・即返り)
  if (p.probe === '1' || p.probe === 'true') {
    return finish({
      test: 'V5b', kit: KIT, probe: true, ok: true, ts: new Date().toISOString(),
      modes: ['?test=trend', '?test=search&q=<キーワード>', '(参考) ?test=watch&v=<videoId>'],
      note: 'デプロイは最新版です。1 回の実行 = YouTube への fetch 1 回です(リロード・再クリックをしない)。'
    });
  }

  var mode = String(p.test || '');
  if (mode === 'trend') { return finish(runTrend()); }
  if (mode === 'search') { return finish(runSearch(p.q)); }
  if (mode === 'watch') { return finish(runWatch(p.v)); }

  return finish({
    test: 'V5b', kit: KIT, error: 'test パラメータが未指定/不明です',
    usage: ['?probe=1', '?test=trend', '?test=search&q=<キーワード>', '(参考) ?test=watch&v=<videoId>'],
    ts: new Date().toISOString()
  });
}

/** ④-a トレンド: https://www.youtube.com/feed/trending */
function runTrend() {
  var url = 'https://www.youtube.com/feed/trending?hl=ja&gl=JP';
  var out = { test: 'V5b', kit: KIT, mode: 'trend', url: url, ts: new Date().toISOString() };
  try {
    var r = fetchOnce(url);
    out.fetchMs = r.fetchMs;
    out.httpStatus = r.httpStatus;
    out.htmlLen = r.htmlLen;
    out.markers = pageMarkers(r.html);
    if (r.httpStatus !== 200) {
      out.error = 'fetch status=' + r.httpStatus +
        '(429 = レート制限。ページを閉じて 10〜30 分待ってから 1 回だけ開き直してください。この JSON をそのまま送付でも OK)';
      out.pageHead = r.html.slice(0, 300);
      return out;
    }
    var x = extractInitialData(r.html);
    out.extract = { mode: x.mode, attempts: x.attempts };
    if (!x.obj) {
      out.fallback = regexProbe(r.html);
      out.error = 'ytInitialData の抽出に失敗(縮退の videoId 出現数は fallback に記録)';
      return out;
    }
    var top = x.obj.contents || {};
    out.topKeys = Object.keys(x.obj);
    out.contentsKeys = Object.keys(top);
    var c = collectItems(x.obj, 10, 150000);
    out.counts = c.counts;
    out.itemCount = c.items.length;
    out.items = c.items;
    out.visitedNodes = c.visited;
    out.truncated = c.truncated;
    return out;
  } catch (err) {
    out.fetchMs = out.fetchMs || null;
    out.fatal = String(err);
    return out;
  }
}

/** ④-b 検索: https://www.youtube.com/results?search_query=... */
function runSearch(q) {
  var query = (q && String(q).length) ? String(q) : DEFAULT_QUERY;
  var url = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(query) + '&hl=ja&gl=JP';
  var out = { test: 'V5b', kit: KIT, mode: 'search', query: query, url: url, ts: new Date().toISOString() };
  try {
    var r = fetchOnce(url);
    out.fetchMs = r.fetchMs;
    out.httpStatus = r.httpStatus;
    out.htmlLen = r.htmlLen;
    out.markers = pageMarkers(r.html);
    if (r.httpStatus !== 200) {
      out.error = 'fetch status=' + r.httpStatus +
        '(429 = レート制限。ページを閉じて 10〜30 分待ってから 1 回だけ開き直してください。この JSON をそのまま送付でも OK)';
      out.pageHead = r.html.slice(0, 300);
      return out;
    }
    var x = extractInitialData(r.html);
    out.extract = { mode: x.mode, attempts: x.attempts };
    if (!x.obj) {
      out.fallback = regexProbe(r.html);
      out.error = 'ytInitialData の抽出に失敗(縮退の videoId 出現数は fallback に記録)';
      return out;
    }
    out.topKeys = Object.keys(x.obj);
    out.estimatedResults = x.obj.estimatedResults || null;
    out.contentsKeys = Object.keys(x.obj.contents || {});
    var c = collectItems(x.obj, 10, 150000);
    out.counts = c.counts;
    out.itemCount = c.items.length;
    out.items = c.items;
    out.visitedNodes = c.visited;
    out.truncated = c.truncated;
    return out;
  } catch (err) {
    out.fetchMs = out.fetchMs || null;
    out.fatal = String(err);
    return out;
  }
}

/** 参考(既定では使わない): /watch/ ページ抽出の再確認(P00-D のメタデータ解決 = V1-d の手法)。 */
function runWatch(v) {
  var id = (v && String(v).length) ? String(v) : 'jNQXAC9IVRw';
  var url = 'https://www.youtube.com/watch?v=' + id + '&hl=ja&gl=JP';
  var out = { test: 'V5b', kit: KIT, mode: 'watch', video: id, url: url, ts: new Date().toISOString() };
  try {
    var r = fetchOnce(url);
    out.fetchMs = r.fetchMs;
    out.httpStatus = r.httpStatus;
    out.htmlLen = r.htmlLen;
    out.markers = pageMarkers(r.html);
    if (r.httpStatus !== 200) {
      out.error = 'fetch status=' + r.httpStatus + '(参考項目のため、深追いは不要です)';
      return out;
    }
    var re = /ytInitialPlayerResponse\s*=\s*\{/g;
    var m, attempts = 0, found = null;
    while ((m = re.exec(r.html)) !== null) {
      attempts++;
      var blob = balancedSlice(r.html, m.index + m[0].length - 1);
      if (!blob) { continue; }
      try {
        var obj = JSON.parse(blob);
        if (obj && (obj.playabilityStatus || obj.videoDetails || obj.streamingData)) { found = obj; break; }
      } catch (e2) { /* 次の候補へ */ }
    }
    out.extract = { mode: found ? 'balancedSlice + JSON.parse' : 'failed', attempts: attempts };
    if (found) {
      out.playability = (found.playabilityStatus || {}).status || null;
      out.videoTitle = (found.videoDetails || {}).title || null;
      out.author = (found.videoDetails || {}).author || null;
      out.lengthSeconds = (found.videoDetails || {}).lengthSeconds || null;
    }
    return out;
  } catch (err) {
    out.fatal = String(err);
    return out;
  }
}
