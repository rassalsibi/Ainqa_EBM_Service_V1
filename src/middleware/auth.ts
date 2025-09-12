import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";

/**
 * Custom API Key Authentication Middleware
 * Validates API key from Authorization: Bearer <api-key> header
 * Compares against API_KEY environment variable
 */
export async function apiKeyAuth(c: Context, next: Next): Promise<void> {
  const apiKey = process.env.API_KEY;

  // Check if API_KEY is configured
  if (!apiKey) {
    console.error("API_KEY environment variable not configured");
    throw new HTTPException(500, {
      message: "Authentication configuration error",
    });
  }

  // Get Authorization header
  const authHeader = c.req.header("Authorization");

  if (!authHeader) {
    throw new HTTPException(401, {
      message:
        "Authorization header required. Format: Authorization: Bearer <api-key>",
    });
  }

  // Extract Bearer token
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    throw new HTTPException(401, {
      message:
        "Invalid authorization format. Expected: Authorization: Bearer <api-key>",
    });
  }

  // Compare API key with environment variable
  if (token !== apiKey) {
    console.warn("Invalid API key attempt:", {
      provided: `${token.substring(0, 8)}...`,
      timestamp: new Date().toISOString(),
      userAgent: c.req.header("User-Agent"),
      ip: c.req.header("x-forwarded-for") || c.req.header("x-real-ip"),
    });

    throw new HTTPException(401, {
      message: "Invalid API key",
    });
  }

  // API key is valid, proceed
  await next();
}
