import type { Request, Response, NextFunction } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { AppError } from "#utils/AppError.js";
import { authHeaderSchema } from "#zod-schemas/user.schema.js";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email?: string;
  };
}

export function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const parsed = authHeaderSchema.parse({
    authorization: req.headers.authorization,
  });

  const { authorization } = parsed;

  const token = authorization.split(" ")[1];

  let payload: JwtPayload;
  try {
    payload = jwt.verify(token!, process.env.JWT_SECRET!) as JwtPayload;
  } catch {
    throw new AppError("Invalid or expired token", 401);
  }

  req.user = {
    id: payload.userId,
    email: payload.email,
  };

  return next();
}
