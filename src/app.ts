import express from "express";
import { type Request, type Response } from "express";
import "dotenv/config";
import urlRoutes from "#routes/urlRoutes.js";
import { errorHandler } from "#middleware/errorHandler.js";
import { pinoHttp } from "pino-http";
import logger from "#utils/logger.js";
import helmet from "helmet";

const app = express();

// Tell Express I'm behind a proxy (Docker)
app.set("trust proxy", 1);

// Security
app.use(helmet());

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
  }),
);

// Routes
app.use("/api", urlRoutes);

// Error Handling
app.use(errorHandler);

// Health Check
app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", message: "URL-shortener API is running" });
});

export default app;
