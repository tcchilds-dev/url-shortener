import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../app.js";
import db from "#utils/drizzleClient.js";
import { analytics, urls, users } from "#db/schema.js";
import { uuidv7 } from "uuidv7";
import bcrypt from "bcrypt";
import { connectRedis } from "#utils/redisClient.js";
import redis from "#utils/redisClient.js";
import { eq } from "drizzle-orm";

describe("Integration: URL API", () => {
  const TEST_USER_EMAIL = "integration_test@example.com";
  const TEST_USER_ID = uuidv7();
  const TEST_USER_PASSWORD = "password123";
  const TEST_SHORT_CODE = "a23b56c";

  let authToken: string;

  beforeAll(async () => {
    await connectRedis();
  });

  beforeEach(async () => {
    await db.delete(urls);
    await db.delete(users);
    await db.delete(analytics);

    const hashedPass = await bcrypt.hash(TEST_USER_PASSWORD, 10);

    await db
      .insert(users)
      .values({
        id: TEST_USER_ID,
        email: TEST_USER_EMAIL,
        password: hashedPass,
      })
      .onConflictDoNothing();

    const loginRes = await request(app).post("/api/v1/users/login").send({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
    });

    authToken = loginRes.body.token;
  });

  afterAll(async () => {
    await redis.quit();
  });

  // Register tests.
  describe("POST /api/v1/users/register", () => {
    it("should register a new user", async () => {
      const response = await request(app)
        .post("/api/v1/users/register")
        .send({ email: "newGuy@example.com", password: "password123" });

      expect(response.status).toBe(201);
      expect(response.body.token).toBeDefined();

      const result = await db.select().from(users);
      expect(result).length(2);
      expect(result[1]!.email).toBe("newGuy@example.com");
    });

    it("should return 400 if an account already exists", async () => {
      const hashedPass = await bcrypt.hash("password123", 10);

      await db.insert(users).values({
        email: "existing@example.com",
        password: hashedPass,
      });

      const response = await request(app).post("/api/v1/users/register").send({
        email: "existing@example.com",
        password: "password123",
      });

      expect(response.status).toBe(400);
    });

    it("should return ZodError if email is invalid", async () => {
      const response = await request(app).post("/api/v1/users/register").send({
        email: "not-a-valid.email",
        password: "password123",
      });

      expect(response.status).toBe(400);
    });

    it("should return ZodError if password is less than 8 chars", async () => {
      const response = await request(app).post("/api/v1/users/register").send({
        email: "valid@example.com",
        password: "2short",
      });

      expect(response.status).toBe(400);
    });
  });

  // Log in tests.
  describe("POST /api/v1/users/login", () => {
    it("should log an existing user in", async () => {
      const hashedPass = await bcrypt.hash("password123", 10);

      await db.insert(users).values({
        email: "existing@example.com",
        password: hashedPass,
      });

      const response = await request(app)
        .post("/api/v1/users/login")
        .send({ email: "existing@example.com", password: "password123" });

      expect(response.status).toBe(201);
      expect(response.body.token).toBeDefined();
    });

    it("should return 401 if the user does not exist", async () => {
      const response = await request(app).post("/api/v1/users/login").send({
        email: "ghost@example.com",
        password: "password123",
      });

      expect(response.status).toBe(401);
    });

    it("should return 401 if the password is invalid", async () => {
      const hashedPass = await bcrypt.hash("password123", 10);

      const data: typeof users.$inferInsert = {
        email: "existing@example.com",
        password: hashedPass,
      };

      await db.insert(users).values(data);

      const response = await request(app).post("/api/v1/users/login").send({
        email: "existing@example.com",
        password: "password12",
      });

      expect(response.status).toBe(401);
    });
  });

  // Tests for generating a short URL.
  describe("POST /api/v1/urls", () => {
    it("should take long URL, create short, store them in DB, return short", async () => {
      const response = await request(app)
        .post("/api/v1/urls")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ url: "https://www.github.com" });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("shortUrl");
      expect(response.body).toHaveProperty("code");

      const result = await db.select().from(urls);
      expect(result).toHaveLength(1);
      expect(result[0]!.originalUrl).toBe("https://www.github.com");
    });

    it("should return 400 for invalid URL (Zod Middleware check)", async () => {
      const response = await request(app)
        .post("/api/v1/urls")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ url: "not-a-url" });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Validation Error");
    });

    it("should reject request without token", async () => {
      const response = await request(app)
        .post("/api/v1/urls")
        .send({ url: "https://www.github.com" });

      expect(response.status).toBe(400);
    });

    it("should reject request with invalid token", async () => {
      const response = await request(app)
        .post("/api/v1/urls")
        .set("Authorization", "Bearer invalid-token")
        .send({ url: "https://www.github.com" });

      expect(response.status).toBe(401);
    });
  });

  // Redirect tests.
  describe("GET /:shortCode", () => {
    it("should redirect to the original URL", async () => {
      const [inserted] = await db
        .insert(urls)
        .values({
          originalUrl: "https://www.google.com",
          shortCode: "1234567",
        })
        .returning();

      const response = await request(app).get(`/${inserted!.shortCode}`);

      expect(response.status).toBe(302);
      expect(response.header.location).toBe("https://www.google.com");
    });

    it("should redirect from cache on second request", async () => {
      const [inserted] = await db
        .insert(urls)
        .values({
          originalUrl: "https://www.google.com",
          shortCode: "1234567",
        })
        .returning();
      const shortCode = inserted!.shortCode;

      // First request should hit the DB and prime the Redis cache.
      const firstResponse = await request(app).get(`/${shortCode}`);
      expect(firstResponse.status).toBe(302);
      expect(firstResponse.header.location).toBe("https://www.google.com");

      // DB update should not affect the cache.
      await db
        .update(urls)
        .set({ originalUrl: "https://www.yahoo.com" })
        .where(eq(urls.shortCode, shortCode));

      const secondResponse = await request(app).get(`/${shortCode}`);
      expect(secondResponse.status).toBe(302);
      expect(secondResponse.header.location).toBe("https://www.google.com");
      expect(secondResponse.header.location).not.toBe("https://www.yahoo.com");

      await redis.del(`url:${shortCode}`);
    });

    it("should fetch new data after cache expires", async () => {
      // Set up and prime cache.
      const [inserted] = await db
        .insert(urls)
        .values({
          shortCode: "1234567",
          originalUrl: "https://www.google.com",
        })
        .returning();
      const shortCode = inserted!.shortCode;
      await request(app).get(`/${shortCode}`);

      // Update DB.
      await db
        .update(urls)
        .set({ originalUrl: "https://www.yahoo.com" })
        .where(eq(urls.shortCode, shortCode));

      // Delete the Redis key.
      await redis.del(`url:${shortCode}`);

      // Request again to fetch new data.
      const response = await request(app).get(`/${shortCode}`);
      expect(response.header.location).toBe("https://www.yahoo.com");

      await redis.del(`url:${shortCode}`);
    });

    it("should return 400 for an invalid code (Zod)", async () => {
      const response = await request(app).get("/wrongformat");

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Validation Error");
    });

    it("should return 404 for non-existent code", async () => {
      const response = await request(app).get("/0123456");

      expect(response.status).toBe(404);
    });
  });

  // Tests for getting specific URL analytics.
  describe("GET /api/v1/users/urls/:shortCode/stats", () => {
    it("should return stats for specified short url", async () => {
      const UNIQUE_URL_ID = uuidv7();

      await db.insert(urls).values({
        id: UNIQUE_URL_ID,
        shortCode: TEST_SHORT_CODE,
        originalUrl: "https://www.google.com",
        userId: TEST_USER_ID,
        clickCount: 5,
        lastClickedAt: new Date("2025-11-30T00:00:00Z"),
        createdAt: new Date("2025-11-01T00:00:00Z"),
      });

      await db.insert(analytics).values({
        urlId: UNIQUE_URL_ID,
        userAgent: "Mozzila/5.0 (Test; Integration) Drizzle",
        referer: "https://www.old-site.com",
        country: "GB",
        city: "London",
        device: "Desktop",
        createdAt: new Date("2025-11-30T00:00:00Z"),
      });

      const response = await request(app)
        .get(`/api/v1/users/urls/${TEST_SHORT_CODE}/stats`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });
  });

  // Tests for retrieving information on all a user's URLs.
  describe("GET /api/v1/users/urls", () => {
    it("should return all urls and analytics owned by the user", async () => {
      const UNIQUE_URL_ID = uuidv7();

      await db.insert(urls).values({
        id: UNIQUE_URL_ID,
        shortCode: TEST_SHORT_CODE,
        originalUrl: "https://www.google.com",
        userId: TEST_USER_ID,
        clickCount: 5,
        lastClickedAt: new Date("2025-11-30T00:00:00Z"),
        createdAt: new Date("2025-11-01T00:00:00Z"),
      });

      await db.insert(analytics).values({
        urlId: UNIQUE_URL_ID,
        userAgent: "Mozzila/5.0 (Test; Integration) Drizzle",
        referer: "https://www.old-site.com",
        country: "GB",
        city: "London",
        device: "Desktop",
        createdAt: new Date("2025-11-30T00:00:00Z"),
      });

      const response = await request(app)
        .get("/api/v1/users/urls")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });
  });
});
