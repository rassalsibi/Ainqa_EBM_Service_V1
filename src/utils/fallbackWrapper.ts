/**
 * Enhanced Fallback Wrapper for AI SDK Operations
 * Provides intelligent fallback with proper retry patterns and conditional behavior
 */

import { classifyError } from "./errorClassification";

/**
 * Configuration for fallback behavior
 */
export interface FallbackConfig {
  /** Whether fallback is enabled - if false, throw error immediately on primary failure */
  enableFallback: boolean;
  /** Number of retries for primary provider (passed to AI SDK) */
  primaryMaxRetries: number;
  /** Number of retries for fallback provider (passed to AI SDK) */
  fallbackMaxRetries: number;
  /** Provider names for logging */
  primaryProvider: string;
  fallbackProvider: string;
}

/**
 * Enhanced fallback wrapper for AI SDK operations
 *
 * Retry Pattern:
 * 1. Primary provider with AI SDK retries (e.g., 2 attempts)
 * 2. If enabled and should fallback → Fallback provider with AI SDK retries (e.g., 2 attempts)
 * 3. If disabled or both fail → Throw original error
 *
 * Error Intelligence:
 * - Auth/Rate Limit errors: Skip retries, immediate fallback
 * - Transient errors: Let AI SDK handle retries first
 * - Permanent errors: Immediate fallback without retries
 *
 * @param primaryOperation Function that returns promise with AI SDK operation (with retries)
 * @param fallbackOperation Function that returns promise with AI SDK operation (with retries)
 * @param config Fallback configuration including enableFallback flag
 */
export async function withFallback<T>(
  primaryOperation: (maxRetries: number) => Promise<T>,
  fallbackOperation: (maxRetries: number) => Promise<T>,
  config: FallbackConfig,
): Promise<T> {
  const startTime = Date.now();

  try {
    console.debug(
      `Starting ${config.primaryProvider} operation with ${config.primaryMaxRetries} max retries`,
    );

    const result = await primaryOperation(config.primaryMaxRetries);

    console.debug(
      `${config.primaryProvider} operation succeeded in ${Date.now() - startTime}ms`,
    );

    return result;
  } catch (primaryError) {
    const classification = classifyError(primaryError);
    const elapsed = Date.now() - startTime;

    console.warn(
      `Primary provider ${config.primaryProvider} failed after ${elapsed}ms (${classification.errorType}): ${classification.description}`,
    );

    // Check if fallback is disabled
    if (!config.enableFallback) {
      console.error(
        `Fallback disabled for ${config.primaryProvider}, throwing original error`,
      );
      throw primaryError;
    }

    // Check if we should attempt fallback based on error classification
    if (!classification.shouldFallback) {
      console.error(
        `Error type ${classification.errorType} should not trigger fallback, throwing original error`,
      );
      throw primaryError;
    }

    console.info(
      `Attempting fallback to ${config.fallbackProvider} with ${config.fallbackMaxRetries} max retries`,
    );

    try {
      const fallbackStartTime = Date.now();
      const result = await fallbackOperation(config.fallbackMaxRetries);

      const fallbackElapsed = Date.now() - fallbackStartTime;
      const totalElapsed = Date.now() - startTime;

      console.info(
        `Fallback provider ${config.fallbackProvider} succeeded in ${fallbackElapsed}ms (total: ${totalElapsed}ms)`,
      );

      return result;
    } catch (fallbackError) {
      const fallbackClassification = classifyError(fallbackError);
      const totalElapsed = Date.now() - startTime;

      console.error(
        `Fallback provider ${config.fallbackProvider} also failed after ${totalElapsed}ms total (${fallbackClassification.errorType}): ${fallbackClassification.description}`,
      );

      // Return the original error from primary provider for better debugging
      throw primaryError;
    }
  }
}
