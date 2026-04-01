import { Pool } from "pg";
import { RateLimiterPostgres, RateLimiterMemory } from "rate-limiter-flexible";

/** Duration (in seconds) for the login rate-limit window. */
export const LOGIN_LIMIT_DURATION = 15 * 60;

/** Maximum login attempts allowed per IP within the window. */
export const LOGIN_LIMIT_POINTS = 5;

/** Duration (in seconds) for the registration rate-limit window. */
export const REGISTER_LIMIT_DURATION = 60 * 60;

/** Maximum registrations allowed per IP within the window. */
export const REGISTER_LIMIT_POINTS = 3;

function createPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for rate limiting.");
  }
  return new Pool({ connectionString: process.env.DATABASE_URL });
}

const globalStore = globalThis as unknown as { __rateLimitPool?: Pool };

const pgPool = new Proxy({} as Pool, {
  get(_target, prop, receiver) {
    const pool = (globalStore.__rateLimitPool ??= createPool());
    const value = Reflect.get(pool, prop, receiver);
    return typeof value === "function" ? value.bind(pool) : value;
  },
});

const fallbackLogin = new RateLimiterMemory({
  points: LOGIN_LIMIT_POINTS,
  duration: LOGIN_LIMIT_DURATION,
});

const fallbackRegister = new RateLimiterMemory({
  points: REGISTER_LIMIT_POINTS,
  duration: REGISTER_LIMIT_DURATION,
});

/**
 * Rate limiter for login attempts.
 * Allows 5 attempts per IP per 15 minutes.
 * Backed by Postgres so limits persist across serverless invocations.
 */
export const loginLimiter = new RateLimiterPostgres({
  storeClient: pgPool,
  points: LOGIN_LIMIT_POINTS,
  duration: LOGIN_LIMIT_DURATION,
  keyPrefix: "login",
  tableName: "rate_limits",
  insuranceLimiter: fallbackLogin,
});

/**
 * Rate limiter for account registration.
 * Allows 3 registrations per IP per hour.
 * Backed by Postgres so limits persist across serverless invocations.
 */
export const registerLimiter = new RateLimiterPostgres({
  storeClient: pgPool,
  points: REGISTER_LIMIT_POINTS,
  duration: REGISTER_LIMIT_DURATION,
  keyPrefix: "register",
  tableName: "rate_limits",
  insuranceLimiter: fallbackRegister,
});

/**
 * Extracts the client IP from request headers.
 *
 * Prefers x-real-ip (set by trusted proxies like Vercel/Nginx) over
 * x-forwarded-for. When x-forwarded-for is used, takes the rightmost
 * entry (the one appended by the trusted proxy closest to the server).
 * Falls back to "unknown" so requests without headers don't silently
 * share a single rate-limit bucket.
 */
export function getClientIp(request: Request): string {
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const parts = forwardedFor.split(",");
    return parts[parts.length - 1].trim();
  }

  return "unknown";
}
