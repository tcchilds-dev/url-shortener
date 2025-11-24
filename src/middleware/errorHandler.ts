import { type Request, type Response, type NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "#utils/AppError.js";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  // Default to 500 Internal Server Error
  let statusCode = 500;
  let message = "Internal Server Error";

  // Handle Zod Validation Errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      message: "Validation Error",
      error: err.issues,
    });
  }

  // Handle Custom App Errors (Operational)
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    res.status(statusCode).json(message);
  }

  // Handle Unknown/Programming Errors
  console.error("ERROR:", err); // Log the full error for dev
  return res.status(statusCode).json({
    status: "error",
    message: "Something went wrong!", // Don't leak stack traces to the client
  });
};
