import rateLimit from "express-rate-limit";
import { PostgresStore } from "@acpr/rate-limit-postgresql";
import { type RequestHandler } from "express";

const isTest = process.env.NODE_ENV === "test";

const postStore = !isTest
  ? new PostgresStore(
      {
        connectionString: process.env.DATABASE_URL,
        tableName: "post_rate_limits",
      },
      "aggregated_store"
    )
  : undefined;

const getStore = !isTest
  ? new PostgresStore(
      {
        connectionString: process.env.DATABASE_URL,
        tableName: "get_rate_limits",
      },
      "aggregated_store"
    )
  : undefined;

// limiter options
const createUrlOptions = {
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: "Too many URLs created from this IP, please try again later",
};

const getOptions = {
  windowMs: 60 * 1000,
  max: 100,
};

export const createUrlLimiter: RequestHandler = isTest
  ? (req, res, next) => next()
  : rateLimit({
      ...createUrlOptions,
      store: postStore!,
    });

export const getLimiter: RequestHandler = isTest
  ? (req, res, next) => next()
  : rateLimit({
      ...getOptions,
      store: getStore!,
    });
