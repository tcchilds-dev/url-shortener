import { describe, it, expect, vi, beforeEach } from "vitest";
import { shorten, codeRedirect, codeStats } from "./urlController.js";
import { type Request, type Response } from "express";
import { AppError } from "#utils/AppError.js";
import { ZodError } from "zod";

// Mock Database (we need method chaining)
const dbMock = vi.hoisted(() => ({
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockResolvedValue(undefined),
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockResolvedValue([]),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
}));

// Mock Nanoid
vi.mock("nanoid", () => ({
  nanoid: () => "1234567",
}));

vi.mock("#utils/client.js", () => ({
  default: dbMock,
}));

describe("URL Controller", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();

    req = {
      body: {},
      params: {},
      protocol: "http",
      get: vi.fn().mockReturnValue("localhost:3000"),
    };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
      redirect: vi.fn(),
    };
  });

  // --- Shorten ---
  describe("shorten", () => {
    it("should create a short URL and return 201", async () => {
      // Arrange
      req.body = { url: "https://google.com" };

      // Act
      await shorten(req as Request, res as Response);

      // Assert
      // 1. Did it respond with 201?
      expect(res.status).toHaveBeenCalledWith(201);

      // 2. Did it return the correct JSON?
      expect(res.json).toHaveBeenCalledWith({
        shortUrl: "http://localhost:3000/1234567",
        code: "1234567",
        originalUrl: "https://google.com",
      });

      // 3. Did it actually try to save to the DB?
      expect(dbMock.insert).toHaveBeenCalled();
    });

    it("should throw Zod error if URL is invalid", async () => {
      req.body = { url: "not-a-url" };

      await expect(shorten(req as Request, res as Response)).rejects.toThrow(
        ZodError,
      );
    });
  });

  // --- Redirect ---
  describe("codeRedirect", () => {
    it("should redirect to the original URL if found", async () => {
      // Arrange
      req.params = { shortCode: "1234567" };

      // Mock DB to return specific result
      dbMock.where.mockResolvedValue([{ url: "https://google.com" }]);

      // Act
      await codeRedirect(req as Request, res as Response);

      // Assert
      expect(res.redirect).toHaveBeenCalledWith("https://google.com");

      // Verify we updated click stats
      expect(dbMock.update).toHaveBeenCalled();
    });

    it("should throw 404 if URL is not found", async () => {
      // Arrange
      req.params = { shortCode: "missing" };

      // Mock DB to return empty array (not found)
      dbMock.where.mockResolvedValue([]);

      // Act
      const promise = codeRedirect(req as Request, res as Response);

      // Assert
      await expect(promise).rejects.toThrow(AppError);
      await expect(promise).rejects.toThrow("URL not found");
    });
  });

  describe("codeStats", () => {
    it("should return 200, click count and time of last click", async () => {
      //Arrange
      req.params = { shortCode: "1234567" };

      // Mock DB to return stats
      const mockStats = {
        clicks: 10,
        lastClick: new Date("2025-11-11"),
      };
      dbMock.where.mockResolvedValue([mockStats]);

      // Act
      await codeStats(req as Request, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockStats);
    });

    it("should throw 404 if URL is not found", async () => {
      // Arrange
      req.params = { shortCode: "missing" };

      // Mock DB returning empty array
      dbMock.where.mockResolvedValue([]);

      // Act & Assert
      await expect(codeStats(req as Request, res as Response)).rejects.toThrow(
        "URL not found",
      );
    });
  });
});
