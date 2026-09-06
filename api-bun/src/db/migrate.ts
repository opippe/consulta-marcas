import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_MIGRATION_URL?.trim() || process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run migrations.");
}

const client = postgres(databaseUrl, { max: 1, prepare: false });
const database = drizzle(client);

try {
  await migrate(database, { migrationsFolder: "./drizzle" });
  console.info("Database migrations completed.");
} finally {
  await client.end();
}
