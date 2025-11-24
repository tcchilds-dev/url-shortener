import { beforeAll } from "vitest";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import db from "../utils/client.js";

beforeAll(async () => {
  console.log("Running migrations on Test DB...");

  try {
    await migrate(db, { migrationsFolder: "drizzle" });
    console.log("Migrations complete.");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
});
