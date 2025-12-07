import {
  OpenApiGeneratorV3,
  OpenAPIRegistry,
} from "@asteasolutions/zod-to-openapi";
import { createUrlSchema, getUrlSchema } from "../zod-schemas/url.schema.js";
import { userDataSchema } from "#zod-schemas/user.schema.js";
import type { OpenAPIObject } from "openapi3-ts/oas30";
import z from "zod";

export const registry = new OpenAPIRegistry();

registry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
});

registry.register("CreateUrlRequest", createUrlSchema);
registry.register("GetUrlParams", getUrlSchema);
registry.register("UserData", userDataSchema);

registry.registerPath({
  method: "post",
  path: "/register",
  summary: "Register a new user",
  description: "Creates a new user account with email and password",
  tags: ["Authentication"],
  request: {
    body: {
      content: {
        "application/json": {
          schema: userDataSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Successfully registered new user",
      content: {
        "application/json": {
          schema: z.object({
            user: z.object({
              id: z.uuidv7().describe("User's unique identifier"),
              email: z.email().describe("User's email address"),
            }),
            token: z
              .string()
              .describe("JWT authentication token (expires in 7 days)"),
          }),
        },
      },
    },
    400: {
      description:
        "Bad request - Account already exists with that email or invalid input",
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/login",
  summary: "Log in to an existing account",
  description:
    "Authenticates a user with email and password, returning a JWT token",
  tags: ["Authentication"],
  request: {
    body: {
      content: {
        "application/json": {
          schema: userDataSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Successfully authenticated user",
      content: {
        "application/json": {
          schema: z.object({
            user: z.object({
              id: z.uuidv7().describe("User's unique identifier"),
              email: z.email().describe("User's email address"),
            }),
            token: z
              .string()
              .describe("JWT authentication token (expires in 7 days)"),
          }),
        },
      },
    },
    400: {
      description: "Bad request - Invalid password",
    },
    404: {
      description: "User not found - No account exists with that email",
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/shorten",
  summary: "Shorten a URL",
  description:
    "Recieve a long URL, create a shortened URL for an authorized user",
  tags: ["Shorten"],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: createUrlSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "URL created successfully",
      content: {
        "application/json": {
          schema: z.object({
            shortUrl: z.url(),
            code: z.string().length(7),
            originalUrl: z.url(),
          }),
        },
      },
    },
    400: {
      description: "Validation Error",
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/{shortCode}",
  summary: "Redirect using short code",
  description:
    "Look up the entry with the given short code, record analytics, and redirect to the original URL",
  tags: ["Redirect"],
  request: {
    params: getUrlSchema,
  },
  responses: {
    302: {
      description: "Redirects to the original URL",
    },
    400: {
      description: "Validation Error",
    },
    404: {
      description: "URL not found",
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/home",
  summary: "Get user URL analytics",
  description:
    "Retrieves analytics data for all URLs belonging to the authenticated user",
  tags: ["Analytics"],
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "Return stats for all URLs",
      content: {
        "application/json": {
          schema: z.array(
            z.object({
              urls: z.object({
                id: z.uuidv7(),
                shortCode: z.string().length(7),
                originalUrl: z.url(),
                userId: z.uuidv7(),
                clickCount: z.number(),
                lastClickedAt: z.iso.datetime(),
                createdAt: z.iso.datetime(),
              }),
              analytics: z.object({
                id: z.uuidv7(),
                urlId: z.uuidv7(),
                ip: z.string(),
                userAgent: z.string(),
                referer: z.string(),
                country: z.string(),
                city: z.string(),
                device: z.string(),
                createdAt: z.iso.datetime(),
              }),
            })
          ),
        },
      },
    },
    401: {
      description: "Unauthorized - Invalid or missing authentication token",
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/{shortCode}/stats",
  summary: "Get specific URL analytics",
  description: "Retrieves analytics data for a specific URL by its short code",
  tags: ["Analytics"],
  security: [{ bearerAuth: [] }],
  request: {
    params: getUrlSchema,
  },
  responses: {
    200: {
      description: "Returns stats",
      content: {
        "application/json": {
          schema: z.object({
            stats: z.object({
              urls: z.object({
                id: z.uuidv7(),
                shortCode: z.string().length(7),
                originalUrl: z.url(),
                userId: z.uuidv7(),
                clickCount: z.number(),
                lastClickedAt: z.iso.datetime(),
                createdAt: z.iso.datetime(),
              }),
              analytics: z.object({
                id: z.uuidv7(),
                urlId: z.uuidv7(),
                ip: z.string(),
                userAgent: z.string(),
                referer: z.string(),
                country: z.string(),
                city: z.string(),
                device: z.string(),
                createdAt: z.iso.datetime(),
              }),
            }),
          }),
        },
      },
    },
    400: {
      description: "Validation Error",
    },
    401: {
      description: "That url does not belong to this user",
    },
    404: {
      description: "URL not found",
    },
  },
});

export function generateOpenApiDocs(): OpenAPIObject {
  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: "3.0.0",
    info: {
      version: "1.0.0",
      title: "URL Shortener API",
      description: "A simple URL shortener API built with Express.",
    },
    servers: [{ url: "/" }],
  });
}
