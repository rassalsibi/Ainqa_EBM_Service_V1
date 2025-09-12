import { createAnthropic } from "@ai-sdk/anthropic";
import { createDeepInfra } from "@ai-sdk/deepinfra";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createProviderRegistry } from "ai";
import type { CustomProvider } from "./customProviderCreator";
import {
  createE2EProvider,
  E2E_MODELS,
  type E2ENetworksConfig,
} from "./e2eProvider";

export type LLMProviderType =
  | "e2e"
  | "openai"
  | "anthropic"
  | "deepinfra"
  | "google";

export type EmbeddingProviderType = "e2e" | "openai" | "google" | "deepinfra";

export interface ProviderConfigs {
  e2e?: E2ENetworksConfig;
  openai?: {
    apiKey?: string;
    baseURL?: string;
    organization?: string;
  };
  anthropic?: {
    apiKey?: string;
    baseURL?: string;
  };
  deepinfra?: {
    apiKey?: string;
    baseURL?: string;
  };
  google?: {
    apiKey?: string;
    baseURL?: string;
  };
}

export interface ModelConfig {
  provider: LLMProviderType | EmbeddingProviderType;
  modelId: string;
  settings?: Record<string, unknown>;
}

export const DEFAULT_MODELS = {
  // LLM Models (E2E is default/primary)
  llm: {
    primary: {
      provider: "google" as const,
      modelId: "gemini-2.5-flash",
    },
    fallback: {
      provider: "deepinfra" as const,
      modelId: "meta-llama/Meta-Llama-3.1-70B-Instruct",
    },
  },
  /* llm: {
    primary: {
      provider: "e2e" as const,
      modelId: E2E_MODELS.chat["qwen-2.5-72b"],
    },
    fallback: {
      provider: "deepinfra" as const,
      modelId: "meta-llama/Meta-Llama-3.1-70B-Instruct",
    },
  }, */
  // Embedding Models - Using OpenAI as primary since E2E doesn't support embeddings yet
  embedding: {
    primary: {
      provider: "openai" as const,
      modelId: "text-embedding-3-large",
    },
    fallback: {
      provider: "google" as const,
      modelId: "text-embedding-004",
    },
  },
} as const;

/**
 * Provider Registry - Manages both custom (E2E) and standard AI SDK v5 providers
 *
 * Architecture:
 * - E2E Networks: Custom provider via CustomProviderCreator (DEFAULT)
 * - OpenAI, Anthropic, DeepInfra: Standard AI SDK v5 providers
 * - Google: For embeddings primarily
 *
 * @example
 * ```typescript
 * const registry = new ProviderRegistry();
 *
 * // Get primary LLM (E2E Networks by default)
 * const llm = registry.getLLMModel();
 *
 * // Get specific provider
 * const anthropic = registry.getLLMModel({ provider: 'anthropic', modelId: 'claude-3-sonnet-20240229' });
 *
 * // Get embeddings (OpenAI by default)
 * const embeddings = registry.getEmbeddingModel();
 *
 * ```
 */
export class ProviderRegistry {
  private llmRegistry: ReturnType<typeof createProviderRegistry>;
  private e2eProvider: CustomProvider;

  constructor(configs: ProviderConfigs = {}) {
    this.e2eProvider = createE2EProvider(configs.e2e);

    // Create unified provider registry following AI SDK v5 patterns
    this.llmRegistry = createProviderRegistry({
      // E2E Networks (Custom Provider - DEFAULT)
      e2e: this.e2eProvider,

      // Standard AI SDK v5 Providers
      openai: createOpenAI({
        apiKey: configs.openai?.apiKey || process.env.OPENAI_API_KEY,
        baseURL: configs.openai?.baseURL,
        organization: configs.openai?.organization,
      }),

      anthropic: createAnthropic({
        apiKey: configs.anthropic?.apiKey || process.env.ANTHROPIC_API_KEY,
        baseURL: configs.anthropic?.baseURL,
      }),

      deepinfra: createDeepInfra({
        apiKey: configs.deepinfra?.apiKey || process.env.DEEPINFRA_API_KEY,
        baseURL: configs.deepinfra?.baseURL,
      }),

      google: createGoogleGenerativeAI({
        apiKey:
          configs.google?.apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
        baseURL: configs.google?.baseURL,
      }),
    });
  }

  /**
   * Get LLM model instance
   */
  getLLMModel(config: ModelConfig = DEFAULT_MODELS.llm.primary) {
    return this.llmRegistry.languageModel(
      `${config.provider}:${config.modelId}`,
    );
  }

  /**
   * Get embedding model instance
   */
  getEmbeddingModel(config: ModelConfig = DEFAULT_MODELS.embedding.primary) {
    switch (config.provider) {
      case "e2e":
        throw new Error(
          "E2E Networks doesn't support embedding models yet. Use OpenAI, Google, or DeepInfra instead.",
        );
      case "openai":
        return this.llmRegistry.textEmbeddingModel(`openai:${config.modelId}`);
      case "google":
        return this.llmRegistry.textEmbeddingModel(`google:${config.modelId}`);
      case "deepinfra":
        return this.llmRegistry.textEmbeddingModel(
          `deepinfra:${config.modelId}`,
        );
      default:
        throw new Error(`Unknown embedding provider: ${config.provider}`);
    }
  }

  /**
   * Get available providers
   */
  getAvailableProviders() {
    return {
      llm: [
        "e2e",
        "openai",
        "anthropic",
        "deepinfra",
        "google",
      ] as LLMProviderType[],
      embedding: ["openai", "google", "deepinfra"] as EmbeddingProviderType[],
    };
  }

  /**
   * Get default models configuration
   */
  getDefaultModels() {
    return DEFAULT_MODELS;
  }
}

/**
 * Default provider registry instance
 * Uses environment variables for configuration
 */
export const defaultProviderRegistry = new ProviderRegistry();
