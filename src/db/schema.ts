import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const urls = pgTable("urls", {
  id: uuid().primaryKey().defaultRandom(),
  shortCode: text().notNull().unique(),
  originalUrl: text().notNull(),
  clickCount: integer().notNull().default(0),
  lastClickedAt: timestamp(),
  createdAt: timestamp().defaultNow(),
});
