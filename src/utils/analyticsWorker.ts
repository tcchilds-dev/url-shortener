import { Worker } from "bullmq";
import db from "./client.js";
import { urls, analytics } from "#db/schema.js";
import { eq, sql } from "drizzle-orm";
import { UAParser } from "ua-parser-js";
import geoip from "geoip-lite";

const connection = {
  url: process.env.REDIS_URL || "redis://localhost:6379",
};

function lookupLocationFromIp(ip: string | undefined) {
  if (!ip) return null;
  const geo = geoip.lookup(ip);
  if (!geo) return null;
  return { country: geo.country ?? null, city: geo.city ?? null };
}

const worker = new Worker(
  "analytics-queue",
  async (job) => {
    const { shortCode, ip, userAgent, referer } = job.data;

    console.log(`Processing click for ${shortCode}...`);

    // find URL ID
    const [urlFound] = await db
      .select({ id: urls.id })
      .from(urls)
      .where(eq(urls.shortCode, shortCode));

    if (!urlFound) {
      console.error(`URL not found for code: ${shortCode}`);
      return;
    }

    // perform CPU heavy tasks
    const uaResult = UAParser(userAgent);
    const deviceType = uaResult.device.type ?? "desktop";

    const location = lookupLocationFromIp(ip);
    const country = location?.country ?? null;
    const city = location?.city ?? null;

    // db write transaction
    await db.transaction(async (tx) => {
      await tx
        .update(urls)
        .set({
          clickCount: sql<number>`${urls.clickCount} + 1`,
          lastClickedAt: new Date(),
        })
        .where(eq(urls.id, urlFound.id));

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

    console.log(`Stats saved for ${shortCode}`);
  },
  { connection }
);

console.log("Analytics Worker Started 🚀");

export default worker;
