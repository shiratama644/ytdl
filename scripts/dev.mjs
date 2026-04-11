import { spawn } from "node:child_process";

const OS = (() => {
  const platform = process.platform;
  const env = process.env;

  const isTermux =
    env.PREFIX?.includes("/data/data/com.termux") === true ||
    env.HOME?.includes("/data/data/com.termux") === true;

  if (isTermux) return "termux";
  if (platform === "win32") return "windows";
  if (platform === "darwin") return "macos";

  if (platform === "linux") {
    if (env.WSL_DISTRO_NAME || env.WSL_INTEROP) return "wsl";
    if (env.MUSL || env.ALPINE_VERSION) return "alpine";
    return "linux";
  }

  return "unknown";
})();

const useWebpack = OS === "termux" || OS === "alpine";
const args = ["dev", ...(useWebpack ? ["--webpack"] : [])];
const child = spawn("next", args, { stdio: "inherit", shell: false });

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
