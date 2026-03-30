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

/**
 * Extracts the client IP from request headers.
 *
 * Prefers x-real-ip (set by reverse proxies like Vercel/Nginx) over
 * x-forwarded-for. When x-forwarded-for is used, takes the leftmost
 * entry (the original client). Falls back to "unknown" so requests
 * without either header don't silently share a single rate-limit bucket.
 */
export function getClientIp(request: Request): string {
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();

  return "unknown";
}
