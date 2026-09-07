import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
// These are public URLs compiled into the frontend, never server credentials.
const env = {
  ...process.env,
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.55marcas.com.br",
  VITE_API_BASE_URL: process.env.VITE_API_BASE_URL || "https://api.55marcas.com.br",
  VITE_PUBLIC_PROPOSAL_URL: process.env.VITE_PUBLIC_PROPOSAL_URL || "https://crm.55marcas.com.br",
};
function run(cwd, args) {
  const result = spawnSync(process.execPath, args, { cwd, env, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
run(root, ["api-bun/node_modules/typescript/bin/tsc", "--noEmit", "-p", "api-bun/tsconfig.json"]);
run(fileURLToPath(new URL("../crm-web/", import.meta.url)), ["node_modules/typescript/bin/tsc", "--noEmit"]);
run(fileURLToPath(new URL("../crm-web/", import.meta.url)), ["node_modules/vite/bin/vite.js", "build"]);
run(root, ["scripts/build-pages.mjs"]);
