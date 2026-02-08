import rateLimit from "express-rate-limit";
import { Request, Response } from "express";

/**
 * Rate limiter that tracks per user per API endpoint
 * Allows 20 requests per minute per user per endpoint
 */
export const perUserPerApiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  
  // Generate unique key per user per API endpoint
  keyGenerator: (req: Request) => {
    const userId = (req as any).auth?.userId || req.ip || "anonymous";
    const endpoint = `${req.method}:${req.path}`;
    return `${userId}:${endpoint}`;
  },
  
  // Custom handler when rate limit is exceeded
  handler: (req: Request, res: Response) => {
    const userId = (req as any).auth?.userId || "anonymous";
    const endpoint = `${req.method}:${req.path}`;
    
    res.status(429).json({
      error: "Too many requests",
      message: `Rate limit exceeded for ${endpoint}. Maximum 20 requests per minute allowed.`,
      userId: userId === "anonymous" ? undefined : userId,
      retryAfter: Math.ceil(60), // seconds
    });
  },
  
  // Skip rate limiting for certain conditions
  skip: (req: Request) => {
    // Skip rate limiting for health check endpoints
    if (req.path === "/" || req.path === "/health") {
      return true;
    }
    return false;
  },
});

/**
 * Stricter rate limiter for sensitive operations
 * Allows 5 requests per minute for create/delete operations
 */
export const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  
  keyGenerator: (req: Request) => {
    const userId = (req as any).auth?.userId || req.ip || "anonymous";
    const endpoint = `${req.method}:${req.path}`;
    return `strict:${userId}:${endpoint}`;
  },
  
  handler: (req: Request, res: Response) => {
    const userId = (req as any).auth?.userId || "anonymous";
    
    res.status(429).json({
      error: "Too many requests",
      message: "Rate limit exceeded for this operation. Maximum 5 requests per minute allowed.",
      userId: userId === "anonymous" ? undefined : userId,
      retryAfter: Math.ceil(60),
    });
  },
});

/**
 * Global rate limiter as a fallback
 * Prevents abuse from a single IP
 */
export const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  
  keyGenerator: (req: Request) => {
    return req.ip || "unknown";
  },
  
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: "Too many requests",
      message: "Global rate limit exceeded. Please try again later.",
      retryAfter: Math.ceil(60),
    });
  },
  
  skip: (req: Request) => {
    if (req.path === "/" || req.path === "/health") {
      return true;
    }
    return false;
  },
});
