import assert from "node:assert/strict";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the marca consultation page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Consulta de marcas \| INPI<\/title>/i);
  assert.match(html, /Descubra grátis agora se a sua marca está disponível/i);
  assert.match(html, /Nome da marca/i);
  assert.match(html, /Consultar marca/i);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Starter Project/i);
});

test("server-renders the local result preview", async () => {
  const response = await render("/?preview=resultados");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /Prévia local/i);
  assert.match(html, /925847316/);
  assert.doesNotMatch(html, /Os resultados da sua consulta aparecerão aqui\./i);
});
