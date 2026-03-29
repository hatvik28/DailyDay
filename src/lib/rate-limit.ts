import { RateLimiterMemory } from "rate-limiter-flexible";

/**
 * Rate limiter for login attempts.
 * Allows 5 attempts per IP per 15 minutes.
 * Protects against brute force attacks on user accounts.
 */
export const loginLimiter = new RateLimiterMemory({
  points: 5,
  duration: 15 * 60,
});

/**
 * Rate limiter for account registration.
 * Allows 3 registrations per IP per hour.
 * Prevents automated account creation / spam.
 */
export const registerLimiter = new RateLimiterMemory({
  points: 3,
  duration: 60 * 60,
});

/** Extracts the client IP from request headers. */
export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    "127.0.0.1"
  );
}
