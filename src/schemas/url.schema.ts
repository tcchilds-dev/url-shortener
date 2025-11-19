import * as z from "zod";

export const createUrlSchema = z.object({
  body: z.object({
    url: z.string().refine(
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
    ),
  }),
});

export const getUrlSchema = z.object({
  params: z.object({
    shortCode: z.string().length(7),
  }),
});
