import { type ChildProcess, spawn } from "node:child_process";
import readline from "node:readline";

/**
 * 一括起動スクリプト (pnpm + Node.js / tsx 構成)。
 *
 *   pnpm start   （または `npx tsx scripts/execute.ts`）
 *
 * 実行順序:
 *   1. `pnpm install` で依存関係を確認
 *   2. `pnpm run build` でクライアント SPA をビルド
 *   3. ビルド成功後、バックエンド API サーバー (tsx server/index.ts) と
 *      Web クライアント (vite preview) を並列起動
 *   4. 各プロセスの出力を色分けタグ付きでコンソール表示
 */

// ── ANSI 色（ログの色分け） ──────────────────────────────────────────────
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

const colors = {
  // インストール: 黄色
  install: { tag: "INSTALL", fg: "\x1b[33m" },
  // ビルド: シアン
  build: { tag: "BUILD  ", fg: "\x1b[36m" },
  // バックエンドサーバー: 緑
  server: { tag: "SERVER ", fg: "\x1b[32m" },
  // Web クライアント (vite preview): マゼンタ
  client: { tag: "CLIENT ", fg: "\x1b[35m" },
} as const;

type Kind = keyof typeof colors;

/** 1 行に色付きタグを付けて出力する */
function logLine(kind: Kind, line: string): void {
  const { tag, fg } = colors[kind];
  const text = line.replace(/\s+$/, "");
  if (text.length === 0) return;
  process.stdout.write(`${fg}${BOLD}[${tag}]${RESET} ${fg}${text}${RESET}\n`);
}

/** 子プロセスの stdout/stderr を行単位でパイプして色付け出力 */
function pipeProcessOutput(kind: Kind, proc: ChildProcess): void {
  if (proc.stdout) {
    const rlOut = readline.createInterface({ input: proc.stdout });
    rlOut.on("line", (line) => logLine(kind, line));
  }
  if (proc.stderr) {
    const rlErr = readline.createInterface({ input: proc.stderr });
    rlErr.on("line", (line) => logLine(kind, line));
  }
}

/** OS に合わせたコマンド名を解決 (Windows では .cmd を考慮) */
function resolveCommand(cmd: string): string {
  if (process.platform === "win32") {
    if (cmd === "pnpm" || cmd === "npx" || cmd === "npm") {
      return `${cmd}.cmd`;
    }
  }
  return cmd;
}

/** コマンドを非同期実行して終了コードを待つ (shell: false で安全に実行) */
function runCommand(kind: Kind, command: string, args: string[]): Promise<number> {
  return new Promise((resolve) => {
    const resolvedCmd = resolveCommand(command);
    const proc = spawn(resolvedCmd, args, {
      cwd: process.cwd(),
      stdio: ["inherit", "pipe", "pipe"],
      shell: false,
    });
    pipeProcessOutput(kind, proc);
    proc.on("close", (code) => resolve(code ?? 0));
    proc.on("error", (err) => {
      logLine(kind, `Failed to start process: ${err.message}`);
      resolve(1);
    });
  });
}

/** 常駐プロセスを起動 (shell: false で安全に実行) */
function startLongRunningProcess(kind: Kind, command: string, args: string[]): ChildProcess {
  const resolvedCmd = resolveCommand(command);
  const proc = spawn(resolvedCmd, args, {
    cwd: process.cwd(),
    stdio: ["inherit", "pipe", "pipe"],
    shell: false,
  });
  pipeProcessOutput(kind, proc);
  return proc;
}

async function main(): Promise<number> {
  console.log(`${BOLD}=== ytdl All-in-One Runner (pnpm) ===${RESET}`);

  // ── 1. pnpm install ──────────────────────────────────────────────────
  logLine("install", "Running pnpm install...");
  const installCode = await runCommand("install", "pnpm", ["install"]);
  if (installCode !== 0) {
    logLine("install", `Installation failed (exit code ${installCode}).`);
    return installCode;
  }
  logLine("install", "Dependencies up to date.");

  // ── 2. pnpm run build ────────────────────────────────────────────────
  logLine("build", "Building client SPA (pnpm run build)...");
  const buildCode = await runCommand("build", "pnpm", ["run", "build"]);
  if (buildCode !== 0) {
    logLine("build", `Build failed (exit code ${buildCode}). Servers will not be started.`);
    return buildCode;
  }
  logLine("build", "Build completed successfully.");

  // ── 3. バックエンドサーバー & Web クライアントを並列起動 ────────────
  logLine("server", "Starting backend API server (port 3000)...");
  const serverProc = startLongRunningProcess("server", "npx", ["tsx", "server/index.ts"]);

  logLine("client", "Starting client preview server (port 4173)...");
  const clientProc = startLongRunningProcess("client", "pnpm", ["run", "preview"]);

  const children: { name: string; proc: ChildProcess }[] = [
    { name: "SERVER", proc: serverProc },
    { name: "CLIENT", proc: clientProc },
  ];

  const shutdown = (signal: string) => {
    logLine("build", `Received ${signal}. Shutting down child processes...`);
    for (const c of children) {
      try {
        c.proc.kill("SIGTERM");
      } catch {
        /* 既に終了済み */
      }
    }
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  // いずれかの子プロセスの終了を待機
  const exits = await Promise.all(
    children.map(
      (c) =>
        new Promise<{ name: string; code: number }>((resolve) => {
          c.proc.on("close", (code) => resolve({ name: c.name, code: code ?? 0 }));
        }),
    ),
  );

  for (const e of exits) {
    logLine("build", `${e.name} exited with code ${e.code}.`);
  }

  const failed = exits.find((e) => e.code !== 0);
  if (failed) {
    shutdown("CHILD-EXIT");
    return failed.code;
  }

  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    logLine(
      "build",
      `Unexpected error: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}`,
    );
    process.exit(1);
  });
