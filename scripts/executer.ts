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
 * - Termux / Proot-Distro（Android 上、多くは ARM64）では webpack ビルドが
 *   メモリ消費が大きく、SWC のネイティブバイナリ起因で失敗しやすい。
 * - Turbopack（Rust 製）は軽量・高速で、制約のあるモバイル環境に適している。
 * - 通常の OS（x86_64 等）では互換性・安定性の高い webpack（既定）を使用する。
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
  return isTermuxOrProot() ? 'Termux / Proot-Distro (Android)' : '通常の OS';
}

/**
 * ビルダーを決定する。
 * - auto: Termux/Proot なら Turbopack、通常 OS なら webpack
 * - YTDL_BUNDLER で明示上書き可能
 */
function resolveBundler(preference: Bundler): 'webpack' | 'turbopack' {
  if (preference === 'webpack' || preference === 'turbopack') return preference;
  // auto
  return isTermuxOrProot() ? 'turbopack' : 'webpack';
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
        log('cache', `既存のキャッシュを利用します: ${cacheDir}`);
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
    log('cache', `ビルドキャッシュを永続化しました: ${cacheDir}`);
    return cacheDir;
  } catch (error) {
    warn(
      `ビルドキャッシュの永続化に失敗しました（キャッシュなしで継続します）: ${
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
      warn(`未知の引数: ${arg}、無視します。`);
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
実行環境（Termux/Proot-Distro か通常OSか）を判定し、ビルダーを自動選択して
pnpm install / pnpm build / pnpm start を実行します。

  使い方:
    pnpm launch [オプション]
    node  scripts/executer.ts [オプション]   (直接実行、pnpm launch と同じ)

  オプション:
    --no-install          pnpm install をスキップ
    --no-build            pnpm build をスキップ
    --no-start            pnpm start をスキップ（サーバーを起動しない）
    --bundler=webpack     ビルダーを webpack に固定
    --bundler=turbopack   ビルダーを Turbopack に固定
    --bundler=auto        環境に応じて自動選択（既定）
    -h, --help            このヘルプを表示

  環境変数:
    YTDL_BUNDLER=auto|webpack|turbopack  (自作のビルダー指定)
    YTDL_BUILD_CACHE_DIR=<path>          (ビルドキャッシュの永続先、既定 .cache/next-build)${RESET}`);
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
      reject(new Error(`「${command}」の起動に失敗しました: ${err.message}`));
    });
    child.on('close', (code) => {
      if (code === 0) {
        resolvePromise();
      } else {
        const detail = stderr.trim().split('\n').slice(-3).join(' ').slice(0, 300);
        reject(
          new Error(
            `「${command}」が終了コード ${code} で失敗しました。${
              detail ? ` 詳細: ${detail}` : ''
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
    if (error instanceof Error && /起動に失敗|ENOENT|command not found/i.test(error.message)) {
      warn('pnpm が見つからないため corepack でフォールバックします。');
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
    if (/ビルドスクリプト|build script|IGNORED_BUILDS|LIFECYCLE_SCRIPT_FAILED|TLS|certificate|UNABLE_TO_VERIFY|エラー|install/i.test(msg)) {
      warn(
        '依存関係のビルドスクリプト（ffmpeg-static 等）を実行できませんでした。\n' +
          '        ビルドスクリプトをスキップして再実行します。ffmpeg はシステムのバイナリを利用します。',
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
    fail('package.json が見つかりません。リポジトリルートで実行してください。');
    process.exit(1);
  }

  try {
    if (opts.install) {
      await installDependencies();
    } else {
      log('install', 'スキップ');
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
      log('build', 'スキップ');
    }

    if (opts.start) {
      // pnpm start はサーバーを起動してブロックする（完了しない）。
      await runPnpm(['start'], 'start');
    } else {
      log('start', 'スキップ（サーバーを起動しません）');
    }
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// シグナルを子プロセスへ伝播（Ctrl+C 等）
for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    info(`\n${sig} を受信しました。終了します。`);
    process.exit(0);
  });
}

// 実行起点は import.meta.main で判定する（Node v24+）。
// 単体テストからこのモジュールを import した場合に main() を走らせないため。
if (import.meta.main) {
  void main();
}
