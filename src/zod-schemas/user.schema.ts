import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

export const userDataSchema = z.object({
  email: z.email({ message: "Invalid email" }).openapi({
    example: "user@example.com",
    description: "The user's email address",
  }),
  password: z.string().min(8).openapi({
    example: "supersecretpassword",
    description: "The user's password",
  }),
});

export const authHeaderSchema = z.object({
  authorization: z
    .string({
      message: "Authorization header is required",
    })
    .regex(/^Bearer\s+\S+$/, "Invalid Authorization header format"),
});
