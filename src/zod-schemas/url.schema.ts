import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

export const createUrlSchema = z
  .object({
    url: z.url({ message: "Invalid URL format" }).openapi({
      example: "https://www.google.com",
      description: "The full URL you want to shorten",
    }),
  })
  .openapi("CreateUrlRequest");

export const getUrlSchema = z
  .object({
    shortCode: z.string().length(7).openapi({
      example: "abc1234",
      description: "The short code off of the shortened URL",
    }),
  })
  .openapi("GetUrlParams");
