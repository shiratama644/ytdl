#!/usr/bin/env node
/**
 * V6 検証キット: サーバー側メタデータ取得の確認(自宅環境で実行) — v2 (2026-09-23)
 *
 * 方針(2026-09-23 ユーザー指示): 現段階の YouTube クライアント(情報取得)は **youtubei.js**。
 *   - 検索 / 動画・チャンネル・プレイリストのメタデータ / 統計 / Live Chat = youtubei.js(InnerTube クライアント)
 *   - yt-dlp は **将来のダウンロード機能**用(現段階では実装しない。このキットでは存在確認のみ)
 *
 * 確認したいこと:
 *   1. youtubei.js が解決・実行できるか(版・import・クライアント生成)
 *   2. **InnerTube(生 fetch)が自宅の回線から通るか** = youtubei.js の前提条件(重要)
 *      2-a. watch ページから API キー / クライアント版を取得できるか
 *      2-b. /youtubei/v1/player に POST して playabilityStatus / videoDetails が返るか
 *      2-c. /youtubei/v1/search に POST して検索結果(動画)が返るか
 *   3. youtubei.js の実機能(search / getInfo / getChannel / getPlaylist / ホーム / トレンド / Live Chat)
 *   4. yt-dlp の有無と版(将来の DL 機能用の記録)
 *
 * 使い方(依存パッケージ不要。Node 18+ / Bun のどちらでも動きます):
 *   node v6-metadata-check.mjs                         # probe: 環境とパッケージ解決の確認(ネットワーク 0 回)
 *   node v6-metadata-check.mjs --mode=innertube        # InnerTube の生 fetch(3 リクエスト)
 *   node v6-metadata-check.mjs --mode=youtubei         # youtubei.js(要インストール。既定 steps = search,video)
 *   node v6-metadata-check.mjs --mode=youtubei --steps=all
 *   node v6-metadata-check.mjs --mode=ytdlp            # 参考: yt-dlp の版(将来の DL 用)
 *   node v6-metadata-check.mjs --mode=all              # innertube + youtubei(既定 steps)= 5 リクエスト
 *
 * youtubei.js の導入(キットと同じディレクトリで実行する場合):
 *   npm install youtubei.js        # または bun add youtubei.js
 *   (どこか別のディレクトリに入れた場合は --deps=<そのパス> を付ける)
 *
 * レート制限(429)対策 = 必須:
 *   - **連続で実行しない**。1 回実行したら 10〜30 分空ける(このキットは前回の実行から
 *     10 分未満のネットワーク実行を検出したら中断します。意図的に再実行する時だけ --force を付ける)。
 *   - 1 回の実行で外部へ出るリクエストは最小限(各リクエストの間に待ちを入れる)。
 *
 * 出力:
 *   - 標準出力に JSON(これをそのまま送付してください)
 *   - 同ディレクトリに v6-result.json としても保存
 */
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const RESULT_PATH = join(HERE, 'v6-result.json');
const STATE_PATH = join(tmpdir(), 'ytdl-v6-lastrun.json');

const MIN_GAP_MS = 10 * 60 * 1000; // 前回実行から 10 分未満なら中断(--force で回避)
const REQUEST_TIMEOUT_MS = 25000;
const CHILD_TIMEOUT_MS = 20000;
const BETWEEN_REQUESTS_MS = 4000;

const DEFAULT_VIDEO_ID = 'jNQXAC9IVRw'; // 「Me at the zoo」(公開・短尺・安定)
const DEFAULT_QUERY = '料理';
const DEFAULT_CHANNEL_ID = 'UC_x5XG1OV2P6uZZ5FSM9Ttw'; // Google Developers(公開・安定)
const DEFAULT_PLAYLIST_ID = 'PLrEnWoR732-BHrPp_Pm8_VleD68f9s14-'; // Google Developers の公開プレイリスト

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const ALL_STEPS = ['search', 'video', 'channel', 'playlist', 'home', 'trending', 'livechat'];

// ---------------------------------------------------------------- utilities

