import { type Request, type Response } from "express";
import { nanoid } from "nanoid";
import db from "#utils/drizzleClient.js";
import { createUrlSchema, getUrlSchema } from "#zod-schemas/url.schema.js";
import { urls, analytics } from "#db/schema.js";
import { eq } from "drizzle-orm";
import { AppError } from "#utils/AppError.js";
import type { AuthRequest } from "#middleware/authentication.js";
import { analyticsQueue } from "#utils/queueClient.js";
import redis from "#utils/redisClient.js";

const PG_UNIQUE_VIOLATION_CODE = "23505";
const MAX_RETRIES = 5;

interface DbErrorWithCode {
  code: string;
  message: string;
}

function isDbErrorWithCode(error: unknown): error is DbErrorWithCode {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  );
}

// --- Shorten ---
export async function shorten(req: AuthRequest, res: Response) {
  const { url } = createUrlSchema.parse(req.body);
  const userId = req.user!.id;

  let shortId: string;
  let attempts = 0;

  while (attempts < MAX_RETRIES) {
    shortId = nanoid(7);

    const data: typeof urls.$inferInsert = {
      shortCode: shortId,
      originalUrl: url,
      userId: userId,
    };

    try {
      await db.insert(urls).values(data);

      const shortUrl = `${req.protocol}://${req.get("host")}/${shortId}`;

      return res.status(201).json({
        shortUrl,
        code: shortId,
        originalUrl: url,
      });
    } catch (error) {
      if (isDbErrorWithCode(error)) {
        if (error.code === PG_UNIQUE_VIOLATION_CODE) {
          req.log.warn(
            { attempt: attempts + 1, shortId },
            "Collision detected on short code insertion. Retrying."
          );

          attempts++;
          continue;
        }
      }

      throw error;
    }
  }

  req.log.error(
    `Failed to generate unique short ID after ${MAX_RETRIES} attempts.`
  );

  throw new AppError(
    "Service is under high load. Please try again shortly.",
    503
  );
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
    await redis.expire(`url:${shortCode}`, 604800);
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

// --- User URLs ---
export async function getUserUrlAnalytics(req: AuthRequest, res: Response) {
  const userId = req.user!.id;

  const stats = await db
    .select({
      shortCode: urls.shortCode,
      originalUrl: urls.originalUrl,
      clickCount: urls.clickCount,
      lastClickedAt: urls.lastClickedAt,
      createdAt: urls.createdAt,
    })
    .from(urls)
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
