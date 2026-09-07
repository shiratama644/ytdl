#!/usr/bin/env node
/**
 * scripts/executer.ts
 *
 * ytdl の起動スクリプト。実行環境（Termux / Proot-Distro か通常の OS か）を判定し、
 * Next.js のビルダー（webpack / Turbopack）を自動選択して、
 *   pnpm install -> pnpm build -> pnpm start
 * を実行する。
 *
 * ## なぜビルダーを出し分けるのか
 * - Termux / Proot-Distro（Android 上、多くは ARM64）では Turbopack は使えない。
 *   Android 向けのネイティブ SWC / Turbopack バイナリが提供されておらず、Next は
 *   WASM フォールバックへ落ちるが、`turbo.createProject` 等の API が未実装で
 *   dev / build が失敗する。そのためモバイル環境では常に webpack を使用する。
 * - 通常の OS（x86_64 等）でも、`serverExternalPackages`（youtubei.js / ffmpeg-static /
 *   fluent-ffmpeg）の外部解決や安定性を優先し、webpack（既定）を使用する。
 *   Turbopack は明示的に `YTDL_BUNDLER=turbopack` / `--bundler=turbopack` を指定した
 *   場合のみ用いる（モバイル環境では不可）。
 *
 * ## 実行環境の上書き
 *   YTDL_BUNDLER=auto|webpack|turbopack   … ビルダーを明示指定（既定: auto）
 *   YTDL_BUILD_CACHE_DIR=<path>           … ビルドキャッシュの永続先を変更（既定: <root>/.cache/next-build）
 *
 * ## ビルドキャッシュ
 *   Next.js のビルドキャッシュ（webpack / turbopack 共通の `.next/cache`）を
 *   `.cache/next-build/next-cache` への symlink に差し替えて永続化する。`.next` を
 *   再生成・削除してもキャッシュは失われない。
 *   - Webpack: `.next/cache/webpack` の filesystem キャッシュが永続化される。
 *   - Turbopack: `next build --turbopack` が書く `.next/cache`（.tsbuildinfo 等）が永続化される。
 *
 * ## 実行方法
 *   pnpm launch                  # 通常起動（環境判定 → install → build → start）
 *   pnpm launch -- --no-install --no-build --no-start   # ステップをスキップ（テスト・部分実行用）
 *
 *   # 直接 node で実行する場合（pnpm launch と同じ）
 *   node scripts/executer.ts [オプション]
 */

import { spawn } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, rmSync, symlinkSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

type Bundler = 'auto' | 'webpack' | 'turbopack';

interface Options {
  bundler: Bundler;
  install: boolean;
  build: boolean;
  start: boolean;
}

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RED = '\x1b[31m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

function log(step: string, message: string): void {
  console.log(`${CYAN}[${step}]${RESET} ${message}`);
}
function warn(message: string): void {
  console.warn(`${YELLOW}⚠ ${message}${RESET}`);
}
function info(message: string): void {
  console.log(`${message}`);
}
function fail(message: string): void {
  console.error(`${RED}✖ ${message}${RESET}`);
}

/* ----------------------------------------------------------------------------
 * 環境判定（Termux / Proot-Distro か通常の OS か）
 * ------------------------------------------------------------------------- */

/**
 * Android 上の Termux / Proot-Distro を検出する。
 * 通常の Linux デスクトップ/サーバーでは該当しない。
 */
export function isTermuxOrProot(): boolean {
  // 1. $PREFIX が termux のホームを指す（Termux 本体・Proot-Distro 双方で設定される）
  const prefix = process.env.PREFIX;
  if (prefix && /termux|com\.termux|data\/data/i.test(prefix)) return true;

  // 2. $TERMUX_VERSION が設定されている（Termux 固有）
  if (process.env.TERMUX_VERSION) return true;

  // 3. Android の基本環境変数（Proot / PRoot-Distro 上でも設定される）
  if (process.env.ANDROID_ROOT || process.env.ANDROID_DATA) return true;

  // 4. Termux のホームディレクトリ実体が存在する
  if (existsSync('/data/data/com.termux')) return true;

  // 5. /proc/version に Android の表記が含まれる（Proot-Distro で有効）
  try {
    const procVersion = readFileSync('/proc/version', 'utf8');
    if (/android/i.test(procVersion)) return true;
  } catch {
    /* ignore */
  }

  return false;
}

/** 実行環境の表示名（ログ用）。 */
function platformName(): string {
  return isTermuxOrProot() ? 'Termux / Proot-Distro (Android)' : 'Regular OS';
}

/**
 * ビルダーを決定する。
 * - Termux / Proot-Distro では Turbopack が使えないため、常に webpack を強制する
 *   （`--bundler=turbopack` を指定しても警告して webpack に落とす）。
 * - 通常の OS では既定 webpack。Turbopack は明示指定時のみ。
 */
