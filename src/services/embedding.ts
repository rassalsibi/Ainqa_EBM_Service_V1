import { cosineSimilarity, embed, embedMany } from "ai";
import {
  DEFAULT_MODELS,
  defaultProviderRegistry,
  type ModelConfig,
  type ProviderRegistry,
} from "@/lib/providers/providerRegistry";
import { type FallbackConfig, withFallback } from "@/utils/fallbackWrapper";

export class EmbeddingConfigurationError extends Error {
  constructor(
    message: string,
    public readonly provider?: string,
  ) {
    super(message);
    this.name = "EmbeddingConfigurationError";
  }
}

export class EmbeddingProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly response?: Response,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "EmbeddingProviderError";
  }
}

export type EmbedOptions = Omit<Parameters<typeof embed>[0], "model">;

export type EmbedManyOptions = Omit<Parameters<typeof embedMany>[0], "model">;

export interface EmbeddingConfig {
  enableFallback?: boolean;

  registry?: ProviderRegistry;
}

/**
 * Embedding - Manages embedding generation across multiple AI providers
 *
 * Features:
 * - Multi-provider support (OpenAI, Google, DeepInfra - E2E Networks not supported)
 * - Automatic fallback mechanisms
 * - Comprehensive error handling with provider context
 * - AI SDK v5 compliance with latest syntax
 * - Utility methods (cosine similarity, averaging)
 *
 * @example
 * ```typescript
 * const embedding = new Embedding({
 *   enableFallback: true
 * });
 *
 * // Generate single embedding with OpenAI (default)
 * const result = await embedding.embed({
 *   value: 'Patient presents with fever and headache'
 * });
 *
 * // Generate batch embeddings
 * const results = await embedding.embedMany({
 *   values: [
 *     'Fever and headache symptoms',
 *     'Chest pain and shortness of breath',
 *     'Abdominal pain and nausea'
 *   ]
 * });
 *
 * // Calculate similarity between embeddings
 * const similarity = embedding.cosineSimilarity(
 *   results.embeddings[0],
 *   results.embeddings[1]
 * );
 * ```
 */
export class Embedding {
  private registry: ProviderRegistry;
  private readonly enableFallback: boolean;

  constructor(config: EmbeddingConfig = {}) {
    this.registry = config.registry || defaultProviderRegistry;
    this.enableFallback = config.enableFallback ?? true;
  }

  /**
   * Generate embedding for a single value with fallback
   */
  async embed(
    options: EmbedOptions,
    modelConfig: ModelConfig = DEFAULT_MODELS.embedding.primary,
  ) {
    try {
      if (this.enableFallback) {
        const fallbackConfig: FallbackConfig = {
          enableFallback: true,
          primaryMaxRetries: 2,
          fallbackMaxRetries: 2,
          primaryProvider: modelConfig.provider,
          fallbackProvider: DEFAULT_MODELS.embedding.fallback.provider,
        };

        return await withFallback(
          async (maxRetries: number) => {
            const model = this.registry.getEmbeddingModel(modelConfig);
            return embed({ model, maxRetries, ...options } as any);
          },
          async (maxRetries: number) => {
            const model = this.registry.getEmbeddingModel(
              DEFAULT_MODELS.embedding.fallback,
            );
            return embed({ model, maxRetries, ...options } as any);
          },
          fallbackConfig,
        );
      } else {
        const model = this.registry.getEmbeddingModel(modelConfig);
        return await embed({
          model,
          maxRetries: 2,
          ...options,
        } as any);
      }
    } catch (error) {
      throw await this.handleProviderError(error, modelConfig.provider);
    }
  }

