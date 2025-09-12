import {
  OpenAICompatibleChatLanguageModel,
  OpenAICompatibleCompletionLanguageModel,
  OpenAICompatibleEmbeddingModel,
} from "@ai-sdk/openai-compatible";
import type { EmbeddingModelV2, LanguageModelV2 } from "@ai-sdk/provider";
import {
  type FetchFunction,
  loadApiKey,
  withoutTrailingSlash,
} from "@ai-sdk/provider-utils";

/**
 * URL pattern types for different provider architectures
 */
export type UrlPattern =
  | "standard" // {baseURL}{path} - Standard OpenAI pattern
  | "model-in-path" // {baseURL}/{modelId}/v1{path} - E2E Networks pattern
  | "custom"; // Custom URL builder function

export interface CustomProviderConfig {
  name: string;
  baseURL: string;
  apiKey?: string;
  apiKeyEnvVar?: string;
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  fetch?: FetchFunction;
  urlPattern?: UrlPattern;
  customUrlBuilder?: (baseURL: string, modelId: string, path: string) => string;
  defaultModels?: {
    chat?: string;
    completion?: string;
    embedding?: string;
  };
}

export interface CustomChatSettings {
  maxOutputTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
}

export interface CustomCompletionSettings {
  maxOutputTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
  suffix?: string;
  echo?: boolean;
}

export interface CustomEmbeddingSettings {
  dimensions?: number;
  truncate?: "NONE" | "START" | "END";
  inputType?:
    | "search_document"
    | "search_query"
    | "classification"
    | "clustering";
}

export interface CustomProvider {
  (modelId: string, settings?: CustomChatSettings): LanguageModelV2;

  languageModel(
    modelId: string,
    settings?: CustomChatSettings,
  ): LanguageModelV2;

  imageModel(modelId: string): never;

  chatModel(modelId: string, settings?: CustomChatSettings): LanguageModelV2;

  completionModel(
    modelId: string,
    settings?: CustomCompletionSettings,
  ): LanguageModelV2;

  textEmbeddingModel(
    modelId: string,
    settings?: CustomEmbeddingSettings,
  ): EmbeddingModelV2<string>;
}

/**
 * CustomProviderCreator - Generic factory for building custom providers on top of OpenAI-compatible interface
 *
 * This class enables future extensibility for any OpenAI-compatible endpoint:
 * - E2E Networks
 * - Internal APIs
 * - Other custom providers
 *
 * @example
 * ```typescript
 * const creator = new CustomProviderCreator();
 *
 * const e2eProvider = creator.createProvider({
 *   name: 'e2e-networks',
 *   baseURL: 'https://api.e2enetworks.net/v1',
 *   apiKeyEnvVar: 'E2E_API_KEY',
 *   defaultModels: {
 *     chat: 'Qwen/Qwen2.5-72B-Instruct',
 *     embedding: 'BAAI/bge-large-en-v1.5'
 *   }
 * });
 * ```
 */
export class CustomProviderCreator {
  /**
   * Build URL based on provider's URL pattern
   */
  private buildUrl(
    config: CustomProviderConfig,
    baseURL: string,
    modelId: string,
    path: string,
  ): string {
    const urlPattern = config.urlPattern || "standard";

    switch (urlPattern) {
      case "model-in-path":
        // E2E Networks pattern: {baseURL}/{modelId}/v1{path}
        return `${baseURL}/${modelId}/v1${path}`;

      case "custom":
        if (!config.customUrlBuilder) {
          throw new Error(
            "customUrlBuilder is required when urlPattern is 'custom'",
          );
        }
        return config.customUrlBuilder(baseURL, modelId, path);

      case "standard":
      default: {
        // Standard OpenAI pattern: {baseURL}{path}
        const url = new URL(`${baseURL}${path}`);
        if (config.queryParams) {
          url.search = new URLSearchParams(config.queryParams).toString();
        }
        return url.toString();
      }
    }
  }

  /**
   * Creates a custom provider instance following AI SDK v5 patterns
   */
  createProvider(config: CustomProviderConfig): CustomProvider {
    if (!config.baseURL) {
      throw new Error("baseURL is required for custom provider configuration");
    }
    const baseURL = withoutTrailingSlash(config.baseURL) || config.baseURL;

    const getHeaders = () => ({
      Authorization: `Bearer ${loadApiKey({
        apiKey: config.apiKey,
        environmentVariableName:
          config.apiKeyEnvVar ||
          `${config.name.toUpperCase().replace("-", "_")}_API_KEY`,
        description: `${config.name} API key`,
      })}`,
      ...config.headers,
    });

    interface CommonModelConfig {
      provider: string;
      url: ({ path }: { path: string }) => string;
      headers: () => Record<string, string>;
      fetch?: FetchFunction;
    }

    const getModelSpecificConfig = (
      modelType: string,
      modelId: string,
    ): CommonModelConfig => ({
      provider: `${config.name}.${modelType}`,
      url: ({ path }) => this.buildUrl(config, baseURL, modelId, path),
      headers: getHeaders,
      fetch: config.fetch,
    });

    const createChatModel = (
      modelId: string,
      settings: CustomChatSettings = {},
    ) => {
      return new OpenAICompatibleChatLanguageModel(modelId, {
        ...settings,
        ...getModelSpecificConfig("chat", modelId),
      });
    };

    const createCompletionModel = (
      modelId: string,
      settings: CustomCompletionSettings = {},
    ) => {
      return new OpenAICompatibleCompletionLanguageModel(modelId, {
        ...settings,
        ...getModelSpecificConfig("completion", modelId),
      });
    };

    const createTextEmbeddingModel = (
      modelId: string,
      settings: CustomEmbeddingSettings = {},
    ) => {
      return new OpenAICompatibleEmbeddingModel(modelId, {
        ...settings,
        ...getModelSpecificConfig("embedding", modelId),
      });
    };

    // Main provider function
    const provider = (modelId: string, settings?: CustomChatSettings) =>
      createChatModel(modelId, settings);

    // Add methods to provider function
    provider.languageModel = createChatModel;
    provider.imageModel = (modelId: string): never => {
      throw new Error(
        `Image generation not supported by custom provider '${config.name}'. Model ID: ${modelId}`,
      );
    };
    provider.chatModel = createChatModel;
    provider.completionModel = createCompletionModel;
    provider.textEmbeddingModel = createTextEmbeddingModel;

    return provider as CustomProvider;
  }
}