const nowIso = () => new Date().toISOString();
const log = (msg) => process.stderr.write(`# ${msg}\n`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function parseArgs(argv) {
  const out = {
    mode: 'probe',
    id: DEFAULT_VIDEO_ID,
    q: DEFAULT_QUERY,
    channel: DEFAULT_CHANNEL_ID,
    playlist: DEFAULT_PLAYLIST_ID,
    live: null,
    deps: null,
    steps: ['search', 'video'],
    force: false,
  };
  for (const a of argv) {
    if (a.startsWith('--mode=')) out.mode = a.slice('--mode='.length);
    else if (a.startsWith('--id=')) out.id = a.slice('--id='.length);
    else if (a.startsWith('--q=')) out.q = a.slice('--q='.length);
    else if (a.startsWith('--channel=')) out.channel = a.slice('--channel='.length);
    else if (a.startsWith('--playlist=')) out.playlist = a.slice('--playlist='.length);
    else if (a.startsWith('--live=')) out.live = a.slice('--live='.length);
    else if (a.startsWith('--deps=')) out.deps = a.slice('--deps='.length);
    else if (a.startsWith('--steps=')) {
      const v = a.slice('--steps='.length);
      out.steps = v === 'all' ? [...ALL_STEPS] : v.split(',').map((s) => s.trim()).filter(Boolean);
    } else if (a === '--force') out.force = true;
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
  if (mode === 'probe' || mode === 'ytdlp') return { ok: true, warnings: [] };
  const st = readState();
  if (!st?.at) return { ok: true, warnings: [] };
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
function run(cmd, args, timeoutMs = CHILD_TIMEOUT_MS) {
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

async function fetchWithTimeout(url, init = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, { redirect: 'follow', signal: ctrl.signal, ...init });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchText(url) {
  try {
    const res = await fetchWithTimeout(url, {
      headers: {
        'user-agent': UA,
        'accept-language': 'ja-JP,ja;q=0.9,en;q=0.8',
        accept: 'text/html,application/xhtml+xml',
      },
    });
    const body = await res.text();
    return { ok: res.ok, status: res.status, url: res.url, bytes: body.length, body, error: null };
  } catch (e) {
    return { ok: false, status: null, url, bytes: 0, body: '', error: String(e) };
  }
}

async function postJson(url, body) {
  try {
    const res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'user-agent': UA,
        'accept-language': 'ja-JP,ja;q=0.9,en;q=0.8',
        origin: 'https://www.youtube.com',
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* JSON でない応答(429 の HTML 等) */
    }
    return { ok: res.ok, status: res.status, bytes: text.length, json, head: text.slice(0, 200), error: null };
  } catch (e) {
    return { ok: false, status: null, bytes: 0, json: null, head: '', error: String(e) };
  }
}

/** オブジェクトを再帰的に走査し、指定キーを持つ値の件数を数える(件数上限つき) */
function countKey(node, key, limit = 500) {
  let n = 0;
  const stack = [node];
  while (stack.length && n < limit) {
    const cur = stack.pop();
    if (!cur || typeof cur !== 'object') continue;
    if (Object.prototype.hasOwnProperty.call(cur, key)) n += 1;
    for (const v of Object.values(cur)) if (v && typeof v === 'object') stack.push(v);
  }
  return n;
}

function collectTitles(node, key, limit = 5) {
  const out = [];
  const stack = [node];
  while (stack.length && out.length < limit) {
    const cur = stack.pop();
    if (!cur || typeof cur !== 'object') continue;
    const r = cur[key];
    if (r?.title) {
      const t = r.title.runs?.[0]?.text ?? r.title.simpleText ?? null;
      if (t) out.push(t);
    }
    for (const v of Object.values(cur)) if (v && typeof v === 'object') stack.push(v);
  }
  return out;
}

// -------------------------------------------------------------- 1. 環境確認

async function checkYtdlp() {
  const version = await run('yt-dlp', ['--version'], 15000);
  if (version.code === 0 && version.stdout.trim()) {
    return { found: true, version: version.stdout.trim(), error: null };
  }
  return {
    found: false,
    version: null,
    error: (version.stderr || version.error || '').trim().slice(0, 200) || 'not found',
  };
}

function findPackageVersion(entryPath) {
  let dir = dirname(entryPath);
  for (let i = 0; i < 6; i += 1) {
    const candidate = join(dir, 'package.json');
    try {
      const pkg = JSON.parse(readFileSync(candidate, 'utf8'));
      if (pkg?.name === 'youtubei.js') return { version: pkg.version ?? null, path: candidate };
    } catch {
      /* 親ディレクトリへ */
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return { version: null, path: null };
}

function resolveYoutubei(depsDir) {
  const bases = [depsDir, process.cwd(), HERE].filter(Boolean);
  const tried = [];
  for (const base of bases) {
    try {
      const req = createRequire(join(base, '_v6-resolve.cjs'));
      const entry = req.resolve('youtubei.js');
      const info = findPackageVersion(entry);
      return { resolved: true, base, entry, version: info.version, tried };
    } catch (e) {
      tried.push({ base, error: String(e).slice(0, 120) });
    }
  }
  return { resolved: false, base: null, entry: null, version: null, tried };
}

// ------------------------------------------ 2. InnerTube 生 fetch(前提条件)

async function checkInnertube(id, q) {
  const out = { watchPage: null, apiKeyFound: false, clientVersion: null, player: null, search: null };

  const page = await fetchText(`https://www.youtube.com/watch?v=${id}&hl=ja&gl=JP`);
  const apiKey = page.body.match(/"INNERTUBE_API_KEY":"([^"]+)"/)?.[1] ?? null;
  const clientVersion = page.body.match(/"INNERTUBE_CLIENT_VERSION":"([\d.]+)"/)?.[1] ?? null;
  out.watchPage = {
    status: page.status,
    ok: page.ok,
    bytes: page.bytes,
    title: page.body.match(/<title>([^<]{0,120})<\/title>/)?.[1] ?? null,
    inlineDataMarkers: {
      ytInitialPlayerResponse: (page.body.match(/ytInitialPlayerResponse\s*=\s*\{/g) ?? []).length,
      ytInitialData: (page.body.match(/ytInitialData\s*=\s*\{/g) ?? []).length,
    },
    error: page.error,
  };
  out.apiKeyFound = !!apiKey;
  out.clientVersion = clientVersion;
  if (!apiKey || !clientVersion) {
    out.error = 'API キー / クライアント版がページから取得できませんでした(この時点で youtubei.js の前提が未確認)';
    return out;
  }

  const context = {
    client: { clientName: 'WEB', clientVersion, hl: 'ja', gl: 'JP' },
  };

  await sleep(BETWEEN_REQUESTS_MS);
  const player = await postJson(`https://www.youtube.com/youtubei/v1/player?key=${encodeURIComponent(apiKey)}`, {
    context,
    videoId: id,
    contentCheckOk: true,
    racyCheckOk: true,
  });
  const pd = player.json;
  const formats = pd?.streamingData?.formats ?? [];
  const adaptive = pd?.streamingData?.adaptiveFormats ?? [];
  out.player = {
    status: player.status,
    ok: player.ok,
    bytes: player.bytes,
    jsonParsed: !!pd,
    playabilityStatus: pd?.playabilityStatus?.status ?? null,
    playabilityReason: pd?.playabilityStatus?.reason ?? null,
    videoTitle: pd?.videoDetails?.title ?? null,
    author: pd?.videoDetails?.author ?? null,
    lengthSeconds: pd?.videoDetails?.lengthSeconds ?? null,
    viewCount: pd?.videoDetails?.viewCount ?? null,
    formatCount: formats.length + adaptive.length,
    formatUrlCount: [...formats, ...adaptive].filter((f) => typeof f?.url === 'string').length,
    formatSignatureCipherCount: [...formats, ...adaptive].filter((f) => f?.signatureCipher || f?.cipher).length,
    error: player.error,
  };

  await sleep(BETWEEN_REQUESTS_MS);
  const search = await postJson(`https://www.youtube.com/youtubei/v1/search?key=${encodeURIComponent(apiKey)}`, {
    context,
    query: q,
  });
  const sd = search.json;
  out.search = {
    status: search.status,
    ok: search.ok,
    bytes: search.bytes,
    jsonParsed: !!sd,
    videoRendererCount: sd ? countKey(sd, 'videoRenderer') : null,
    sampleTitles: sd ? collectTitles(sd, 'videoRenderer') : null,
    error: search.error,
  };
  return out;
}

// ------------------------------------------------ 3. youtubei.js の実機能

async function checkYoutubei(resolved, args) {
  const out = { clientCreated: false, clientName: null, steps: {}, error: null };
  if (!resolved.resolved) {
    out.error = 'youtubei.js が解決できません(導入していない場合は下記の手順でインストールしてください)';
    return out;
  }
  let mod;
  try {
    mod = await import(pathToFileURL(resolved.entry).href);
  } catch (e) {
    out.error = `import 失敗: ${String(e).slice(0, 300)}`;
    return out;
  }
  const { Innertube } = mod;
  if (!Innertube) {
    out.error = 'Innertube が export に存在しません(版の不一致?)';
    return out;
  }

  let yt;
  try {
    yt = await Innertube.create({
      lang: 'ja',
      location: 'JP',
      generate_session_locally: true,
      retrieve_player: false,
      retrieve_innertube_config: false,
    });
    out.clientCreated = true;
    out.clientName = yt.session?.context?.client?.clientName ?? null;
  } catch (e) {
    out.error = `Innertube.create 失敗: ${String(e).slice(0, 300)}`;
    return out;
  }

  let first = true;
  const step = async (name, fn) => {
    if (!args.steps.includes(name)) return;
    if (!first) await sleep(BETWEEN_REQUESTS_MS);
    first = false;
    const t0 = Date.now();
    try {
      out.steps[name] = { ok: true, ms: Date.now() - t0, ...(await fn()) };
    } catch (e) {
      out.steps[name] = { ok: false, ms: Date.now() - t0, error: String(e).slice(0, 300) };
    }
  };

  await step('search', async () => {
    const r = await yt.search(args.q, { type: 'video' });
    return {
      estimatedResults: r.estimated_results ?? null,
      videoCount: r.videos?.length ?? null,
      sampleTitles: (r.videos ?? []).slice(0, 5).map((v) => v?.title?.text ?? v?.title?.toString?.() ?? null),
    };
  });

  await step('video', async () => {
    const info = await yt.getInfo(args.id);
    const b = info.basic_info ?? {};
    return {
      title: b.title ?? null,
      author: b.author ?? null,
      duration: b.duration ?? null,
      viewCount: b.view_count ?? null,
      isLive: b.is_live ?? null,
      thumbnailCount: Array.isArray(b.thumbnail) ? b.thumbnail.length : null,
      hasStreamingData: !!info.streaming_data,
      playabilityStatus: info.playability_status?.status ?? null,
      primaryKeys: Object.keys(info).slice(0, 20),
    };
  });

  await step('channel', async () => {
    const c = await yt.getChannel(args.channel);
    return {
      title: c.metadata?.title ?? null,
      videoCount: c.videos?.length ?? null,
      hasLiveStreams: c.has_live_streams ?? null,
    };
  });

  await step('playlist', async () => {
    const p = await yt.getPlaylist(args.playlist);
    return {
      title: p.info?.title?.toString?.() ?? null,
      totalItems: p.info?.total_items ?? null,
      videoCount: p.videos?.length ?? null,
    };
  });

  await step('home', async () => {
    const h = await yt.getHomeFeed();
    return { videoCount: h.videos?.length ?? null, hasContinuation: h.has_continuation ?? null };
  });

  await step('trending', async () => {
    // トレンドは専用メソッドが無いため browse を直接叩く(得られた生 JSON から件数を集計)
    const res = await yt.actions.execute('/browse', { browseId: 'FEtrending' });
    const videoRendererCount = countKey(res?.data ?? res, 'videoRenderer');
    return { videoRendererCount, sampleTitles: collectTitles(res?.data ?? res, 'videoRenderer') };
  });

  await step('livechat', async () => {
    const id = args.live ?? args.id;
    const info = await yt.getInfo(id);
    const isLive = info.basic_info?.is_live ?? null;
    let liveChat = null;
    let liveChatError = null;
    try {
      liveChat = info.getLiveChat?.();
    } catch (e) {
      liveChatError = String(e).slice(0, 200);
    }
    return {
      videoId: id,
      isLive,
      liveChatCreated: !!liveChat,
      liveChatClass: liveChat?.constructor?.name ?? null,
      liveChatInitialResponse: !!liveChat?.initial_info,
      liveChatError,
    };
  });

  return out;
}

// -------------------------------------------------------------------- main

async function main() {
  const started = Date.now();
  const args = parseArgs(process.argv.slice(2));
  const valid = ['probe', 'all', 'innertube', 'youtubei', 'ytdlp'];
  if (!valid.includes(args.mode)) {
    log(`--mode=${args.mode} は不明です。使える値: ${valid.join(' / ')}`);
    process.exitCode = 2;
    return;
  }

  const guard = guardRateLimit(args.mode);
  const out = {
    kit: 'V6',
    kitVersion: 2,
    mode: args.mode,
    startedAt: nowIso(),
    target: {
      videoId: args.id,
      query: args.q,
      channelId: args.channel,
      playlistId: args.playlist,
      liveVideoId: args.live,
      steps: args.steps,
    },
    env: {
      node: process.version,
      bun: typeof globalThis.Bun !== 'undefined' ? (globalThis.Bun.version ?? 'unknown') : null,
      platform: `${process.platform} ${process.arch}`,
      cwd: process.cwd(),
      hasFetch: typeof fetch === 'function',
    },
    warnings: [...guard.warnings],
    notes: [],
    ytdlp: null,
    youtubeiPkg: null,
    innertube: null,
    youtubei: null,
  };

  const yti = resolveYoutubei(args.deps);
  out.youtubeiPkg = {
    resolved: yti.resolved,
    base: yti.base,
    version: yti.version,
    tried: yti.tried,
  };
  if (!yti.resolved) {
    out.youtubeiPkg.installHints = [
      'キットと同じディレクトリで `npm install youtubei.js`(または `bun add youtubei.js`)を実行する',
      '別のディレクトリに入れる場合は `--deps=<そのパス>` を付ける',
    ];
  }

  out.ytdlp = await checkYtdlp();
  if (!out.ytdlp.found) {
    out.notes.push(
      'yt-dlp が見つかりません(現段階では不要 = 将来のダウンロード機能で導入します。記録として報告のみ)。',
    );
  } else {
    out.notes.push('yt-dlp が見つかりました(現段階では未使用。将来のダウンロード機能で使う予定)。');
  }

  if (args.mode === 'probe') {
    out.notes.push('probe = ネットワーク 0 回・いつでも安全に実行できます。');
  } else if (!guard.ok && !args.force) {
    out.notes.push('レート制限対策により実行を中断しました(--force を付けると実行できます)。');
    process.exitCode = 3;
  } else {
    if (args.mode === 'all' || args.mode === 'innertube') {
      out.innertube = await checkInnertube(args.id, args.q);
      if (out.innertube.apiKeyFound && out.innertube.player?.jsonParsed) {
        out.notes.push('InnerTube の /player が応答しています(youtubei.js の前提は満たせています)。');
      } else if (out.innertube.apiKeyFound) {
        out.notes.push('API キーは取得できましたが /player の応答は要確認です(結果の JSON を確認してください)。');
      }
    }
    if (args.mode === 'all' || args.mode === 'youtubei') {
      if (args.mode === 'all') await sleep(BETWEEN_REQUESTS_MS);
      out.youtubei = await checkYoutubei(yti, args);
      if (!out.youtubei.clientCreated) {
        out.notes.push('youtubei.js のクライアント生成または実行で問題が出ています(結果の JSON を確認してください)。');
      } else {
        const entries = Object.entries(out.youtubei.steps);
        const failed = entries.filter(([, v]) => !v.ok).map(([k]) => k);
        if (!entries.length) out.notes.push('youtubei.js: クライアントは生成できましたが、実行したステップはありません。');
        else if (failed.length) out.notes.push(`youtubei.js: 実行 ${entries.length} ステップ中 ${failed.length} 件が失敗(${failed.join(', ')})。結果の JSON を確認してください。`);
        else out.notes.push(`youtubei.js: 実行した ${entries.length} ステップはすべて成功しています。`);
      }
    }
    if (args.mode === 'ytdlp') {
      out.notes.push('ytdlp モード = 存在確認のみ(実ダウンロードは行いません。DL 機能は将来対応)。');
    }
    writeState(args.mode);
    const requestCount = args.mode === 'innertube' ? 4 : args.mode === 'youtubei' ? args.steps.length : 0;
    if (args.mode === 'all') {
      out.notes.push(`この実行の外部リクエスト数(概算) = ${4 + args.steps.length} 件(リクエスト間には待ちを入れています)。`);
    } else if (requestCount) {
      out.notes.push(`この実行の外部リクエスト数(概算) = ${requestCount} 件。`);
    }
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
