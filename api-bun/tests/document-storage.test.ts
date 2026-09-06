import { afterEach, expect, mock, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const objects = new Map<string, Uint8Array>();
mock.module("../src/lib/r2-client", () => ({ r2Client: () => ({
  file(key: string) {
    return {
      write: async (bytes: Uint8Array) => { objects.set(key, bytes.slice()); },
      arrayBuffer: async () => objects.get(key)!.slice().buffer,
      delete: async () => { objects.delete(key); },
    };
  }
}) }));
const { writeStoredDocument, readStoredDocument, removeStoredDocument, validateDocumentStorage } = await import("../src/lib/document-storage");
const { validateProductionConfig } = await import("../src/lib/production-config");
const envBefore = { ...process.env };
afterEach(() => {
  for (const key of Object.keys(process.env)) if (!(key in envBefore)) delete process.env[key];
  Object.assign(process.env, envBefore);
  objects.clear();
});
const key = `contracts/${crypto.randomUUID()}/${crypto.randomUUID()}.pdf`;
const bytes = new Uint8Array([37, 80, 68, 70, 45, 0, 255, 13, 10]);

test("local storage preserves exact bytes and rejects path traversal", async () => {
  process.env.NODE_ENV = "test";
  process.env.DOCUMENT_STORAGE_DRIVER = "local";
  const directory = await mkdtemp(join(tmpdir(), "55marcas-storage-test-"));
  process.env.DOCUMENT_STORAGE_DIR = directory;
  try {
    await writeStoredDocument(key, bytes);
    expect(new Uint8Array(await readStoredDocument(key))).toEqual(bytes);
    await expect(writeStoredDocument("../secret.pdf", bytes)).rejects.toThrow("Chave");
    await removeStoredDocument(key);
    await expect(readStoredDocument(key)).rejects.toThrow();
  } finally {
    // Only the directory freshly created by this test is removed.
    await rm(directory, { recursive: true, force: true });
  }
});

test("R2 adapter preserves bytes and production cannot fall back to disk", async () => {
  process.env.NODE_ENV = "production";
  process.env.DOCUMENT_STORAGE_DRIVER = "local";
  expect(validateDocumentStorage).toThrow("efêmero");
  process.env.DOCUMENT_STORAGE_DRIVER = "r2";
  process.env.R2_ENDPOINT = "https://example.r2.cloudflarestorage.com";
  process.env.R2_BUCKET = "test";
  process.env.R2_ACCESS_KEY_ID = "test";
  delete process.env.R2_SECRET_ACCESS_KEY;
  expect(validateDocumentStorage).toThrow("R2_SECRET_ACCESS_KEY");
  process.env.R2_SECRET_ACCESS_KEY = "test";
  await writeStoredDocument(key, bytes);
  expect(new Uint8Array(await readStoredDocument(key))).toEqual(bytes);
  await removeStoredDocument(key);
  expect(objects.size).toBe(0);
});

test("production refuses unsafe origins, shared secrets and public signup", () => {
  Object.assign(process.env, {
    NODE_ENV: "production", DOCUMENT_STORAGE_DRIVER: "r2",
    R2_ENDPOINT: "https://example.r2.cloudflarestorage.com", R2_BUCKET: "test",
    R2_ACCESS_KEY_ID: "test", R2_SECRET_ACCESS_KEY: "test", DATABASE_URL: "postgresql://example/test",
    INFOSIMPLES_TOKEN: "test", CRM_ALLOWED_EMAILS: "test@example.com",
    CORS_ORIGINS: "https://crm.55marcas.com.br", BETTER_AUTH_URL: "https://api.55marcas.com.br",
    BETTER_AUTH_SECRET: "a".repeat(64), PROPOSAL_LINK_SECRET: "b".repeat(64), RATE_LIMIT_SALT: "c".repeat(64),
    BETTER_AUTH_ALLOW_SIGN_UP: "false", SEARCH_DAILY_LIMIT: "30",
  });
  expect(validateProductionConfig).not.toThrow();
  process.env.CORS_ORIGINS = "http://localhost:3001";
  expect(validateProductionConfig).toThrow("HTTPS");
  process.env.CORS_ORIGINS = "https://crm.55marcas.com.br";
  process.env.RATE_LIMIT_SALT = process.env.BETTER_AUTH_SECRET;
  expect(validateProductionConfig).toThrow("distintos");
  process.env.RATE_LIMIT_SALT = "c".repeat(64);
  process.env.BETTER_AUTH_ALLOW_SIGN_UP = "true";
  expect(validateProductionConfig).toThrow("Cadastro público");
});
