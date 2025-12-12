import { drizzle } from "drizzle-orm/node-postgres";
import "dotenv/config";

const NODE_ENV = process.env.NODE_ENV;

const DB_URL =
  NODE_ENV === "test" && process.env.TEST_DATABASE_URL
    ? process.env.TEST_DATABASE_URL
    : process.env.DATABASE_URL;

if (!DB_URL) {
  throw new Error("FATAL: DATABASE_URL environment variable is not set.");
}

const db = drizzle(DB_URL);

export default db;
