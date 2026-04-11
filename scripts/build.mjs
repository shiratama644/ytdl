import { spawn } from "node:child_process";

const isTermux =
  typeof process.env.TERMUX_VERSION === "string" ||
  process.env.PREFIX?.includes("com.termux") === true ||
  typeof process.env.TERMUX_APP_PID === "string";

const args = ["build", ...(isTermux ? ["--webpack"] : [])];
const child = spawn("next", args, { stdio: "inherit", shell: false });

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
