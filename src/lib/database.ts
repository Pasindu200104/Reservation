import { Pool } from "pg";

// globalThis avoids opening a new set of connections on every reload.
const globalForDatabase = globalThis as unknown as { databasePool?: Pool };

export const databasePool =
  globalForDatabase.databasePool ?? new Pool({ connectionString: process.env.DATABASE_URL });

if (process.env.NODE_ENV !== "production") {
  globalForDatabase.databasePool = databasePool;
}
