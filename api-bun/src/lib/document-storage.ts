import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { r2Client } from "./r2-client";

export function validateDocumentStorage() {
  const driver = process.env.DOCUMENT_STORAGE_DRIVER?.trim() || "local";
  if (driver !== "local" && driver !== "r2") throw new Error("DOCUMENT_STORAGE_DRIVER deve ser local ou r2.");
  if (process.env.NODE_ENV === "production" && driver !== "r2") {
    throw new Error("Produção requer DOCUMENT_STORAGE_DRIVER=r2; o disco do deploy é efêmero.");
  }
  if (driver === "r2") {
    for (const name of ["R2_ENDPOINT", "R2_BUCKET", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"]) {
      if (!process.env[name]?.trim()) throw new Error(`${name} não configurado.`);
    }
    if (new URL(process.env.R2_ENDPOINT!).protocol !== "https:") throw new Error("R2_ENDPOINT deve usar HTTPS.");
  }
  return driver;
}

function validateKey(key: string) {
  // Filenames supplied by the user must never become storage paths.
  if (!/^contracts\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.pdf$/i.test(key)) {
    throw new Error("Chave de armazenamento inválida.");
  }
}

function storageRoot() {
  return resolve(process.env.DOCUMENT_STORAGE_DIR?.trim() || "./storage");
}

function resolveStoragePath(storageKey: string) {
  const root = storageRoot();
  const target = resolve(root, storageKey);
  const relativeTarget = relative(root, target);

  if (
    !relativeTarget ||
    relativeTarget.startsWith("..") ||
    isAbsolute(relativeTarget)
  ) {
    throw new Error("Chave de armazenamento inválida.");
  }

  return target;
}

export async function writeStoredDocument(
  storageKey: string,
  bytes: Uint8Array,
) {
  validateKey(storageKey);
  if (validateDocumentStorage() === "r2") {
    await r2Client().file(storageKey).write(bytes, { type: "application/pdf" });
    return;
  }
  const path = resolveStoragePath(storageKey);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, bytes);
}

export async function readStoredDocument(storageKey: string) {
  validateKey(storageKey);
  if (validateDocumentStorage() === "r2") {
    return Buffer.from(await r2Client().file(storageKey).arrayBuffer());
  }
  return readFile(resolveStoragePath(storageKey));
}

export async function removeStoredDocument(storageKey: string) {
  validateKey(storageKey);
  if (validateDocumentStorage() === "r2") {
    await r2Client().file(storageKey).delete();
    return;
  }
  await rm(resolveStoragePath(storageKey), { force: true });
}

export function getMaxDocumentSizeBytes() {
  const configuredMegabytes = Number(process.env.MAX_DOCUMENT_SIZE_MB ?? 10);
  const megabytes =
    Number.isFinite(configuredMegabytes) && configuredMegabytes > 0
      ? Math.min(configuredMegabytes, 50)
      : 10;
  return Math.floor(megabytes * 1024 * 1024);
}