  /**
   * Generate embeddings for multiple values with fallback
   */
  async embedMany(
    options: EmbedManyOptions,
    modelConfig: ModelConfig = DEFAULT_MODELS.embedding.primary,
  ) {
    try {
      if (this.enableFallback) {
        const fallbackConfig: FallbackConfig = {
          enableFallback: true,
          primaryMaxRetries: 2,
          fallbackMaxRetries: 2,
          primaryProvider: modelConfig.provider,
          fallbackProvider: DEFAULT_MODELS.embedding.fallback.provider,
        };

        return await withFallback(
          async (maxRetries: number) => {
            const model = this.registry.getEmbeddingModel(modelConfig);
            return embedMany({ model, maxRetries, ...options } as any);
          },
          async (maxRetries: number) => {
            const model = this.registry.getEmbeddingModel(
              DEFAULT_MODELS.embedding.fallback,
            );
            return embedMany({ model, maxRetries, ...options } as any);
          },
          fallbackConfig,
        );
      }

      const model = this.registry.getEmbeddingModel(modelConfig);
      return await embedMany({
        model,
        maxRetries: 2,
        ...options,
      } as any);
    } catch (error) {
      throw await this.handleProviderError(error, modelConfig.provider);
    }
  }

  /**
   * Calculate cosine similarity between two embedding vectors
   * Utility method for comparing semantic similarity
   */
  cosineSimilarity(embedding1: number[], embedding2: number[]): number {
    return cosineSimilarity(embedding1, embedding2);
  }

  /**
   * Calculate average embedding from multiple embeddings
   * Useful for creating centroids or representative embeddings
   */
  averageEmbeddings(embeddings: number[][]): number[] {
    if (embeddings.length === 0 || !embeddings[0]) {
      throw new Error("Invalid input: Empty array or empty inner arrays");
    }

    const dimensions = embeddings[0].length;
    const averageEmbedding = new Array(dimensions).fill(0);

    // Sum all embeddings
    for (const embedding of embeddings) {
      if (embedding.length !== dimensions) {
        throw new Error("Invalid input: Inconsistent dimensions in embeddings");
      }

      for (let i = 0; i < dimensions; i++) {
        if (!Number.isNaN(embedding[i]!)) {
          averageEmbedding[i] += embedding[i]!;
        }
      }
    }

    // Calculate average
    for (let i = 0; i < dimensions; i++) {
      averageEmbedding[i] /= embeddings.length;
    }

    return averageEmbedding;
  }

  /**
   * Get available embedding providers and models
   */
  getAvailableProviders() {
    return this.registry.getAvailableProviders();
  }

  /**
   * Get default model configurations
   */
  getDefaultModels() {
    return this.registry.getDefaultModels();
  }

  /**
   * Handle provider errors with context
   */
  private async handleProviderError(
    error: unknown,
    provider: string,
  ): Promise<never> {
    if (
      error instanceof EmbeddingConfigurationError ||
      error instanceof EmbeddingProviderError
    ) {
      throw error;
    }

    if (
      error instanceof Error &&
      "response" in error &&
      error.response instanceof Response
    ) {
      const response = error.response;
      const status = response.status;
      let errorData: Record<string, unknown> = {};

      try {
        errorData = await response.json();
      } catch (_e) {
        // Ignore JSON parsing errors
      }

      const message =
        (errorData?.error as { message?: string })?.message ||
        (errorData?.message as string) ||
        error.message;

      throw new EmbeddingProviderError(
        `Provider error (${provider}, status ${status}): ${message}`,
        provider,
        response,
        error,
      );
    } else if (error instanceof Error) {
      throw new EmbeddingProviderError(
        `Provider error (${provider}): ${error.message}`,
        provider,
        undefined,
        error,
      );
    }

    throw new EmbeddingProviderError(
      `Unknown provider error (${provider})`,
      provider,
      undefined,
      error,
    );
  }
}

/**
 * OpenAI Embedding instance (uses DEFAULT_MODELS.embedding.primary = OpenAI by default)
 * Note: E2E Networks doesn't support embeddings yet
 */
export const openaiEmbedding = new Embedding({
  enableFallback: true,
});
