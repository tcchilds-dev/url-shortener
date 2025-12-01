import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "test-secret-key";

export const generateTestToken = (payload: object) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
};

export const generateExpiredToken = (payload: object) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "-1h" });
};
