#!/usr/bin/env node
/**
 * V6 検証キット: サーバー側メタデータ取得の確認(自宅環境で実行)
 *
 * 目的(2026-09-23 の server-first 方針 = HANDOVER §8.2):
 *   1. yt-dlp の有無と版
 *   2. yt-dlp --dump-single-json で取得できる項目(メタデータ)
 *   3. ページ抽出フォールバック(V1-d のアルゴリズム = /watch/ の ytInitialPlayerResponse)
 *   4. 検索結果ページ(/results?search_query=)の抽出
 *   5. トレンド(/feed/trending)の抽出
 *
 * 使い方(依存パッケージ不要。Node 18+ / Bun のどちらでも動きます):
 *   node v6-metadata-check.mjs                      # probe: 環境と yt-dlp の確認だけ(ネットワーク 0 回)
 *   node v6-metadata-check.mjs --mode=all           # 2〜5 をまとめて実行(推奨。ネットワーク ~4 回・1〜2 分)
 *   node v6-metadata-check.mjs --mode=video         # 2(+3)だけ
 *   node v6-metadata-check.mjs --mode=page          # 3 だけ
 *   node v6-metadata-check.mjs --mode=search --q=料理
 *   node v6-metadata-check.mjs --mode=trend
 *   node v6-metadata-check.mjs --mode=ytsearch --q=料理   # yt-dlp の ytsearch が使えるかの確認
 *
 * レート制限(429)対策 = 必須:
 *   - **連続で実行しない**。1 回実行したら 10〜30 分空ける(このキットは前回の実行から
 *     10 分未満のネットワーク実行を検出したら中断します。意図的に再実行する時だけ --force を付ける)。
 *   - 1 回の実行で外部へ出るリクエストは最小限(ページ取得は 1 回ずつ・間に待ちを入れる)。
 *
 * 出力:
 *   - 標準出力に JSON(これをそのまま送付してください)
 *   - 同ディレクトリに v6-result.json としても保存
 */
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const RESULT_PATH = join(HERE, 'v6-result.json');
const STATE_PATH = join(tmpdir(), 'ytdl-v6-lastrun.json');

const MIN_GAP_MS = 10 * 60 * 1000; // 前回実行から 10 分未満なら中断(--force で回避)
const REQUEST_TIMEOUT_MS = 20000;
const YTDLP_TIMEOUT_MS = 60000;
const BETWEEN_REQUESTS_MS = 4000;

const DEFAULT_VIDEO_ID = 'jNQXAC9IVRw'; // 「Me at the zoo」(公開・短尺・安定)
const DEFAULT_QUERY = '料理';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const YTDLP_KEYS = [
  'id',
  'title',
  'description',
  'uploader',
  'uploader_id',
  'channel',
  'channel_id',
  'duration',
  'view_count',
  'like_count',
  'comment_count',
  'upload_date',
  'thumbnail',
  'thumbnails',
  'categories',
  'tags',
  'webpage_url',
  'formats',
  'requested_formats',
  'subtitles',
  'automatic_captions',
  'chapters',
  'heatmap',
  'availability',
  'age_limit',
];

// ---------------------------------------------------------------- utilities

function nowIso() {
  return new Date().toISOString();
}

