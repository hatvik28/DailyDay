import { Pool } from "pg";
import { RateLimiterPostgres, RateLimiterMemory } from "rate-limiter-flexible";
import {
  LOGIN_LIMIT_DURATION,
  LOGIN_LIMIT_POINTS,
  REGISTER_LIMIT_DURATION,
  REGISTER_LIMIT_POINTS,
} from "./rate-limit-config";

export {
  LOGIN_LIMIT_DURATION,
  LOGIN_LIMIT_POINTS,
  REGISTER_LIMIT_DURATION,
  REGISTER_LIMIT_POINTS,
} from "./rate-limit-config";

const globalStore = globalThis as unknown as {
  __rateLimitPool?: Pool;
  __loginLimiter?: RateLimiterPostgres;
  __registerLimiter?: RateLimiterPostgres;
};

function getPool(): Pool {
  if (!globalStore.__rateLimitPool) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required for rate limiting.");
    }
    globalStore.__rateLimitPool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }
  return globalStore.__rateLimitPool;
}

function getLoginLimiter(): RateLimiterPostgres {
  if (!globalStore.__loginLimiter) {
    globalStore.__loginLimiter = new RateLimiterPostgres({
      storeClient: getPool(),
      points: LOGIN_LIMIT_POINTS,
      duration: LOGIN_LIMIT_DURATION,
      keyPrefix: "login",
      tableName: "rate_limits",
      insuranceLimiter: new RateLimiterMemory({
        points: LOGIN_LIMIT_POINTS,
        duration: LOGIN_LIMIT_DURATION,
      }),
    });
  }
  return globalStore.__loginLimiter;
}

function getRegisterLimiter(): RateLimiterPostgres {
  if (!globalStore.__registerLimiter) {
    globalStore.__registerLimiter = new RateLimiterPostgres({
      storeClient: getPool(),
      points: REGISTER_LIMIT_POINTS,
      duration: REGISTER_LIMIT_DURATION,
      keyPrefix: "register",
      tableName: "rate_limits",
      insuranceLimiter: new RateLimiterMemory({
        points: REGISTER_LIMIT_POINTS,
        duration: REGISTER_LIMIT_DURATION,
      }),
    });
  }
  return globalStore.__registerLimiter;
}

/**
 * Rate limiter for login attempts.
 * Allows 5 attempts per IP per 15 minutes.
 * Backed by Postgres so limits persist across serverless invocations.
 * Lazily initialized to avoid importing pg at build time.
 */
export const loginLimiter = {
  consume(key: string, pointsToConsume?: number) {
    return getLoginLimiter().consume(key, pointsToConsume);
  },
};

/**
 * Rate limiter for account registration.
 * Allows 3 registrations per IP per hour.
 * Backed by Postgres so limits persist across serverless invocations.
 * Lazily initialized to avoid importing pg at build time.
 */
export const registerLimiter = {
  consume(key: string, pointsToConsume?: number) {
    return getRegisterLimiter().consume(key, pointsToConsume);
  },
};

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
