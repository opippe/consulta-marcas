import { expect, test } from "bun:test";
import { eq, sql } from "drizzle-orm";
import { verifyPassword } from "better-auth/crypto";
import { closeDb, getDb } from "../src/db/client";
import { account, session, user } from "../src/db/auth-schema";
import { createCrmUserSchema, resolveCrmRole } from "../src/lib/crm-users";

async function rejectsCode(operation: Promise<unknown>, code: string) {
  let error: unknown;
  try { await operation; } catch (caught) { error = caught; }
  expect(error).toMatchObject({ code });
}

test("validates credentials and preserves explicit roles over legacy settings", () => {
  const previousAdmin = process.env.CRM_ADMIN_EMAIL;
  const previousAllowed = process.env.CRM_ALLOWED_EMAILS;
  try {
    process.env.CRM_ADMIN_EMAIL = "owner@example.test";
    process.env.CRM_ALLOWED_EMAILS = "legacy@example.test";
    expect(resolveCrmRole({ email: "OWNER@example.test", crmRole: null })).toBe("ADMIN");
    expect(resolveCrmRole({ email: "legacy@example.test", crmRole: null })).toBe("COLLABORATOR");
    expect(resolveCrmRole({ email: "unknown@example.test", crmRole: null })).toBeNull();
    expect(resolveCrmRole({ email: "owner@example.test", crmRole: "COLLABORATOR" })).toBe("COLLABORATOR");
    const input = { name: "  Ana Silva  ", email: " ANA@example.test ", password: "Example-password-123" };
    expect(createCrmUserSchema.parse(input)).toEqual({ ...input, name: "Ana Silva", email: "ana@example.test" });
    for (const invalid of [{ ...input, password: "short" }, { ...input, password: "x".repeat(129) }, { ...input, email: "invalid" }, { ...input, name: " " }, { ...input, crmRole: "ADMIN" }]) {
      expect(createCrmUserSchema.safeParse(invalid).success).toBe(false);
    }
  } finally {
    if (previousAdmin === undefined) delete process.env.CRM_ADMIN_EMAIL;
    else process.env.CRM_ADMIN_EMAIL = previousAdmin;
    if (previousAllowed === undefined) delete process.env.CRM_ALLOWED_EMAILS;
    else process.env.CRM_ALLOWED_EMAILS = previousAllowed;
  }
});

