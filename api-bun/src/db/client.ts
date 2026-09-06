import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as authSchema from "./auth-schema";
import * as operationsSchema from "./schema";

const schema = { ...operationsSchema, ...authSchema };

let database: ReturnType<typeof drizzle<typeof schema>> | undefined;
let client: ReturnType<typeof postgres> | undefined;

export function getDb() {
  if (database) {
    return database;
  }

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }

  client = postgres(databaseUrl, {
    max: Number(process.env.DATABASE_POOL_SIZE ?? 10),
    prepare: false,
    connect_timeout: 10,
    idle_timeout: 20,
  });
  database = drizzle(client, { schema });

  return database;
}

export async function closeDb() {
  if (!client) {
    return;
  }

  await client.end();
  client = undefined;
  database = undefined;
}
