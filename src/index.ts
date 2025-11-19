import express from "express";
import { type Request, type Response } from "express";
import "dotenv/config";
import urlRoutes from "#routes/urlRoutes.js";
import { errorHandler } from "#middleware/errorHandler.js";

const app = express();
const port = process.env.PORT ?? "3000";

// Middleware
app.use(express.json());

// Routes
app.use("/api", urlRoutes);

// Error Handling
app.use(errorHandler);

// Health Check
app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", message: "URL-shortener API is running" });
});

// Listen
app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
