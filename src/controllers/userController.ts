import { type Request, type Response } from "express";
import db from "#utils/drizzleClient.js";
import { users } from "#db/schema.js";
import { eq } from "drizzle-orm";
import { AppError } from "#utils/AppError.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { userDataSchema } from "#zod-schemas/user.schema.js";

// Registers a new user.
export async function register(req: Request, res: Response) {
  const { email, password } = userDataSchema.parse(req.body);

  const checkExisting = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email));
  if (checkExisting.length > 0) {
    throw new AppError("An account already exists with that email", 400);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const data: typeof users.$inferInsert = {
    email: email,
    password: hashedPassword,
  };

  const [user] = await db
    .insert(users)
    .values(data)
    .returning({ id: users.id, email: users.email });

  const token = jwt.sign({ userId: user!.id }, process.env.JWT_SECRET!, {
    expiresIn: "7d",
  });

  return res.status(201).json({
    user: { id: user!.id, email: user!.email },
    token,
  });
}

// Log a user in.
export async function logIn(req: Request, res: Response) {
  const { email, password } = userDataSchema.parse(req.body);

  const [user] = await db.select().from(users).where(eq(users.email, email));

  if (!user) {
    throw new AppError("Invalid email or password", 401);
  }

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    throw new AppError("Invalid email or password", 401);
  }

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
    expiresIn: "7d",
  });

  return res.status(201).json({
    user: { id: user.id, email: user!.email },
    token,
  });
}
