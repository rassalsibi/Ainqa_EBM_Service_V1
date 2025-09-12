import { generateObject, generateText, streamObject, streamText } from "ai";
import {
  DEFAULT_MODELS,
  defaultProviderRegistry,
  type ModelConfig,
  type ProviderConfigs,
  type ProviderRegistry,
} from "@/lib/providers/providerRegistry";
import { type FallbackConfig, withFallback } from "@/utils/fallbackWrapper";

export class LLMConfigurationError extends Error {
  constructor(
    message: string,
    public readonly provider?: string,
  ) {
    super(message);
    this.name = "LLMConfigurationError";
  }
}

export class LLMProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly response?: Response,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "LLMProviderError";
  }
}

export type GenerateTextOptions = Omit<
  Parameters<typeof generateText>[0],
  "model"
>;

export type StreamTextOptions = Omit<Parameters<typeof streamText>[0], "model">;

export type GenerateObjectOptions = Omit<
  Parameters<typeof generateObject>[0],
  "model"
>;

export type StreamObjectOptions = Omit<
  Parameters<typeof streamObject>[0],
  "model"
>;

export interface LLMConfig {
  providerConfigs?: ProviderConfigs;

  enableFallback?: boolean;

  registry?: ProviderRegistry;
}

/**
 * LLM - Manages text generation across multiple AI providers
 *
 * Features:
 * - Multi-provider support (E2E Networks, OpenAI, Anthropic, DeepInfra)
 * - Automatic fallback mechanisms
 * - Comprehensive error handling with provider context
 * - Health monitoring and provider switching
 * - AI SDK v5 compliance with latest syntax
 *
 * @example
 * ```typescript
 * const llm = new LLM({
 *   enableFallback: true
 * });
 *
 * // Generate text with E2E Networks (default)
 * const result = await llm.generateText({
 *   messages: [{ role: 'user', content: 'Hello!' }]
 * });
 *
 * // Generate text with specific provider
 * const anthropicResult = await llm.generateText({
 *   messages: [{ role: 'user', content: 'Hello!' }]
 * }, { provider: 'anthropic', modelId: 'claude-3-sonnet-20240229' });
 *
 * // Stream text with fallback support
 * const stream = await llm.streamText({
 *   messages: [{ role: 'user', content: 'Tell me a story' }],
 *   onChunk: (chunk) => console.log(chunk),
 *   onError: (error) => console.error('Stream error:', error)
 * });
 * ```
 */
export class LLM {
  private registry: ProviderRegistry;
  private readonly enableFallback: boolean;

  constructor(config: LLMConfig = {}) {
    this.registry = config.registry || defaultProviderRegistry;
    this.enableFallback = config.enableFallback ?? true;
  }