export function resolveBundler(preference: Bundler): 'webpack' | 'turbopack' {
  // モバイル環境ではネイティブ Turbopack/SWC が無く WASM フォールバックも未実装のため、
  // 常に webpack を使用する（本リポジトリは serverExternalPackages の外部解決を webpack に依存）。
  if (isTermuxOrProot()) {
    if (preference === 'turbopack') {
      warn('Turbopack is not available on Termux / Proot-Distro. Falling back to webpack.');
    }
    return 'webpack';
  }
  if (preference === 'webpack' || preference === 'turbopack') return preference;
  // auto
  return 'webpack';
}

/* ----------------------------------------------------------------------------
 * ビルドキャッシュ（webpack / turbopack 共通）の永続化
 * ------------------------------------------------------------------------- */

/**
 * 永続ビルドキャッシュのルートを返す。
 * `YTDL_BUILD_CACHE_DIR` が指定されていればそれを、無ければ `<root>/.cache/next-build` を使う。
 * 既定値は `.cache/`（gitignore 済み）配下で、`.next` を消しても失われない。
 */
export function buildCacheRoot(root = ROOT): string {
  const env = process.env.YTDL_BUILD_CACHE_DIR;
  if (env) return resolve(root, env);
  return resolve(root, '.cache', 'next-build');
}

/**
 * Next.js のビルドキャッシュ（webpack / turbopack 共通の `.next/cache`）を失われない場所へ
 * 誘導する。`.next/cache` を `<root>/.cache/next-build/next-cache` への symlink に差し替えることで、
 * `.next` の再生成・削除でもキャッシュは永続ディレクトリに残る。
 *
 * - 失敗してもビルドは継続できる（キャッシュなしにフォールバック）。警告のみ出す。
 * - ビルドキャッシュディレクトリは使い捨てなので、既存の実体は退避してから symlink 化する。
 *
 * @returns 実際に永続化したキャッシュディレクトリ（失敗時は null）
 */
