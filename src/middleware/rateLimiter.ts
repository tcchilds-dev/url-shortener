import rateLimit from "express-rate-limit";
import { PostgresStore } from "@acpr/rate-limit-postgresql";

const postStore = new PostgresStore(
  {
    connectionString: process.env.DATABASE_URL,
    tableName: "post_rate_limits",
  },
  "aggregated_store",
);

const getStore = new PostgresStore(
  {
    connectionString: process.env.DATABASE_URL,
    tableName: "get_rate_limits",
  },
  "aggregated_store",
);

// General limiter
// export const generalLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 100,
//   message: "Too many requests, please try again later",
//   standardHeaders: true,
//   legacyHeaders: false,
// });

// Strict Limiter (for creating URLs)
export const createUrlLimiter = rateLimit({
  store: postStore,
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: "Too many URLs created from this IP, please try again later",
});

// Get Limiter
export const getLimiter = rateLimit({
  store: getStore,
  windowMs: 60 * 1000,
  max: 100,
});
