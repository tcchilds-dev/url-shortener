import express from "express";
import type { Request, Response, Application } from "express";
import "dotenv/config";
import urlRoutes from "#routes/urlRoutes.js";
import userRoutes from "#routes/userRoutes.js";
import { errorHandler } from "#middleware/errorHandler.js";
import { pinoHttp } from "pino-http";
import logger from "#utils/logger.js";
import helmet from "helmet";
import { apiReference } from "@scalar/express-api-reference";
import { generateOpenApiDocs } from "#docs/openApiGenerator.js";

const app: Application = express();

// Tell Express I'm behind a proxy (Docker)
app.set("trust proxy", true);

// Security
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        scriptSrc: ["'self'", "https://cdn.jsdelivr.net", "'unsafe-inline'"],
        styleSrc: ["'self'", "https://cdn.jsdelivr.net", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https://cdn.jsdelivr.net"],
        defaultSrc: ["'self'"],
        connectSrc: ["'self'"],
      },
    },
  })
);

// Body Parser
app.use(express.json());

// Logger
app.use(
  pinoHttp({
    logger,
    serializers: {
      req: (req: Request) => ({
        method: req.method,
        url: req.url,
        // userId: req.user?.id
      }),
    },
  })
);

// Docs
const openApiDocs = generateOpenApiDocs();

// raw JSON
app.get("/openapi.json", (req: Request, res: Response) => {
  res.json(openApiDocs);
});

// Scalar UI
app.use(
  "/docs",
  apiReference({
    theme: "purple",
    content: openApiDocs,
  })
);

// Routes
app.use("/", urlRoutes);
app.use("/", userRoutes);

// Error Handling
app.use(errorHandler);

// Health Check
app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", message: "URL-shortener API is running" });
});

export default app;
