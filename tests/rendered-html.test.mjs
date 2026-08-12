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

test("server-renders the Flavio Bolsonaro Marcas landing page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Flavio Bolsonaro Marcas \| Registro de marcas<\/title>/i);
  assert.match(html, /Proteja a marca/i);
  assert.match(html, /que você criou/i);
  assert.match(html, /Diagnóstico gratuito/i);
  assert.match(html, /Nome da marca/i);
  assert.match(html, /Consultar minha marca/i);
  assert.match(html, /Quero registrar minha marca/i);
  assert.match(html, /Você cria\. A gente protege\./i);
  assert.doesNotMatch(html, /925847316/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Starter Project/i);
});

test("server-renders the local result preview", async () => {
  const response = await render("/resultados?preview=resultados");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /Prévia local/i);
  assert.match(html, /925847316/);
  assert.doesNotMatch(html, /Esta consulta não está disponível/i);
});

test("server-renders the results route without a previous consultation", async () => {
  const response = await render("/resultados");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /Esta consulta não está disponível/i);
  assert.match(html, /Voltar para a Flavio Bolsonaro Marcas/i);
});