export function setupBuildCache(root = ROOT): string | null {
  const cacheRoot = buildCacheRoot(root);
  const cacheDir = resolve(cacheRoot, 'next-cache');
  const nextDir = resolve(root, '.next');
  const nextCache = resolve(nextDir, 'cache');

  try {
    mkdirSync(cacheDir, { recursive: true });
    mkdirSync(nextDir, { recursive: true });

    // 既に .next/cache が cacheDir を指す symlink なら再利用する。
    try {
      const st = lstatSync(nextCache);
      if (st.isSymbolicLink() && realpathSync(nextCache) === cacheDir) {
        log('cache', `Reusing existing build cache: ${cacheDir}`);
        return cacheDir;
      }
    } catch {
      /* .next/cache はまだ存在しない */
    }

    // 実体（通常のディレクトリや別の symlink）がある場合は退避してから差し替える。
    if (existsSync(nextCache)) {
      rmSync(nextCache, { recursive: true, force: true });
    }
    symlinkSync(cacheDir, nextCache);
    log('cache', `Persisted build cache to: ${cacheDir}`);
    return cacheDir;
  } catch (error) {
    warn(
      `Failed to persist the build cache (continuing without cache): ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return null;
  }
}

/* ----------------------------------------------------------------------------
 * 引数パース
 * ------------------------------------------------------------------------- */

function parseArgs(argv: string[]): Options {
  const opts: Options = {
    bundler: 'auto',
    install: true,
    build: true,
    start: true,
  };
  for (const arg of argv) {
    // pnpm が script 引数を `--` 区切りで渡す場合があるため、`--` 自体は無視する。
    if (arg === '--') continue;
    else if (arg === '--no-install') opts.install = false;
    else if (arg === '--no-build') opts.build = false;
    else if (arg === '--no-start') opts.start = false;
    else if (arg === '--install') opts.install = true;
    else if (arg === '--build') opts.build = true;
    else if (arg === '--start') opts.start = true;
    else if (/^--bundler=/.test(arg)) {
      const v = arg.split('=')[1];
      if (v === 'auto' || v === 'webpack' || v === 'turbopack') opts.bundler = v;
    } else if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    } else {
      warn(`Unknown argument: ${arg}. Ignoring.`);
    }
  }
  // 環境変数による上書き（CLI 引数が無ければ環境変数を優先）
  const envBundler = process.env.YTDL_BUNDLER;
  if (envBundler && (envBundler === 'auto' || envBundler === 'webpack' || envBundler === 'turbopack')) {
    opts.bundler = envBundler;
  }
  return opts;
}

function printUsage(): void {
  info(`${BOLD}ytdl executer${RESET}
Detects the environment (Termux/Proot-Distro or a regular OS), selects the
Bundler, and runs pnpm install / pnpm build / pnpm start.

  Usage:
    pnpm launch [options]
    node  scripts/executer.ts [options]   (direct run, same as pnpm launch)

  Options:
    --no-install          skip pnpm install
    --no-build            skip pnpm build
    --no-start            skip pnpm start (do not start the server)
    --bundler=webpack     force the webpack bundler
    --bundler=turbopack   force the Turbopack bundler (unavailable on Termux/Proot-Distro → webpack)
    --bundler=auto        auto-select by environment (default; always webpack on mobile)
    -h, --help            print this help

  Environment variables:
    YTDL_BUNDLER=auto|webpack|turbopack  (override the bundler)
    YTDL_BUILD_CACHE_DIR=<path>          (build cache directory, default .cache/next-build)${RESET}`);
}

/* ----------------------------------------------------------------------------
 * コマンド実行
 * ------------------------------------------------------------------------- */

function runCommand(command: string, args: string[], label: string): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    log(label, `${GREEN}${command} ${args.join(' ')}${RESET}`);
    const child = spawn(command, args, {
      cwd: ROOT,
      stdio: ['inherit', 'inherit', 'pipe'],
      env: process.env,
    });
    let stderr = '';
    if (child.stderr) {
      child.stderr.setEncoding('utf8');
      child.stderr.on('data', (d: string) => {
        stderr += d;
        // 親の stderr にも流す（本来のエラーを見せる）
        process.stderr.write(d);
      });
    }
    child.on('error', (err) => {
      reject(new Error(`Failed to start "${command}": ${err.message}`));
    });
    child.on('close', (code) => {
      if (code === 0) {
        resolvePromise();
      } else {
        const detail = stderr.trim().split('\n').slice(-3).join(' ').slice(0, 300);
        reject(
          new Error(
            `"${command}" exited with code ${code}.${
              detail ? `  Detail: ${detail}` : ''
            }`,
          ),
        );
      }
    });
  });
}

/** pnpm の実行を試みる。見つからない場合は corepack でフォールバック。 */
async function runPnpm(args: string[], label: string): Promise<void> {
  try {
    await runCommand('pnpm', args, label);
  } catch (error) {
    if (error instanceof Error && /Failed to start|ENOENT|command not found/i.test(error.message)) {
      warn('pnpm not found; falling back to corepack.');
      await runCommand('corepack', ['pnpm', ...args], label);
    } else {
      throw error;
    }
  }
}

/**
 * pnpm install を実行する。
 * ネットワーク制限のある環境で ffmpeg-static などのビルドスクリプトが実行できない
 * （TLS 検証エラー等）とインストール全体が失敗する。その場合はビルドスクリプトを
 * スキップして再実行し、警告を出した上で処理を続行する（アプリの ffmpeg は
 * システム ffmpeg / FFMPEG_BIN にフォールバックするため、ビルド・起動には支障がない）。
 */
async function installDependencies(): Promise<void> {
  try {
    await runPnpm(['install'], 'install');
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    // ビルドスクリプト起因（ffmpeg-static 等）の失敗のみフォールバック
    if (/build script|IGNORED_BUILDS|LIFECYCLE_SCRIPT_FAILED|TLS|certificate|UNABLE_TO_VERIFY|install/i.test(msg)) {
      warn(
        'Failed to run the dependency build scripts (e.g. ffmpeg-static).\n' +
          '        Skipping build scripts and retrying. ffmpeg will use the system binary.',
      );
      await runPnpm(['install', '--ignore-scripts'], 'install (--ignore-scripts)');
    } else {
      throw error;
    }
  }
}

/* ----------------------------------------------------------------------------
 * メイン
 * ------------------------------------------------------------------------- */

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  const bundler = resolveBundler(opts.bundler);
  const platform = platformName();

  console.log(`${BOLD}${'='.repeat(60)}`);
  console.log(`  ytdl executer`);
  console.log(`  platform: ${CYAN}${platform}${RESET}`);
  console.log(`  bundler : ${CYAN}${bundler}${RESET}`);
  console.log(`${'='.repeat(60)}${RESET}`);

  if (!existsSync(resolve(ROOT, 'package.json'))) {
    fail('package.json not found. Run this from the repository root.');
    process.exit(1);
  }

  try {
    if (opts.install) {
      await installDependencies();
    } else {
      log('install', 'Skipped');
    }

    if (opts.build) {
      // ビルドキャッシュ（webpack / turbopack 共通）を永続ディレクトリへ誘導する。
      // 失敗しても cache なしでビルドを継続する。
      setupBuildCache();

      const buildArgs = bundler === 'turbopack'
        ? ['exec', 'next', 'build', '--turbopack']
        : ['exec', 'next', 'build'];
      // webpack は既定ビルダーなので、明示的に --turbopack を付けない。
      await runPnpm(buildArgs, 'build');
    } else {
      log('build', 'Skipped');
    }

    if (opts.start) {
      // pnpm start はサーバーを起動してブロックする（完了しない）。
      await runPnpm(['start'], 'start');
    } else {
      log('start', 'Skipped (server will not be started)');
    }
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// シグナルを子プロセスへ伝播（Ctrl+C 等）
for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    info(`\nReceived ${sig}. Shutting down.`);
    process.exit(0);
  });
}

// 実行起点は import.meta.main で判定する（Node v24+）。
// 単体テストからこのモジュールを import した場合に main() を走らせないため。
if (import.meta.main) {
  void main();
}
