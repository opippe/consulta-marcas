import { test } from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory()
    ? filesIn(join(directory, entry.name)) : join(directory, entry.name)))).flat();
}

test("production static artifacts point to the API and do not contain server secrets", async () => {
  for (const root of ["dist/client", "crm-web/dist"]) {
    const files = await filesIn(root);
    assert.ok(files.some(file => /index\.html$/.test(file)));
    assert.ok(!files.some(file => /(?:\.env|\.map)$/.test(file)));
    const textFiles = files.filter(file => /\.(js|html|rsc|json)$/.test(file));
    const contents = (await Promise.all(textFiles.map(file => readFile(file, "utf8")))).join("\n");
    assert.ok(contents.includes("https://api.55marcas.com.br"), `${root}: URL da API ausente`);
    assert.ok(!contents.includes("http://localhost:3100"), `${root}: API local no build`);
    // Compare local secret values without logging their contents or including fixtures.
    for (const envPath of [".env", ".env.local", "api-bun/.env", "api-bun/.env.local"]) {
      const env = await readFile(envPath, "utf8").catch(() => "");
      for (const line of env.split(/\r?\n/)) {
        const match = line.match(/^(DATABASE_URL|INFOSIMPLES_TOKEN|BETTER_AUTH_SECRET|PROPOSAL_LINK_SECRET|RATE_LIMIT_SALT|R2_SECRET_ACCESS_KEY)\s*=\s*(.*?)\s*$/);
        if (!match) continue;
        const value = match[2].replace(/^['"]|['"]$/g, "");
        if (value.length >= 12) assert.ok(!contents.includes(value), `${root}: segredo ${match[1]} presente`);
      }
    }
  }
  assert.match(await readFile("crm-web/dist/_redirects", "utf8"), /\/\* \/index.html 200/);
  assert.match(await readFile("crm-web/dist/_headers", "utf8"), /noindex, nofollow/);
  assert.ok((await readFile("dist/client/resultados/index.html", "utf8")).length > 100);
});
