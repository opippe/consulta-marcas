const encoder = new TextEncoder();

function getSecret() {
  const secret = process.env.PROPOSAL_LINK_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new Error(
      "PROPOSAL_LINK_SECRET deve ter pelo menos 32 caracteres.",
    );
  }
  return secret;
}

async function getSigningKey() {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function createProposalToken(id: string, version: number) {
  const payload = `${id}.${version}`;
  const signature = await crypto.subtle.sign(
    "HMAC",
    await getSigningKey(),
    encoder.encode(payload),
  );
  return `${payload}.${Buffer.from(signature).toString("base64url")}`;
}

export async function verifyProposalToken(token: string) {
  const [id, rawVersion, signature] = token.split(".");
  const version = Number(rawVersion);
  if (
    !id ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id,
    ) ||
    !Number.isInteger(version) ||
    version < 1 ||
    !signature ||
    signature.length > 100
  ) {
    return null;
  }

  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await getSigningKey(),
      Buffer.from(signature, "base64url"),
      encoder.encode(`${id}.${version}`),
    );
    return valid ? { id, version } : null;
  } catch {
    return null;
  }
}

export async function createContractToken(id: string, version: number) {
  const payload = `contract.${id}.${version}`;
  const signature = await crypto.subtle.sign(
    "HMAC",
    await getSigningKey(),
    encoder.encode(payload),
  );
  return `${payload}.${Buffer.from(signature).toString("base64url")}`;
}

export async function verifyContractToken(token: string) {
  const [kind, id, rawVersion, signature] = token.split(".");
  const version = Number(rawVersion);
  if (
    kind !== "contract" ||
    !id ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id,
    ) ||
    !Number.isInteger(version) ||
    version < 1 ||
    !signature ||
    signature.length > 100
  ) {
    return null;
  }

  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await getSigningKey(),
      Buffer.from(signature, "base64url"),
      encoder.encode(`contract.${id}.${version}`),
    );
    return valid ? { id, version } : null;
  } catch {
    return null;
  }
}
