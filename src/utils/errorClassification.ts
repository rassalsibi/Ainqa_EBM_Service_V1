/**
 * Error Classification System for LLM Provider Fallback
 * Determines whether errors should trigger fallback to secondary providers
 */

export interface ErrorClassification {
  shouldFallback: boolean;
  errorType:
    | "transient"
    | "permanent"
    | "rate_limit"
    | "auth"
    | "model_unavailable";
  description: string;
}

/**
 * Classifies errors to determine fallback strategy
 * - Transient errors: Let AI SDK handle retries, then fallback if still failing
 * - Permanent errors: Fallback immediately without retries
 * - Auth errors: Fallback immediately (API key issues)
 * - Rate limit: Fallback immediately (provider overloaded)
 */
export function classifyError(error: unknown): ErrorClassification {
  // Handle AI SDK provider errors with HTTP response
  if (error && typeof error === "object" && "response" in error) {
    const response = (error as any).response;
    if (response && typeof response.status === "number") {
      const status = response.status;

      // 5xx - Server errors (transient, let AI SDK retry then fallback)
      if (status >= 500 && status < 600) {
        return {
          shouldFallback: true,
          errorType: "transient",
          description: `Server error ${status} - transient issue`,
        };
      }

      // 429 - Rate limiting (fallback immediately)
      if (status === 429) {
        return {
          shouldFallback: true,
          errorType: "rate_limit",
          description: "Rate limit exceeded",
        };
      }

      // 401/403 - Authentication/Authorization errors (fallback immediately)
      if (status === 401 || status === 403) {
        return {
          shouldFallback: true,
          errorType: "auth",
          description: "Authentication/authorization error",
        };
      }

      // 400 - Bad request (usually permanent, fallback)
      if (status === 400) {
        return {
          shouldFallback: true,
          errorType: "permanent",
          description: "Bad request - likely permanent issue",
        };
      }

      // 404 - Model not found (fallback)
      if (status === 404) {
        return {
          shouldFallback: true,
          errorType: "model_unavailable",
          description: "Model not found or unavailable",
        };
      }
    }
  }

  // Handle generic Error objects
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Network/timeout errors (transient)
    if (
      message.includes("timeout") ||
      message.includes("network") ||
      message.includes("econnreset") ||
      message.includes("connection")
    ) {
      return {
        shouldFallback: true,
        errorType: "transient",
        description: "Network/connection error",
      };
    }

    // API key errors
    if (
      message.includes("api key") ||
      message.includes("unauthorized") ||
      message.includes("authentication")
    ) {
      return {
        shouldFallback: true,
        errorType: "auth",
        description: "API key or authentication error",
      };
    }

    // Model not found errors
    if (
      message.includes("model") &&
      (message.includes("not found") || message.includes("unavailable"))
    ) {
      return {
        shouldFallback: true,
        errorType: "model_unavailable",
        description: "Model not available",
      };
    }

    // Rate limiting errors
    if (message.includes("rate limit") || message.includes("quota exceeded")) {
      return {
        shouldFallback: true,
        errorType: "rate_limit",
        description: "Rate limit or quota exceeded",
      };
    }
  }

  // Default: treat as transient error that should trigger fallback
  return {
    shouldFallback: true,
    errorType: "transient",
    description: "Unknown error - treating as transient",
  };
}

/**
 * Determines if an error should trigger immediate fallback
 * (vs letting AI SDK handle retries first)
 */
export function shouldFallbackImmediately(error: unknown): boolean {
  const classification = classifyError(error);

  // Immediate fallback for these error types
  return (
    classification.errorType === "auth" ||
    classification.errorType === "rate_limit" ||
    classification.errorType === "permanent" ||
    classification.errorType === "model_unavailable"
  );
}
