import { type Request, type Response } from "express";
import { nanoid } from "nanoid";
import db from "#utils/client.js";
import { createUrlSchema, getUrlSchema } from "#zod-schemas/url.schema.js";
import { getUrlAnalyticsSchema } from "#zod-schemas/analytics.schema.js";
import { urls, analytics } from "#db/schema.js";
import { eq, sql } from "drizzle-orm";
import { AppError } from "#utils/AppError.js";
import type { AuthRequest } from "#middleware/authentication.js";
import { UAParser } from "ua-parser-js";
import geoip from "geoip-lite";

function lookupLocationFromIp(ip: string | undefined) {
  if (!ip) return null;
  const geo = geoip.lookup(ip);
  if (!geo) return null;

  return {
    country: geo.country ?? null,
    city: geo.city ?? null,
  };
}

export async function shorten(req: AuthRequest, res: Response) {
  const { body } = createUrlSchema.parse({ body: req.body });
  const { url } = body;
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

export async function codeRedirect(req: Request, res: Response) {
  const { params } = getUrlSchema.parse({ params: req.params });
  const { shortCode } = params;

  const [urlFound] = await db
    .select({ id: urls.id, url: urls.originalUrl })
    .from(urls)
    .where(eq(urls.shortCode, shortCode));

  if (!urlFound) {
    throw new AppError("URL not found", 404);
  }

  const ip = req.ip;
  const userAgent = req.get("user-agent") ?? undefined;
  const referer = req.get("referer") ?? null;

  const uaResult = UAParser(userAgent);
  const deviceType = uaResult.device.type ?? "desktop";

  const location = lookupLocationFromIp(ip);
  const country = location?.country ?? null;
  const city = location?.city ?? null;

  await db.transaction(async (tx) => {
    await tx
      .update(urls)
      .set({
        clickCount: sql<number>`${urls.clickCount} + 1`,
        lastClickedAt: new Date(),
      })
      .where(eq(urls.shortCode, shortCode));

    await tx.insert(analytics).values({
      urlId: urlFound.id,
      ip: ip,
      userAgent: userAgent,
      referer: referer,
      country: country,
      city: city,
      device: deviceType,
    });
  });

  return res.redirect(urlFound.url);
}

export async function getUserUrlAnalytics(req: AuthRequest, res: Response) {
  const userId = req.user!.id;

  const stats = await db
    .select()
    .from(urls)
    .innerJoin(analytics, eq(urls.id, analytics.urlId))
    .where(eq(urls.userId, userId));

  return res.status(200).json(stats);
}

export async function getSpecificUrlAnalytics(req: AuthRequest, res: Response) {
  const {
    params: { shortCode },
  } = getUrlSchema.parse({
    params: req.params,
  });
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
