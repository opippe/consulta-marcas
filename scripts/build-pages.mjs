import { spawnSync } from "node:child_process";

// Public build settings only. Never copy server secrets into the static output.
const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
if (!apiUrl || new URL(apiUrl).protocol !== "https:") {
  throw new Error("Defina NEXT_PUBLIC_API_BASE_URL com a URL HTTPS da API de produção.");
}
const result = spawnSync(process.execPath, ["node_modules/vinext/dist/cli.js", "build"], {
  stdio: "inherit",
  env: { ...process.env, STATIC_EXPORT: "true", NEXT_PUBLIC_BASE_PATH: "", GITHUB_PAGES: "false" },
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
