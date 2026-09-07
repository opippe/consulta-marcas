import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { delimiter, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const windows = process.platform === "win32";
const executableName = windows ? "railway.exe" : "railway";
const candidates = [join(root, "node_modules", "@railway", "cli", "bin", executableName)];

// npm exposes its JS entrypoint to scripts, avoiding cmd/PowerShell shims entirely.
if (process.env.npm_execpath?.endsWith(".js")) {
  const result = spawnSync(process.execPath, [process.env.npm_execpath, "root", "--global"], { encoding: "utf8" });
  if (result.status === 0) candidates.push(join(result.stdout.trim(), "@railway", "cli", "bin", executableName));
}
if (windows && process.env.APPDATA) {
  candidates.push(join(process.env.APPDATA, "npm", "node_modules", "@railway", "cli", "bin", executableName));
}
for (const directory of (process.env.PATH ?? "").split(delimiter).filter(Boolean)) {
  candidates.push(resolve(directory, executableName));
}

const executable = candidates.find(existsSync);
if (!executable) {
  console.error("Railway CLI não encontrada. Instale com: npm install --global @railway/cli");
  process.exit(1);
}
const args = process.argv.slice(2);
if (!args.length) args.push("--help");
const result = spawnSync(executable, args, {
  cwd: root,
  stdio: "inherit",
  // The IaC SDK reads `_` to resolve the native CLI it calls internally.
  env: { ...process.env, _: executable, PATH: `${dirname(executable)}${delimiter}${process.env.PATH ?? ""}` },
});
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
