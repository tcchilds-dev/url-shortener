import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../../app.js";
import db from "#utils/client.js";
import { urls } from "#db/schema.js";

describe("Integration: URL API", () => {
  // Cleanup: This will wipe the local DB 'urls' table.
  // TODO: Create a test db
  beforeEach(async () => {
    await db.delete(urls);
  });

  describe("POST /api/shorten", () => {
    it("should take long URL, create short, store them in DB, return short", async () => {
      // Send HTTP request
      const response = await request(app)
        .post("/api/shorten")
        .send({ url: "https://www.github.com" });

      // Assert HTTP details
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("shortUrl");
      expect(response.body).toHaveProperty("code");

      // Assert Database Side Effects
      const result = await db.select().from(urls);
      expect(result).toHaveLength(1);
      expect(result[0]!.originalUrl).toBe("https://www.github.com");
    });

    it("should return 400 for invalid URL (Zod Middleware check)", async () => {
      const response = await request(app)
        .post("/api/shorten")
        .send({ url: "not-a-url" });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Validation Error");
    });
  });

  describe("GET /api/:shortCode", () => {
    it("should redirect to the original URL", async () => {
      // Seed the DB
      const [inserted] = await db
        .insert(urls)
        .values({
          originalUrl: "https://www.google.com",
          shortCode: "1234567",
        })
        .returning();

      // Request the short code
      const response = await request(app).get(`/api/${inserted!.shortCode}`);

      // Assert redirect
      expect(response.status).toBe(302);
      expect(response.header.location).toBe("https://www.google.com");
    });

    it("should return 400 for an invalid code (Zod)", async () => {
      // Make bad request
      const response = await request(app).get("/api/wrongformat");

      // Assert response
      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Validation Error");
    });

    it("should return 404 for non-existent code", async () => {
      // Make bad request
      const response = await request(app).get("/api/0123456");

      // Assert response
      expect(response.status).toBe(404);
    });
  });

  describe("GET /api/:shortCode/stats", () => {
    it("should return stats for the specified short URL", async () => {
      // Seed the DB
      const [inserted] = await db
        .insert(urls)
        .values({
          originalUrl: "https://www.google.com",
          shortCode: "1234567",
          clickCount: 99,
        })
        .returning();

      // Request the stats
      const response = await request(app).get(
        `/api/${inserted!.shortCode}/stats`,
      );

      // Assert stats
      expect(response.status).toBe(200);
      expect(response.body.clicks).toBe(99);
    });

    it("Should return 400 for an invalid code", async () => {
      // Bad request
      const response = await request(app).get("/api/wrongformat/stats");

      // Assert response
      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Validation Error");
    });

    it("should return 404 for a non-existent code", async () => {
      // Make bad request
      const response = await request(app).get("/api/0123456/stats");

      // Assert response
      expect(response.status).toBe(404);
    });
  });
});
