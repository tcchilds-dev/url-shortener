import { type Request, type Response, type NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "#utils/AppError.js";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Default to 500 Internal Server Error.
  let statusCode = 500;
  let message = "Internal Server Error";

  // Handles zod validation errors.
  if (err instanceof ZodError) {
    return res.status(400).json({
      message: "Validation Error",
      error: err.issues,
    });
  }

  // Handles custom app errors (operational).
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    res.status(statusCode).json({ message });
  }

  // Handle unknown/programming errors.
  console.error("ERROR:", err);
  return res.status(statusCode).json({
    status: "error",
    message: "Something went wrong!",
  });
};
