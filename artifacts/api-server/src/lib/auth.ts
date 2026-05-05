import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import type { Request, Response, NextFunction } from "express";
import { db, usersTable, revokedTokensTable } from "@workspace/db";
import { eq, lt } from "drizzle-orm";
import type { WarehouseRole } from "@workspace/db";

const jwtSecret = process.env.SESSION_SECRET;
if (!jwtSecret) {
  throw new Error("SESSION_SECRET environment variable is required. Set it in your .env file.");
}
const JWT_SECRET = jwtSecret;

const JWT_EXPIRES_IN = "8h";
const JWT_EXPIRES_SECONDS = 8 * 60 * 60;
const COOKIE_NAME = "auth_token";

export async function cleanupExpiredTokens(): Promise<void> {
  try {
    await db.delete(revokedTokensTable).where(lt(revokedTokensTable.expiresAt, new Date()));
  } catch {
    // Non-critical — cleanup failure should never block normal operation.
  }
}

setInterval(() => void cleanupExpiredTokens(), 60 * 60 * 1000).unref();

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: { userId: string; email: string; role: WarehouseRole }): string {
  const jti = randomUUID();
  return jwt.sign({ ...payload, jti }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

type TokenPayload = { userId: string; email: string; role: WarehouseRole; jti: string; exp: number };

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export async function revokeToken(jti: string, expiresAt: Date): Promise<void> {
  try {
    await db.insert(revokedTokensTable).values({ jti, expiresAt }).onConflictDoNothing();
  } catch {
    // Best-effort: if insert fails, token will naturally expire via JWT exp.
  }
}

export type AuthenticatedRequest = Request & {
  userId: string;
  userRole: WarehouseRole;
  userEmail: string;
  jti: string;
  tokenExp: number;
};

// ── Cookie helpers ───────────────────────────────────────────────────────────

export function setAuthCookie(res: Response, token: string): void {
  const isProduction = process.env.NODE_ENV === "production";
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: isProduction,
    maxAge: JWT_EXPIRES_SECONDS * 1000,
    path: "/",
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, { path: "/" });
}

export function getTokenFromRequest(req: Request): string | null {
  // Prefer explicit Authorization header (mobile / programmatic clients).
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }
  // Fallback to HttpOnly cookie (browser XSS protection).
  return req.cookies?.[COOKIE_NAME] ?? null;
}

// ── Middleware ────────────────────────────────────────────────────────────────

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      res.status(401).json({ error: "No autorizado" });
      return;
    }

    const payload = verifyToken(token);
    if (!payload) {
      res.status(401).json({ error: "Token inválido o expirado" });
      return;
    }

    const [userRows, revokedRows] = await Promise.all([
      db
        .select({ status: usersTable.status, role: usersTable.role })
        .from(usersTable)
        .where(eq(usersTable.id, payload.userId))
        .limit(1),
      db
        .select({ jti: revokedTokensTable.jti })
        .from(revokedTokensTable)
        .where(eq(revokedTokensTable.jti, payload.jti))
        .limit(1),
    ]);

    if (revokedRows.length > 0) {
      res.status(401).json({ error: "Sesión cerrada. Inicia sesión nuevamente." });
      return;
    }

    if (userRows.length === 0 || userRows[0]!.status !== "active") {
      res.status(401).json({ error: "Cuenta desactivada o no encontrada" });
      return;
    }

    const authedReq = req as AuthenticatedRequest;
    authedReq.userId = payload.userId;
    authedReq.userRole = userRows[0]!.role;
    authedReq.userEmail = payload.email;
    authedReq.jti = payload.jti;
    authedReq.tokenExp = payload.exp;
    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...roles: WarehouseRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authedReq = req as AuthenticatedRequest;
    if (!authedReq.userId) {
      res.status(401).json({ error: "No autorizado" });
      return;
    }
    if (!roles.includes(authedReq.userRole)) {
      res.status(403).json({ error: "Acceso denegado: rol insuficiente" });
      return;
    }
    next();
  };
}
