import rateLimit from "express-rate-limit";
import { PostgresStore } from "@acpr/rate-limit-postgresql";

const store = new PostgresStore(
  {
    connectionString: process.env.DATABASE_URL,
    tableName: "rateLimits",
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
  store: store,
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: "Too many URLs created from this IP, please try again later",
});

// Get Limiter
export const getLimiter = rateLimit({
  store: store,
  windowMs: 60 * 1000,
  max: 100,
});
