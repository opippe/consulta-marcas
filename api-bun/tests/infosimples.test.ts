import { expect, test } from "bun:test";
import {
  InfosimplesError,
  searchTrademarks,
} from "../src/integrations/infosimples";

test("treats a successful response with no processes as a completed empty search", async () => {
  const previousToken = process.env.INFOSIMPLES_TOKEN;
  const previousFetch = globalThis.fetch;
  process.env.INFOSIMPLES_TOKEN = "test-token";
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        code: 200,
        code_message: "A requisição foi processada com sucesso.",
        data_count: 1,
        data: [
          {
            processos: [],
            processos_total: 0,
            total_paginas: 1,
          },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    )) as typeof fetch;

  try {
    await expect(searchTrademarks("MARCA SEM REGISTRO"))
      .resolves.toMatchObject({
        processos: [],
        processosTotal: 0,
        totalPaginas: 1,
        siteReceipts: [],
        providerSnapshot: {
          code: 200,
        },
      });
  } finally {
    globalThis.fetch = previousFetch;
    if (previousToken === undefined) delete process.env.INFOSIMPLES_TOKEN;
    else process.env.INFOSIMPLES_TOKEN = previousToken;
  }
});

test("treats provider code 612 as possible availability", async () => {
  const previousToken = process.env.INFOSIMPLES_TOKEN;
  const previousFetch = globalThis.fetch;
  process.env.INFOSIMPLES_TOKEN = "test-token";
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        code: 612,
        code_message: "A marca consultada não existe na base.",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    )) as typeof fetch;

  try {
    await expect(searchTrademarks("MARCA SEM REGISTRO"))
      .resolves.toMatchObject({
        processos: [],
        processosTotal: 0,
        totalPaginas: 1,
        siteReceipts: [],
        providerSnapshot: {
          code: 612,
        },
      });
  } finally {
    globalThis.fetch = previousFetch;
    if (previousToken === undefined) delete process.env.INFOSIMPLES_TOKEN;
    else process.env.INFOSIMPLES_TOKEN = previousToken;
  }
});

test("keeps other provider failures as errors", async () => {
  const previousToken = process.env.INFOSIMPLES_TOKEN;
  const previousFetch = globalThis.fetch;
  process.env.INFOSIMPLES_TOKEN = "test-token";
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        code: 615,
        code_message: "A fonte consultada está indisponível.",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    )) as typeof fetch;

  try {
    await expect(searchTrademarks("MARCA COM FALHA"))
      .rejects.toBeInstanceOf(InfosimplesError);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousToken === undefined) delete process.env.INFOSIMPLES_TOKEN;
    else process.env.INFOSIMPLES_TOKEN = previousToken;
  }
});
