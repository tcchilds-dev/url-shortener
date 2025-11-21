import { type Request, type Response } from "express";
import { nanoid } from "nanoid";
import db from "#utils/client.js";
import { createUrlSchema, getUrlSchema } from "#schemas/url.schema.js";
import { urls } from "#db/schema.js";
import { eq, sql } from "drizzle-orm";
import { AppError } from "#utils/AppError.js";

export async function shorten(req: Request, res: Response) {
  const { body } = createUrlSchema.parse({ body: req.body });
  const { url } = body;
  const shortId = nanoid(7);

  const data: typeof urls.$inferInsert = {
    shortCode: shortId,
    originalUrl: url,
  };

  await db.insert(urls).values(data);

  // Build full short URL
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
    .select({ url: urls.originalUrl })
    .from(urls)
    .where(eq(urls.shortCode, shortCode));

  if (!urlFound) {
    throw new AppError("URL not found", 404);
  }

  await db
    .update(urls)
    .set({
      clickCount: sql<number>`${urls.clickCount} + 1`,
      lastClickedAt: new Date(),
    })
    .where(eq(urls.shortCode, shortCode));

  const url = urlFound.url;
  return res.redirect(url);
}

export async function codeStats(req: Request, res: Response) {
  const { params } = getUrlSchema.parse({ params: req.params });
  const { shortCode } = params;

  const [stats] = await db
    .select({ clicks: urls.clickCount, lastClick: urls.lastClickedAt })
    .from(urls)
    .where(eq(urls.shortCode, shortCode));

  if (!stats) {
    throw new AppError("URL not found", 404);
  }

  return res.status(200).json(stats);
}
