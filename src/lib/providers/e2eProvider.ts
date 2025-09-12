import {
  type CustomProvider,
  CustomProviderCreator,
} from "./customProviderCreator";

/**
 * E2E Networks provider configuration
 */
export interface E2ENetworksConfig {
  apiKey?: string;
  baseURL?: string;
  headers?: Record<string, string>;
}

/**
 * E2E Networks model definitions based on common Qwen models
 */
export const E2E_MODELS = {
  // Chat/Completion models
  chat: {
    "qwen-2.5-72b": "qwen2_5_72b_instruct",
  },
  // Embedding models - COMMENTED OUT: E2E Networks doesn't support embeddings yet
  // embedding: {
  // 	"bge-large": "BAAI/bge-large-en-v1.5",
  // },
} as const;

/**
 * Default E2E Networks configuration
 */
const DEFAULT_E2E_CONFIG = {
  name: "e2e-networks",
  baseURL:
    process.env.E2E_NETWORKS_BASE_URL ||
    "https://infer.e2enetworks.net/project/p-4979/genai",
  apiKeyEnvVar: "E2E_NETWORKS_API_KEY",
  defaultModels: {
    chat: E2E_MODELS.chat["qwen-2.5-72b"], // Default to most capable model
    completion: E2E_MODELS.chat["qwen-2.5-72b"],
    // embedding: E2E_MODELS.embedding["bge-large"], // COMMENTED OUT: E2E doesn't support embeddings yet
  },
};

/**
 * Creates an E2E Networks provider instance using CustomProviderCreator
 *
 * @example
 * ```typescript
 * // Using default configuration
 * const e2e = createE2EProvider();
 *
 * // With custom configuration
 * const e2e = createE2EProvider({
 *   apiKey: 'your-api-key',
 *   baseURL: 'https://custom.e2e.endpoint/v1',
 * });
 *
 * // Usage
 * const model = e2e.chatModel('qwen-72b');
 * // Note: E2E doesn't support embeddings - use OpenAI or other providers instead
 * ```
 */
export function createE2EProvider(
  config: E2ENetworksConfig = {},
): CustomProvider {
  const creator = new CustomProviderCreator();

  return creator.createProvider({
    ...DEFAULT_E2E_CONFIG,
    apiKey: config.apiKey,
    baseURL: config.baseURL || DEFAULT_E2E_CONFIG.baseURL,
    urlPattern: "model-in-path", // E2E Networks uses model-in-path pattern
    headers: {
      "User-Agent": "EBM-Diagnosis-Service/1.0",
      ...config.headers,
    },
  });
}

/**
 * Default E2E Networks provider instance
 * Ready to use with environment variables
 */
export const e2eProvider = createE2EProvider();

/**
 * Type-safe model access helpers
 */
export const E2E = {
  /**
   * Create chat model with type-safe model IDs
   */
  chat: (modelId: keyof typeof E2E_MODELS.chat) =>
    e2eProvider.chatModel(E2E_MODELS.chat[modelId]),

  /**
   * Create embedding model with type-safe model IDs
   * COMMENTED OUT: E2E Networks doesn't support embeddings yet
   */
  // embedding: (modelId: keyof typeof E2E_MODELS.embedding) =>
  // 	e2eProvider.textEmbeddingModel(E2E_MODELS.embedding[modelId]),

  /**
   * Direct provider access for custom model IDs
   */
  provider: e2eProvider,
};
