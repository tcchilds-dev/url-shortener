import { z } from "zod";
import { authHeaderSchema } from "./user.schema.js";

export const getUrlAnalyticsSchema = z.object({
  headers: authHeaderSchema,
  params: z.object({
    shortCode: z.string().length(7),
  }),
  query: z.object({
    from: z.iso.datetime().optional(),
    to: z.iso.datetime().optional(),
  }),
});
