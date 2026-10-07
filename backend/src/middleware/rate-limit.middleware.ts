import rateLimit from 'express-rate-limit';

/**
 * 1. General API Rate Limiter
 * Guards all /api/v1 endpoints against DDoS, aggressive scraping, and socket exhaustion.
 * Default: 300 requests per minute per IP.
 */
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_GENERAL_MAX || '300', 10),
  standardHeaders: true, // Return standard RateLimit-* headers
  legacyHeaders: false,
  message: {
    error: 'Too many requests from this IP. Please slow down and try again after a minute.'
  }
});

/**
 * 2. Strict Authentication Rate Limiter
 * Specifically targets login routes (/api/v1/auth/login, /api/v1/student/login).
 * Prevents password dictionary attacks, brute-force cracking, and credential stuffing.
 * Default: 15 attempts per 15 minutes per IP.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '15', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many authentication attempts from this IP. Please try again after 15 minutes.'
  }
});

/**
 * 3. File Upload & Processing Rate Limiter
 * Protects Excel report generation and mark sheet upload routes.
 * Prevents memory saturation, disk exhaustion, and CPU overload from Excel parsing.
 * Default: 30 uploads per 15 minutes per IP.
 */
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_UPLOAD_MAX || '30', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many report generation or upload requests. Please wait a few minutes before trying again.'
  }
});
