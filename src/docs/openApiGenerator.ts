import {
  OpenApiGeneratorV3,
  OpenAPIRegistry,
} from "@asteasolutions/zod-to-openapi";
import { createUrlSchema, getUrlSchema } from "../schemas/url.schema.js";

export const registry = new OpenAPIRegistry();

registry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
});

registry.register("CreateUrlRequest", createUrlSchema);
registry.register("GetUrlParams", getUrlSchema);

registry.registerPath({
  method: "post",
  path: "/api/shorten",
  description: "Shorten a URL",
  summary: "Create a shortened URL",
  tags: ["URL"],
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
          schema: {
            type: "object",
            properties: {
              shortUrl: {
                type: "string",
                example: "http://localhost:3000/abc1234",
              },
              code: { type: "string", example: "abc1234" },
              originalUrl: { type: "string" },
            },
          },
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
  path: "/api/{shortCode}",
  description: "Redirect to the original URL",
  summary: "Redirect using short code",
  tags: ["URL"],
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
  path: "/api/{shortCode}/stats",
  description: "Show click count and last clicked time for short code",
  summary: "Return stats for short code",
  tags: ["URL"],
  request: {
    params: getUrlSchema,
  },
  responses: {
    200: {
      description: "Returns stats",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              clicks: { type: "number", example: 42 },
              lastClick: { type: "string", format: "datetime" },
            },
          },
        },
      },
    },
    400: {
      description: "Validation Error",
    },
    404: {
      description: "URL not found",
    },
  },
});

export function generateOpenApiDocs() {
  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: "3.0.0",
    info: {
      version: "1.0.0",
      title: "URL Shortener API",
      description:
        "A simple URL shortener API built with Express, Drizzle, and Zod.",
    },
    servers: [{ url: "/api" }],
  });
}
