import express from "express";
import type { Request, Response, Application, NextFunction } from "express";
import "dotenv/config";
import urlRoutes from "#routes/urlRoutes.js";
import userRoutes from "#routes/userRoutes.js";
import { errorHandler } from "#middleware/errorHandler.js";
import { pinoHttp } from "pino-http";
import logger from "#utils/logger.js";
import helmet from "helmet";
import { apiReference } from "@scalar/express-api-reference";
import { generateOpenApiDocs } from "#docs/openApiGenerator.js";
import type { AuthRequest } from "#middleware/authentication.js";

const app: Application = express();

// Check Environment
const isDevelopment = process.env.NODE_ENV === "development";

// --- Coditional CSP Exception Middleware for Docs ---
const scalarCspDevException = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (isDevelopment && req.path.startsWith("/docs")) {
    const relaxedCsp =
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "font-src 'self' https://fonts.gstatic.com; " +
      "img-src 'self' data: https:; " +
      "connect-src 'self' https:";

    res.setHeader("Content-Security-Policy", relaxedCsp);

    next();
  } else {
    next();
  }
};

// Tell Express I'm behind a proxy (Docker)
app.set("trust proxy", 1);

// Security
// TODO: find a way to stop using "unsafe inline"
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
        styleSrc: ["'self'", "https://cdn.jsdelivr.net"],
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
      req: (req: AuthRequest) => ({
        method: req.method,
        url: req.url,
        userId: req.user?.id,
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

app.use("/docs", scalarCspDevException);

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