  /**
   * Generate text using the specified or default provider with fallback
   */
  async generateText(
    options: GenerateTextOptions,
    modelConfig: ModelConfig = DEFAULT_MODELS.llm.primary,
  ) {
    try {
      if (this.enableFallback) {
        const fallbackConfig: FallbackConfig = {
          enableFallback: true,
          primaryMaxRetries: 2,
          fallbackMaxRetries: 2,
          primaryProvider: modelConfig.provider,
          fallbackProvider: DEFAULT_MODELS.llm.fallback.provider,
        };

        return await withFallback(
          async (maxRetries: number) => {
            const model = this.registry.getLLMModel(modelConfig);
            return generateText({ model, maxRetries, ...options } as any);
          },
          async (maxRetries: number) => {
            const model = this.registry.getLLMModel(
              DEFAULT_MODELS.llm.fallback,
            );
            return generateText({ model, maxRetries, ...options } as any);
          },
          fallbackConfig,
        );
      } else {
        const model = this.registry.getLLMModel(modelConfig);
        return await generateText({
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
   * Stream text using the specified or default provider with fallback
   */
  async streamText(
    options: StreamTextOptions,
    modelConfig: ModelConfig = DEFAULT_MODELS.llm.primary,
  ) {
    try {
      if (this.enableFallback) {
        const fallbackConfig: FallbackConfig = {
          enableFallback: true,
          primaryMaxRetries: 2,
          fallbackMaxRetries: 2,
          primaryProvider: modelConfig.provider,
          fallbackProvider: DEFAULT_MODELS.llm.fallback.provider,
        };

        return await withFallback(
          async (maxRetries: number) => {
            const model = this.registry.getLLMModel(modelConfig);
            return streamText({ model, maxRetries, ...options } as any);
          },
          async (maxRetries: number) => {
            const model = this.registry.getLLMModel(
              DEFAULT_MODELS.llm.fallback,
            );
            return streamText({ model, maxRetries, ...options } as any);
          },
          fallbackConfig,
        );
      }

      const model = this.registry.getLLMModel(modelConfig);
      return streamText({ model, maxRetries: 2, ...options } as any);
    } catch (error) {
      if (options.onError) {
        options.onError({
          error:
            error instanceof Error
              ? error
              : new Error("Unknown streaming error"),
        });
      }
      throw await this.handleProviderError(error, modelConfig.provider);
    }
  }

  /**
   * Generate structured object using schema with fallback
   */
  async generateObject(
    options: GenerateObjectOptions,
    modelConfig: ModelConfig = DEFAULT_MODELS.llm.primary,
  ) {
    try {
      if (this.enableFallback) {
        const fallbackConfig: FallbackConfig = {
          enableFallback: true,
          primaryMaxRetries: 2,
          fallbackMaxRetries: 2,
          primaryProvider: modelConfig.provider,
          fallbackProvider: DEFAULT_MODELS.llm.fallback.provider,
        };

        return await withFallback(
          async (maxRetries: number) => {
            const model = this.registry.getLLMModel(modelConfig);
            return generateObject({ model, maxRetries, ...options } as any);
          },
          async (maxRetries: number) => {
            const model = this.registry.getLLMModel(
              DEFAULT_MODELS.llm.fallback,
            );
            return generateObject({ model, maxRetries, ...options } as any);
          },
          fallbackConfig,
        );
      }

      const model = this.registry.getLLMModel(modelConfig);
      return await generateObject({ model, maxRetries: 2, ...options } as any);
    } catch (error) {
      throw await this.handleProviderError(error, modelConfig.provider);
    }
  }

  /**
   * Stream structured object generation with fallback
   */
  async streamObject(
    options: StreamObjectOptions,
    modelConfig: ModelConfig = DEFAULT_MODELS.llm.primary,
  ) {
    try {
      if (this.enableFallback) {
        const fallbackConfig: FallbackConfig = {
          enableFallback: true,
          primaryMaxRetries: 2,
          fallbackMaxRetries: 2,
          primaryProvider: modelConfig.provider,
          fallbackProvider: DEFAULT_MODELS.llm.fallback.provider,
        };

        return await withFallback(
          async (maxRetries: number) => {
            const model = this.registry.getLLMModel(modelConfig);
            return streamObject({ model, maxRetries, ...options } as any);
          },
          async (maxRetries: number) => {
            const model = this.registry.getLLMModel(
              DEFAULT_MODELS.llm.fallback,
            );
            return streamObject({ model, maxRetries, ...options } as any);
          },
          fallbackConfig,
        );
      }

      const model = this.registry.getLLMModel(modelConfig);
      return streamObject({ model, maxRetries: 2, ...options } as any);
    } catch (error) {
      if (options.onError) {
        options.onError({
          error:
            error instanceof Error
              ? error
              : new Error("Unknown streaming error"),
        });
      }
      throw await this.handleProviderError(error, modelConfig.provider);
    }
  }

  /**
   * Get available providers and models
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
      error instanceof LLMConfigurationError ||
      error instanceof LLMProviderError
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

      throw new LLMProviderError(
        `Provider error (${provider}, status ${status}): ${message}`,
        provider,
        response,
        error,
      );
    } else if (error instanceof Error) {
      throw new LLMProviderError(
        `Provider error (${provider}): ${error.message}`,
        provider,
        undefined,
        error,
      );
    }

    throw new LLMProviderError(
      `Unknown provider error (${provider})`,
      provider,
      undefined,
      error,
    );
  }
}

/**
 * E2E LLM instance (uses DEFAULT_MODELS.llm.primary = E2E by default)
 */
export const e2eLLM = new LLM({
  enableFallback: true,
});
