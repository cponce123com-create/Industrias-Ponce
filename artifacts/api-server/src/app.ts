// ─────────────────────────────────────────────────────────────────────────────
// API Versioning Plan (ARC-03)
// All routes should migrate to /api/v1/ prefix in a future release.
// When that migration happens, the /api prefix will serve v1 by default.
// ─────────────────────────────────────────────────────────────────────────────

import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import compression from "compression";
import cookieParser from "cookie-parser";
import path from "path";
import router from "./routes";
import { logger } from "./lib/logger";
import { generalApiLimiter } from "./lib/rate-limit.js";
import { apiErrorHandler } from "./lib/error";

const app: Express = express();

// ---------------------------------------------------------------------------
// Trust proxy — "loopback" solo confía en el proxy local de Render,
// evitando que un atacante falsee su IP con el header X-Forwarded-For.
// ---------------------------------------------------------------------------
app.set("trust proxy", 1);

// ---------------------------------------------------------------------------
// Compression — gzip/brotli early in the chain so it applies to all responses.
// ---------------------------------------------------------------------------
app.use(compression());

// ---------------------------------------------------------------------------
// Helmet — agrega headers HTTP de seguridad automáticamente:
//   X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security, etc.
// Se coloca ANTES de cualquier ruta.
// ---------------------------------------------------------------------------
app.use(helmet());

// ---------------------------------------------------------------------------
// Static frontend serving (production only)
//
// In Replit, the frontend (legado) is served separately as a static artifact
// on "/" and the API runs on "/api". On Render there is only ONE service, so
// the Express server must serve both:
//   - /api/*  → API routes (registered below)
//   - /*      → React SPA (legado/dist/public)
//
// We use process.cwd() (the monorepo root) to locate the frontend build.
// This avoids relying on import.meta.url which becomes undefined when esbuild
// compiles ESM → CJS format, causing a TypeError at startup.
// ---------------------------------------------------------------------------
const FRONTEND_DIST = process.env.FRONTEND_DIST_PATH
  ?? path.resolve(process.cwd(), "artifacts/legado/dist/public");

function getAllowedOrigins(): string[] {
  const origins: string[] = [];
  if (process.env.APP_URL) origins.push(process.env.APP_URL.replace(/\/$/, ""));
  if (process.env.REPLIT_DOMAINS) {
    for (const d of process.env.REPLIT_DOMAINS.split(",")) {
      origins.push(`https://${d.trim()}`);
    }
  }
  if (process.env.REPLIT_DEV_DOMAIN) {
    origins.push(`https://${process.env.REPLIT_DEV_DOMAIN}`);
  }
  if (process.env.NODE_ENV !== "production") {
    origins.push("http://localhost:3000", "http://localhost:5173", "http://localhost:19854");
  }
  return origins;
}

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const allowed = getAllowedOrigins();
    if (allowed.includes(origin)) return callback(null, true);
    logger.warn({ origin }, "CORS blocked request from unauthorized origin");
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

app.use("/api", generalApiLimiter, router);

// Health check endpoint — required by render.yaml (healthCheckPath: /api/healthz)
app.get("/api/healthz", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ---------------------------------------------------------------------------
// Serve the React SPA in production.
// Static assets (JS, CSS, images) are served from FRONTEND_DIST.
// Any non-/api route that doesn't match a static file falls back to
// index.html so that client-side routing (wouter) works correctly.
// ---------------------------------------------------------------------------
if (process.env.NODE_ENV === "production") {
  // Serve static files (assets/, favicon.svg, etc.) — cache aggressively
  app.use("/static", express.static(path.join(__dirname, "../static"), {
    maxAge: "1y",
    etag: true,
  }));

  // index.html — always fresh so users get new JS bundles
  app.get("/index.html", (_req: Request, res: Response) => {
    res.setHeader("Cache-Control", "no-cache, must-revalidate");
    res.sendFile(path.join(FRONTEND_DIST, "index.html"));
  });

  // Serve static files (assets/, favicon.svg, etc.)
  app.use(express.static(FRONTEND_DIST));

  // SPA fallback: every non-API GET that doesn't match a file → index.html
  app.get(/^\/(?!api).*$/, (_req: Request, res: Response) => {
    res.sendFile(path.join(FRONTEND_DIST, "index.html"));
  });

  logger.info({ frontendDist: FRONTEND_DIST }, "Serving frontend static files");
}

// Global error handler — catches any unhandled errors thrown in route handlers.
// apiErrorHandler handles ApiError instances with proper status codes and codes.
// Unknown errors are logged and return a generic 500 to avoid leaking internals.
app.use(apiErrorHandler);

export default app;
