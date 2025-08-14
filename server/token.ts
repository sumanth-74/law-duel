import jwt from "jsonwebtoken";

const ACCESS_TTL = "7d"; // adjust as you like
const SECRET = process.env.JWT_SECRET || "change-me-now";

export function signAccessToken(user: { id: string; username: string }) {
  return jwt.sign({ sub: user.id, username: user.username }, SECRET, { expiresIn: ACCESS_TTL });
}

export function verifyAccessToken(authHeader?: string) {
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) return null;
  const token = authHeader.slice(7).trim();
  try {
    const payload = jwt.verify(token, SECRET) as { sub: string; username?: string; exp: number };
    return payload;
  } catch {
    return null;
  }
}