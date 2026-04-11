import { spawn } from "node:child_process";

const useWebpack =
  process.env.NEXT_DEV_WEBPACK === "1" ||
  process.env.NEXT_DEV_WEBPACK === "true" ||
  process.env.GITHUB_ACTIONS === "true";

const args = ["dev", ...(useWebpack ? ["--webpack"] : [])];
const child = spawn("next", args, { stdio: "inherit", shell: false });

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
