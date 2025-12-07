import { type Request, type Response } from "express";
import { nanoid } from "nanoid";
import db from "#utils/client.js";
import { createUrlSchema, getUrlSchema } from "#zod-schemas/url.schema.js";
import { urls, analytics } from "#db/schema.js";
import { eq } from "drizzle-orm";
import { AppError } from "#utils/AppError.js";
import type { AuthRequest } from "#middleware/authentication.js";
import { analyticsQueue } from "#utils/queueClient.js";
import redis from "#utils/redisClient.js";

// --- Shorten ---
export async function shorten(req: AuthRequest, res: Response) {
  const { url } = createUrlSchema.parse(req.body);
  const userId = req.user!.id;
  const shortId = nanoid(7);

  const data: typeof urls.$inferInsert = {
    shortCode: shortId,
    originalUrl: url,
    userId: userId,
  };

  await db.insert(urls).values(data);

  const shortUrl = `${req.protocol}://${req.get("host")}/${shortId}`;

  return res.status(201).json({
    shortUrl,
    code: shortId,
    originalUrl: url,
  });
}

// --- Redirect ---
export async function codeRedirect(req: Request, res: Response) {
  const { shortCode } = getUrlSchema.parse(req.params);

  const analyticsData = {
    shortCode,
    ip: req.ip,
    userAgent: req.get("user-agent") ?? undefined,
    referer: req.get("referer") ?? null,
  };

  const cachedUrl = await redis.get(`url:${shortCode}`);

  if (cachedUrl) {
    console.log("Cache Hit");
    await redis.expire(shortCode, 604800);
    analyticsQueue.add("track-click", analyticsData);
    return res.redirect(cachedUrl);
  }

  const [urlFound] = await db
    .select({ id: urls.id, url: urls.originalUrl })
    .from(urls)
    .where(eq(urls.shortCode, shortCode));

  if (!urlFound) {
    throw new AppError("URL not found", 404);
  }

  await redis.set(`url:${shortCode}`, urlFound.url, { EX: 604800 });

  analyticsQueue.add("track-click", analyticsData);

  return res.redirect(urlFound.url);
}

// --- User URL Analytics ---
export async function getUserUrlAnalytics(req: AuthRequest, res: Response) {
  const userId = req.user!.id;

  const stats = await db
    .select()
    .from(urls)
    .innerJoin(analytics, eq(urls.id, analytics.urlId))
    .where(eq(urls.userId, userId));

  return res.status(200).json(stats);
}

// --- Specific URL Analyics ---
export async function getSpecificUrlAnalytics(req: AuthRequest, res: Response) {
  const { shortCode } = getUrlSchema.parse(req.params);
  const userId = req.user!.id;

  const [stats] = await db
    .select()
    .from(urls)
    .innerJoin(analytics, eq(urls.id, analytics.urlId))
    .where(eq(urls.shortCode, shortCode));

  if (!stats) {
    throw new AppError("URL not found", 404);
  }

  if (stats.urls.userId !== userId) {
    throw new AppError("That url does not belong to this user", 401);
  }

  return res.status(200).json({ stats: stats });
}