function log(msg) {
  process.stderr.write(`# ${msg}\n`);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseArgs(argv) {
  const out = { mode: 'probe', id: DEFAULT_VIDEO_ID, q: DEFAULT_QUERY, force: false };
  for (const a of argv) {
    if (a.startsWith('--mode=')) out.mode = a.slice('--mode='.length);
    else if (a.startsWith('--id=')) out.id = a.slice('--id='.length);
    else if (a.startsWith('--q=')) out.q = a.slice('--q='.length);
    else if (a === '--force') out.force = true;
  }
  return out;
}

function readState() {
  try {
    return JSON.parse(readFileSync(STATE_PATH, 'utf8'));
  } catch {
    return null;
  }
}

function writeState(mode) {
  try {
    writeFileSync(STATE_PATH, JSON.stringify({ at: nowIso(), mode }, null, 2));
  } catch {
    /* 状態ファイルが書けない環境では判定をスキップする(実行は継続) */
  }
}

function guardRateLimit(mode) {
  if (mode === 'probe') return { ok: true, warnings: [] };
  const st = readState();
  if (!st || !st.at) return { ok: true, warnings: [] };
  const elapsed = Date.now() - Date.parse(st.at);
  if (Number.isFinite(elapsed) && elapsed < MIN_GAP_MS) {
    return {
      ok: false,
      warnings: [
        `前回の実行(${st.mode})から ${Math.round(elapsed / 1000)} 秒しか経過していません。` +
          '429(レート制限)を避けるため 10〜30 分空けてください。意図的な再実行のみ --force を付けてください。',
      ],
    };
  }
  return { ok: true, warnings: [] };
}

/** 子プロセスを実行して { code, stdout, stderr, timedOut, error } を返す(例外は投げない) */
function run(cmd, args, timeoutMs) {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (e) {
      resolve({ code: null, stdout: '', stderr: String(e), timedOut: false, error: String(e) });
      return;
    }
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      try {
        child.kill('SIGKILL');
      } catch {
        /* ignore */
      }
    }, timeoutMs);
    child.stdout.on('data', (d) => {
      stdout += d.toString();
    });
    child.stderr.on('data', (d) => {
      stderr += d.toString();
    });
    child.on('error', (e) => {
      clearTimeout(timer);
      resolve({ code: null, stdout, stderr: stderr + String(e), timedOut, error: String(e) });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr, timedOut, error: null });
    });
  });
}

async function fetchText(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: ctrl.signal,
      headers: {
        'user-agent': UA,
        'accept-language': 'ja-JP,ja;q=0.9,en;q=0.8',
        accept: 'text/html,application/xhtml+xml',
      },
    });
    const body = await res.text();
    return { ok: res.ok, status: res.status, url: res.url, bytes: body.length, body };
  } catch (e) {
    return { ok: false, status: null, url, bytes: 0, body: '', error: String(e) };
  } finally {
    clearTimeout(timer);
  }
}

// -------------------------------------------------- JSON extraction (V1-d)

