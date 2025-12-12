import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { uuidv7 } from "uuidv7";

// users table
export const users = pgTable("users", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// urls table
export const urls = pgTable("urls", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  shortCode: text("short_code").notNull().unique(),
  originalUrl: text("original_url").notNull(),
  userId: uuid("user_id").references(() => users.id),
  clickCount: integer("click_count").notNull().default(0),
  lastClickedAt: timestamp("last_clicked_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// analytics table
export const analytics = pgTable("analytics", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  urlId: uuid("url_id")
    .references(() => urls.id, { onDelete: "cascade" })
    .notNull(),
  userAgent: text("user_agent"),
  referer: text("referer"),
  country: text("country"),
  city: text("city"),
  device: text("device"),
  createdAt: timestamp("created_at").defaultNow(),
});

// relations
export const userRelations = relations(users, ({ many }) => ({
  urls: many(urls),
}));

export const urlsRelations = relations(urls, ({ one, many }) => ({
  user: one(users, {
    fields: [urls.userId],
    references: [users.id],
  }),
  visits: many(analytics),
}));

export const analyticsRelations = relations(analytics, ({ one }) => ({
  url: one(urls, {
    fields: [analytics.urlId],
    references: [urls.id],
  }),
}));