// Run explicitly against a local migrated database. Only UUID-tagged fixtures are changed and cleaned up.
test("administrator provisions real logins; collaborators cannot manage users; deactivation revokes access", async () => {
  if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(process.env.DATABASE_URL!).hostname)) {
    throw new Error("Execute somente contra o banco LOCAL de desenvolvimento.");
  }
  const db = getDb();
  const suffix = crypto.randomUUID();
  try {
    const { createCrmUser } = await import("../src/lib/crm-users");
    const { auth, trustedOrigins } = await import("../src/auth");
    const { appRouter, createTrpcContext } = await import("../src/trpc");
    const { default: api } = await import("../src/index");
    const password = "Crm-test-password-123";
    const admin = await createCrmUser({ name: "Test administrator", email: `admin-${suffix}@example.test`, password }, "ADMIN");
    async function login(email: string) {
      const response = await auth.handler(new Request("http://localhost:3100/api/auth/sign-in/email", {
        method: "POST", headers: { "Content-Type": "application/json", Origin: trustedOrigins[0] },
        body: JSON.stringify({ email, password }),
      }));
      const cookie = response.headers.getSetCookie().map(value => value.split(";")[0]).join("; ");
      return { response, cookie };
    }
    const adminLogin = await login(admin.email);
    expect(adminLogin.response.status).toBe(200);
    const request = (cookie: string) => new Request("http://localhost:3100/trpc", { headers: { Cookie: cookie } });
    const adminContext = await createTrpcContext(request(adminLogin.cookie));
    const adminCaller = appRouter.createCaller(adminContext);
    expect((await adminCaller.crm.me()).user.crmRole).toBe("ADMIN");
    const memberInput = { name: "Test collaborator", email: `Member-${suffix}@example.test`, password };
    const member = await adminCaller.crm.users.create(memberInput);
    expect(member.email).toBe(memberInput.email.toLowerCase());
    expect(member.crmRole).toBe("COLLABORATOR");
    expect(member).not.toHaveProperty("password");
    const [credential] = await db.select().from(account).where(eq(account.userId, member.id));
    expect(credential.password).not.toBe(password);
    expect(await verifyPassword({ hash: credential.password!, password })).toBe(true);
    expect((await db.select().from(session).where(eq(session.userId, member.id)))).toHaveLength(0);
    expect((await adminCaller.crm.me()).user.id).toBe(admin.id);
    await rejectsCode(adminCaller.crm.users.create(memberInput), "CONFLICT");
    const listed = await adminCaller.crm.users.list();
    expect(listed.some(item => item.id === member.id)).toBe(true);
    expect(JSON.stringify(listed)).not.toContain(credential.password!);

    const memberLogin = await login(member.email);
    expect(memberLogin.response.status).toBe(200);
    const memberContext = await createTrpcContext(request(memberLogin.cookie));
    const memberCaller = appRouter.createCaller(memberContext);
    expect((await memberCaller.crm.me()).user.crmRole).toBe("COLLABORATOR");
    await auth.handler(new Request("http://localhost:3100/api/auth/update-user", {
      method: "POST", headers: { "Content-Type": "application/json", Origin: trustedOrigins[0], Cookie: memberLogin.cookie },
      body: JSON.stringify({ crmRole: "ADMIN", crmActive: true }),
    }));
    expect((await memberCaller.crm.me()).user.crmRole).toBe("COLLABORATOR");
    expect(await memberCaller.crm.leads.list({ limit: 1, offset: 0 })).toHaveProperty("items");
    await rejectsCode(memberCaller.crm.users.list(), "FORBIDDEN");
    await rejectsCode(memberCaller.crm.users.create({ ...memberInput, email: `blocked-${suffix}@example.test` }), "FORBIDDEN");
    await rejectsCode(memberCaller.crm.users.setActive({ id: admin.id, active: false }), "FORBIDDEN");
    await rejectsCode(adminCaller.crm.users.setActive({ id: admin.id, active: false }), "BAD_REQUEST");
    const otherAdmin = await createCrmUser({ name: "Other administrator", email: `other-${suffix}@example.test`, password }, "ADMIN");
    await rejectsCode(adminCaller.crm.users.setActive({ id: otherAdmin.id, active: false }), "BAD_REQUEST");
    await rejectsCode(adminCaller.crm.users.setActive({ id: "missing", active: false }), "NOT_FOUND");
    const anonymous = appRouter.createCaller({ request: request(""), session: null });
    await rejectsCode(anonymous.crm.users.list(), "UNAUTHORIZED");
    await rejectsCode(anonymous.crm.users.create(memberInput), "UNAUTHORIZED");
    const signup = await auth.handler(new Request("http://localhost:3100/api/auth/sign-up/email", {
      method: "POST", headers: { "Content-Type": "application/json", Origin: trustedOrigins[0] },
      body: JSON.stringify({ ...memberInput, email: `public-${suffix}@example.test`, crmRole: "ADMIN" }),
    }));
    expect(signup.ok).toBe(false);

    await adminCaller.crm.users.setActive({ id: member.id, active: false });
    expect((await db.select().from(session).where(eq(session.userId, member.id)))).toHaveLength(0);
    // Even an already-resolved context must recheck the current access state.
    await rejectsCode(memberCaller.crm.leads.list({ limit: 1, offset: 0 }), "FORBIDDEN");
    expect((await createTrpcContext(request(memberLogin.cookie))).session).toBeNull();
    expect((await login(member.email)).response.ok).toBe(false);
    const deniedUpload = await api.fetch(new Request(`http://localhost:3100/api/crm/contracts/${crypto.randomUUID()}/documents`, {
      method: "POST", headers: { Cookie: memberLogin.cookie, Origin: trustedOrigins[0] },
    }));
    expect(deniedUpload.status).toBe(401);
    await adminCaller.crm.users.setActive({ id: member.id, active: true });
    expect((await login(member.email)).response.status).toBe(200);
    expect((await createTrpcContext(request(memberLogin.cookie))).session).toBeNull();
    const [stored] = await db.select().from(user).where(eq(user.id, member.id));
    expect(stored.crmActive).toBe(true);
  } finally {
    try {
      await db.delete(user).where(sql`${user.email} like ${`%-${suffix}@example.test`}`);
    } finally {
      await closeDb();
    }
  }
}, 30_000);