/** `{` の位置から括弧バランスで 1 個の JSON オブジェクトを切り出す(文字列内の括弧は無視) */
function balancedSlice(text, start) {
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < text.length; i += 1) {
    const c = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') {
      inStr = true;
      continue;
    }
    if (c === '{') depth += 1;
    else if (c === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

/** 代入文 `<marker> = {` の候補を全て列挙する(初回出現が偽構文のことがある = V1-c の実測) */
function candidateSlices(html, marker) {
  const re = new RegExp(`${marker}\\s*=\\s*\\{`, 'g');
  const out = [];
  let m = re.exec(html);
  while (m && out.length < 8) {
    const braceAt = html.indexOf('{', m.index);
    const slice = braceAt >= 0 ? balancedSlice(html, braceAt) : null;
    if (slice) out.push(slice);
    m = re.exec(html);
  }
  return out;
}

function pickParsed(slices, requiredKeys) {
  for (const s of slices) {
    try {
      const obj = JSON.parse(s);
      if (requiredKeys.every((k) => obj && typeof obj === 'object' && k in obj)) return obj;
    } catch {
      /* 次の候補へ */
    }
  }
  return null;
}

function countOccurrences(text, marker) {
  const re = new RegExp(`${marker}\\s*=\\s*\\{`, 'g');
  let n = 0;
  while (re.exec(text)) n += 1;
  return n;
}

/** オブジェクトを再帰的に走査して条件に合う値を集める(件数上限つき) */
function collect(node, pred, limit = 200) {
  const out = [];
  const stack = [node];
  while (stack.length && out.length < limit) {
    const cur = stack.pop();
    if (!cur || typeof cur !== 'object') continue;
    if (pred(cur)) out.push(cur);
    for (const v of Object.values(cur)) {
      if (v && typeof v === 'object') stack.push(v);
    }
  }
  return out;
}

function rendererTitle(renderer) {
  const t = renderer?.title;
  if (typeof t === 'string') return t;
  if (t?.runs?.[0]?.text) return t.runs[0].text;
  if (t?.simpleText) return t.simpleText;
  return null;
}

function summarizeItems(data) {
  const videos = collect(data, (o) => 'videoRenderer' in o && o.videoRenderer?.videoId);
  const rich = collect(data, (o) => 'richItemRenderer' in o);
  const playlists = collect(data, (o) => 'playlistRenderer' in o);
  const channels = collect(data, (o) => 'channelRenderer' in o);
  return {
    videoCount: videos.length,
    richItemCount: rich.length,
    playlistCount: playlists.length,
    channelCount: channels.length,
    sampleTitles: videos.slice(0, 5).map((o) => rendererTitle(o.videoRenderer)),
    sampleVideoIds: videos.slice(0, 5).map((o) => o.videoRenderer?.videoId ?? null),
  };
}

// ------------------------------------------------------------------ checks

async function checkYtdlp() {
  const version = await run('yt-dlp', ['--version'], 15000);
  if (version.code === 0 && version.stdout.trim()) {
    return { found: true, version: version.stdout.trim(), command: 'yt-dlp', error: null };
  }
  const alt = await run('yt-dlp.exe', ['--version'], 15000);
  if (alt.code === 0 && alt.stdout.trim()) {
    return { found: true, version: alt.stdout.trim(), command: 'yt-dlp.exe', error: null };
  }
  return {
    found: false,
    version: null,
    command: 'yt-dlp',
    error: (version.stderr || version.error || '').trim().slice(0, 300) || 'not found',
  };
}

function summarizeYtdlpJson(json) {
  const missing = YTDLP_KEYS.filter((k) => !(k in json));
  const formats = Array.isArray(json.formats) ? json.formats : [];
  const sample = formats.slice(0, 3).map((f) => ({
    format_id: f?.format_id ?? null,
    ext: f?.ext ?? null,
    height: f?.height ?? null,
    has_url: typeof f?.url === 'string',
    has_signature_cipher: typeof f?.signatureCipher === 'string' || typeof f?.cipher === 'string',
    protocol: f?.protocol ?? null,
  }));
  return {
    ok: true,
    source: 'yt-dlp',
    presentKeys: YTDLP_KEYS.filter((k) => k in json),
    missingKeys: missing,
    id: json.id ?? null,
    title: json.title ?? null,
    uploader: json.uploader ?? json.channel ?? null,
    duration: json.duration ?? null,
    viewCount: json.view_count ?? null,
    uploadDate: json.upload_date ?? null,
    thumbnail: typeof json.thumbnail === 'string' ? json.thumbnail.slice(0, 120) : null,
    formatCount: formats.length,
    formatsSample: sample,
    formatKeys: formats[0] ? Object.keys(formats[0]).slice(0, 30) : [],
    hasAutoCaptions: !!json.automatic_captions && Object.keys(json.automatic_captions).length > 0,
    hasChapters: Array.isArray(json.chapters) && json.chapters.length > 0,
  };
}

async function checkVideoViaYtdlp(id, command) {
  const url = `https://www.youtube.com/watch?v=${id}`;
  const r = await run(
    command,
    ['--dump-single-json', '--no-warnings', '--no-playlist', '--skip-download', url],
    YTDLP_TIMEOUT_MS,
  );
  const firstLine = r.stdout.split('\n').find((l) => l.trim().startsWith('{'));
  if (r.code === 0 && firstLine) {
    try {
      const json = JSON.parse(firstLine);
      return { ...summarizeYtdlpJson(json), exitCode: r.code, timedOut: r.timedOut };
    } catch (e) {
      return { ok: false, source: 'yt-dlp', error: `JSON parse 失敗: ${String(e)}`, exitCode: r.code };
    }
  }
  return {
    ok: false,
    source: 'yt-dlp',
    exitCode: r.code,
    timedOut: r.timedOut,
    stderrTail: (r.stderr || r.error || '').trim().split('\n').slice(-5).join(' / ').slice(0, 600),
  };
}

async function checkPage(id) {
  const url = `https://www.youtube.com/watch?v=${id}&hl=ja&gl=JP`;
  const res = await fetchText(url);
  const markers = {
    ytInitialPlayerResponse: countOccurrences(res.body, 'ytInitialPlayerResponse'),
    ytInitialData: countOccurrences(res.body, 'ytInitialData'),
  };
  const player = pickParsed(candidateSlices(res.body, 'ytInitialPlayerResponse'), [
    'playabilityStatus',
    'videoDetails',
  ]);
  const streaming = player?.streamingData ?? null;
  const formats = Array.isArray(streaming?.formats) ? streaming.formats : [];
  const adaptive = Array.isArray(streaming?.adaptiveFormats) ? streaming.adaptiveFormats : [];
  const all = [...formats, ...adaptive];
  return {
    url,
    status: res.status,
    ok: res.ok,
    bytes: res.bytes,
    title: res.body.match(/<title>([^<]{0,120})<\/title>/)?.[1] ?? null,
    markers,
    parsed: !!player,
    playabilityStatus: player?.playabilityStatus?.status ?? null,
    playabilityReason: player?.playabilityStatus?.reason ?? null,
    videoTitle: player?.videoDetails?.title ?? null,
    videoAuthor: player?.videoDetails?.author ?? null,
    lengthSeconds: player?.videoDetails?.lengthSeconds ?? null,
    viewCount: player?.videoDetails?.viewCount ?? null,
    formatCount: all.length,
    formatUrlCount: all.filter((f) => typeof f?.url === 'string').length,
    formatSignatureCipherCount: all.filter((f) => f?.signatureCipher || f?.cipher).length,
    error: res.error ?? null,
  };
}

async function checkSearch(q) {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&hl=ja&gl=JP`;
  const res = await fetchText(url);
  const data = pickParsed(candidateSlices(res.body, 'ytInitialData'), ['contents']);
  return {
    url,
    status: res.status,
    ok: res.ok,
    bytes: res.bytes,
    markers: {
      ytInitialData: countOccurrences(res.body, 'ytInitialData'),
      ytInitialPlayerResponse: countOccurrences(res.body, 'ytInitialPlayerResponse'),
    },
    parsed: !!data,
    items: data ? summarizeItems(data) : null,
    error: res.error ?? null,
  };
}

async function checkTrend() {
  const url = 'https://www.youtube.com/feed/trending?hl=ja&gl=JP';
  const res = await fetchText(url);
  const data = pickParsed(candidateSlices(res.body, 'ytInitialData'), ['contents']);
  return {
    url,
    status: res.status,
    ok: res.ok,
    bytes: res.bytes,
    markers: { ytInitialData: countOccurrences(res.body, 'ytInitialData') },
    parsed: !!data,
    items: data ? summarizeItems(data) : null,
    error: res.error ?? null,
  };
}

async function checkYtdlpSearch(q, command) {
  const r = await run(
    command,
    ['--dump-single-json', '--no-warnings', '--flat-playlist', '--playlist-end', '10', `ytsearch10:${q}`],
    YTDLP_TIMEOUT_MS,
  );
  const firstLine = r.stdout.split('\n').find((l) => l.trim().startsWith('{'));
  if (r.code === 0 && firstLine) {
    try {
      const json = JSON.parse(firstLine);
      const entries = Array.isArray(json.entries) ? json.entries : [];
      return {
        ok: true,
        entryCount: entries.length,
        sampleTitles: entries.slice(0, 5).map((e) => e?.title ?? null),
        sampleIds: entries.slice(0, 5).map((e) => e?.id ?? null),
      };
    } catch (e) {
      return { ok: false, error: `JSON parse 失敗: ${String(e)}` };
    }
  }
  return {
    ok: false,
    exitCode: r.code,
    timedOut: r.timedOut,
    stderrTail: (r.stderr || r.error || '').trim().split('\n').slice(-5).join(' / ').slice(0, 600),
  };
}

// -------------------------------------------------------------------- main

async function main() {
  const started = Date.now();
  const args = parseArgs(process.argv.slice(2));
  const valid = ['probe', 'all', 'video', 'page', 'search', 'trend', 'ytsearch'];
  if (!valid.includes(args.mode)) {
    log(`--mode=${args.mode} は不明です。使える値: ${valid.join(' / ')}`);
    process.exitCode = 2;
    return;
  }

  const guard = guardRateLimit(args.mode);
  const out = {
    kit: 'V6',
    mode: args.mode,
    startedAt: nowIso(),
    target: { videoId: args.id, query: args.q },
    env: {
      node: process.version,
      platform: `${process.platform} ${process.arch}`,
      cwd: process.cwd(),
      hasFetch: typeof fetch === 'function',
    },
    warnings: [...guard.warnings],
    notes: [],
    ytdlp: null,
    video: null,
    page: null,
    search: null,
    trend: null,
    ytdlpSearch: null,
  };

  out.ytdlp = await checkYtdlp();
  if (!out.ytdlp.found) {
    out.notes.push(
      'yt-dlp が見つかりません。インストール(ex: winget install yt-dlp / pipx install yt-dlp / 公式バイナリ)後に probe から再実行してください。',
    );
  }

  if (args.mode === 'probe') {
    out.notes.push('probe = ネットワーク 0 回・いつでも安全に実行できます。');
  } else if (!guard.ok && !args.force) {
    out.notes.push('レート制限対策により実行を中断しました(--force を付けると実行できます)。');
    process.exitCode = 3;
  } else {
    const ytdlpCmd = out.ytdlp.found ? out.ytdlp.command : null;

    if (args.mode === 'all' || args.mode === 'video') {
      if (ytdlpCmd) {
        out.video = await checkVideoViaYtdlp(args.id, ytdlpCmd);
      } else {
        out.video = { ok: false, source: 'yt-dlp', error: 'yt-dlp が見つからないため実行しませんでした' };
      }
    }
    if (args.mode === 'all' || args.mode === 'page') {
      if (args.mode === 'all') await sleep(BETWEEN_REQUESTS_MS);
      out.page = await checkPage(args.id);
    }
    if (args.mode === 'all' || args.mode === 'search') {
      if (args.mode === 'all') await sleep(BETWEEN_REQUESTS_MS);
      out.search = await checkSearch(args.q);
    }
    if (args.mode === 'all' || args.mode === 'trend') {
      if (args.mode === 'all') await sleep(BETWEEN_REQUESTS_MS);
      out.trend = await checkTrend();
    }
    if (args.mode === 'ytsearch' && ytdlpCmd) {
      out.ytdlpSearch = await checkYtdlpSearch(args.q, ytdlpCmd);
    }
    writeState(args.mode);

    // 判定のヒント(断定はしない・ユーザーが結果を見て判断するための材料)
    if (out.video?.ok) out.notes.push('yt-dlp の主経路が成立しています(項目は presentKeys を確認)。');
    if (out.video && out.video.ok === false)
      out.notes.push('yt-dlp が失敗しています。この場合はページ抽出(フォールバック)の結果で判断します。');
    if (out.page?.parsed) out.notes.push('ページ抽出フォールバックは JSON を解析できています。');
    if (out.search) out.notes.push(`検索: videoCount=${out.search.items?.videoCount ?? 'n/a'}(0 なら抽出経路の再検討が必要)。`);
    if (out.trend) out.notes.push(`トレンド: videoCount=${out.trend.items?.videoCount ?? 'n/a'}(0 なら抽出経路の再検討が必要)。`);
    out.notes.push('結果の JSON を保存し、verification/Verification-Results.md へ記録します。');
  }

  out.finishedAt = nowIso();
  out.durationMs = Date.now() - started;
  const text = JSON.stringify(out, null, 2);
  process.stdout.write(`${text}\n`);
  if (args.mode !== 'probe') {
    try {
      writeFileSync(RESULT_PATH, `${text}\n`);
      log(`結果を ${RESULT_PATH} に保存しました(このファイルを送付・コミットしてください)。`);
    } catch (e) {
      log(`結果ファイルの保存に失敗: ${String(e)}`);
    }
  }
  log('連続実行は避けてください(次は 10〜30 分空ける)。');
}

main().catch((e) => {
  log(`予期しないエラー: ${String(e)}`);
  process.exitCode = 1;
});
