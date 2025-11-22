import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

export const createUrlSchema = z
  .object({
    body: z.object({
      url: z
        .string()
        .refine(
          (val) => {
            try {
              new URL(val);
              return true;
            } catch (err) {
              console.error(err);
              return false;
            }
          },
          {
            message: "Invalid URL format",
          },
        )
        .openapi({
          example: "https://www.google.com",
          description: "The full URL you want to shorten",
        }),
    }),
  })
  .openapi("CreateUrlRequest");

export const getUrlSchema = z
  .object({
    params: z.object({
      shortCode: z.string().length(7).openapi({
        example: "abc1234",
        description: "The short code off of the shortened URL",
      }),
    }),
  })
  .openapi("GetUrlParams");
