import { createClient, type RedisClientType } from "redis";

const isTestEnv = process.env.NODE_ENV === "test";

const REDIS_HOST = isTestEnv ? "localhost" : "redis";

const REDIS_URL = process.env.REDIS_URL || `redis://${REDIS_HOST}:6379`;

const redis: RedisClientType = createClient({
  url: REDIS_URL,
});

redis.on("error", (err) =>
  console.log(`Redis Client Error for host '${REDIS_HOST}'`, err)
);

export async function connectRedis() {
  if (!redis.isOpen) {
    console.log(`Attempting to connect Redis client at ${REDIS_URL}...`);
    await redis.connect();
    console.log("Redis connected successfully.");
  }
}

export default redis;
