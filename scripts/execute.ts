/**
 * 一括起動スクリプト（Production/Preview 構成）。
 *
 *   bun scripts/execute.ts   （または `bun run start`）
 *
 * 実行順序:
 *   1. `bun install` で依存関係の最新化・確認
 *   2. `bun run build` でクライアント SPA をビルド（Vite JS API on Bun）
 *   3. ビルド成功後、バックエンド API サーバーと Web クライアント (Vite preview on Bun) を並列起動
 *   4. 各プロセスの標準出力・標準エラー出力を色分け（ANSI エスケープ）して表示
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
  // Web クライアント（vite preview）: マゼンタ
  client: { tag: "CLIENT ", fg: "\x1b[35m" },
} as const;

type Kind = keyof typeof colors;

/** 1 行に色付きタグを付けて出力する。 */
function logLine(kind: Kind, line: string): void {
  const { tag, fg } = colors[kind];
  const text = line.replace(/\s+$/, "");
  if (text.length === 0) return;
  process.stdout.write(`${fg}${BOLD}[${tag}]${RESET} ${fg}${text}${RESET}\n`);
}

/** 子プロセスの stdout/stderr を行単位で色付けして転送する。 */
function pipeOutput(
  kind: Kind,
  proc: {
    stdout?: ReadableStream<Uint8Array> | null;
    stderr?: ReadableStream<Uint8Array> | null;
  },
): void {
  const decoder = new TextDecoder();
  let buffer = "";

  const pump = (stream: ReadableStream<Uint8Array> | null | undefined) => {
    if (!stream) return;
    (async () => {
      try {
        const reader = stream.getReader();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let nl = buffer.indexOf("\n");
          while (nl >= 0) {
            logLine(kind, buffer.slice(0, nl));
            buffer = buffer.slice(nl + 1);
            nl = buffer.indexOf("\n");
          }
        }
      } catch {
        /* ストリーム終了 */
      }
    })();
  };

  pump(proc.stdout);
  pump(proc.stderr);
}

/** bun のサブコマンドを spawn して出力をパイプ */
function spawnProcess(kind: Kind, cmd: string[], cwd = process.cwd()) {
  const proc = Bun.spawn(cmd, {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
    stdin: "inherit",
  });
  pipeOutput(kind, proc);
  return proc;
}

async function main(): Promise<number> {
  console.log(`${BOLD}=== ytdl All-in-One Runner ===${RESET}`);

  // ── 1. bun install ──────────────────────────────────────────────────
  logLine("install", "Running bun install...");
  const install = Bun.spawn(["bun", "install"], {
    cwd: process.cwd(),
    stdout: "pipe",
    stderr: "pipe",
    stdin: "inherit",
  });
  pipeOutput("install", install);
  const installExit = await install.exited;
  if (installExit !== 0) {
    logLine("install", `Installation failed (exit code ${installExit}).`);
    return installExit ?? 1;
  }
  logLine("install", "Dependencies up to date.");

  // ── 2. bun run build (tsc + Vite JS API on Bun) ─────────────────────
  logLine("build", "Building client SPA (bun run build)...");
  const build = Bun.spawn(["bun", "run", "build"], {
    cwd: process.cwd(),
    stdout: "pipe",
    stderr: "pipe",
    stdin: "inherit",
  });
  pipeOutput("build", build);
  const buildExit = await build.exited;
  if (buildExit !== 0) {
    logLine("build", `Build failed (exit code ${buildExit}). Servers will not be started.`);
    return buildExit ?? 1;
  }
  logLine("build", "Build completed successfully.");

  // ── 3. バックエンドサーバー & Web クライアントを並列起動 ────────────
  logLine("server", "Starting backend API server (port 3000)...");
  const serverProc = spawnProcess("server", ["bun", "server/index.ts"]);

  logLine("client", "Starting client preview server (port 4173)...");
  const clientProc = spawnProcess("client", ["bun", "scripts/preview.ts"]);

  const children = [
    { name: "SERVER" as const, proc: serverProc },
    { name: "CLIENT" as const, proc: clientProc },
  ];

  const shutdown = (signal: string) => {
    logLine("build", `Received ${signal}. Shutting down all processes...`);
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
    children.map(async (c) => {
      const code = await c.proc.exited;
      return { name: c.name, code };
    }),
  );

  for (const e of exits) {
    logLine("build", `${e.name} exited with code ${e.code}.`);
  }

  const failed = exits.find((e) => e.code !== 0);
  if (failed) {
    shutdown("CHILD-EXIT");
    return failed.code ?? 1;
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
