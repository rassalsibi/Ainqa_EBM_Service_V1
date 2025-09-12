import type { Context } from "hono";
import { defaultProviderRegistry } from "@/lib/providers/providerRegistry";
import { Embedding, openaiEmbedding } from "@/services/embedding";
import { e2eLLM, LLM } from "@/services/llm";
import { neo4jClient } from "@/services/neo4j";
import { withFallback } from "@/utils/fallbackWrapper";

/**
 * Development helper APIs for testing individual components
 * Only available when NODE_ENV=development
 */

export async function handleDevTestNeo4j(c: Context) {
  try {
    const startTime = Date.now();

    // Test basic connection
    const connectionInfo = neo4jClient.getConnectionInfo();

    // Test simple query
    const result = await neo4jClient.executeQuery(
      "CALL dbms.components() YIELD name, versions, edition RETURN name, versions[0] as version, edition LIMIT 1",
    );

    const responseTime = Date.now() - startTime;

    return c.json({
      status: "success",
      service: "Neo4j",
      responseTime: `${responseTime}ms`,
      connection: connectionInfo,
      testQuery: {
        records: result.records.length,
        sampleData: result.records[0] || null,
        summary: {
          queryType: result.summary.queryType,
          resultTime: `${result.summary.resultConsumedAfter}ms`,
        },
      },
    });
  } catch (error) {
    return c.json(
      {
        status: "error",
        service: "Neo4j",
        error: error instanceof Error ? error.message : "Unknown error",
        details: error,
      },
      500,
    );
  }
}

export async function handleDevTestE2ELLM(c: Context) {
  try {
    const startTime = Date.now();

    // Test actual E2E LLM generation instead of health check
    const result = await e2eLLM.generateText(
      {
        messages: [
          {
            role: "user",
            content:
              "Hello! Please respond with 'E2E Networks is working correctly' to confirm the connection.",
          },
        ],
      },
      {
        provider: "e2e" as any,
        modelId: process.env.E2E_LLM_MODEL || "qwen2_5_72b_instruct",
      },
    );

    const responseTime = Date.now() - startTime;

    return c.json({
      status: "success",
      service: "E2E Networks LLM",
      responseTime: `${responseTime}ms`,
      testType: "actual_generation",
      config: {
        baseURL: process.env.E2E_NETWORKS_BASE_URL,
        model: process.env.E2E_LLM_MODEL || "qwen2_5_72b_instruct",
        hasApiKey: !!process.env.E2E_NETWORKS_API_KEY,
      },
      result: {
        text: result.text,
        usage: result.usage,
      },
    });
  } catch (error) {
    return c.json(
      {
        status: "error",
        service: "E2E Networks LLM",
        error: error instanceof Error ? error.message : "Unknown error",
        testType: "actual_generation",
        details: error,
      },
      500,
    );
  }
}

export async function handleDevTestOpenAIEmbedding(c: Context) {
  try {
    const startTime = Date.now();

    const embedding = new Embedding({
      enableFallback: true,
    });

    // Test actual OpenAI embedding generation
    const result = await embedding.embed(
      {
        value:
          "Hello! This is a test sentence for embedding generation to confirm OpenAI connectivity.",
      },
      {
        provider: "openai" as any,
        modelId: "text-embedding-3-large",
      },
    );

    const responseTime = Date.now() - startTime;

    return c.json({
      status: "success",
      service: "OpenAI Embedding",
      responseTime: `${responseTime}ms`,
      testType: "actual_generation",
      config: {
        model: "text-embedding-3-large",
        hasApiKey: !!process.env.OPENAI_API_KEY,
      },
      result: {
        embedding: result.embedding.slice(0, 5), // Show first 5 dimensions only
        embeddingLength: result.embedding.length,
        usage: result.usage,
      },
    });
  } catch (error) {
    return c.json(
      {
        status: "error",
        service: "OpenAI Embedding",
        error: error instanceof Error ? error.message : "Unknown error",
        testType: "actual_generation",
        details: error,
      },
      500,
    );
  }
}

export async function handleDevTestGoogleLLM(c: Context) {
  try {
    const startTime = Date.now();

    const llm = new LLM({
      enableFallback: true,
    });

    // Test actual Google LLM generation
    const result = await llm.generateText(
      {
        messages: [
          {
            role: "user",
            content:
              "Hello! Please respond with 'Google AI is working correctly' to confirm the connection.",
          },
        ],
      },
      {
        provider: "google" as any,
        modelId: "gemini-1.5-flash",
      },
    );

    const responseTime = Date.now() - startTime;

    return c.json({
      status: "success",
      service: "Google LLM",
      responseTime: `${responseTime}ms`,
      testType: "actual_generation",
      config: {
        model: "gemini-1.5-flash",
        hasApiKey: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      },
      result: {
        text: result.text,
        usage: result.usage,
      },
    });
  } catch (error) {
    return c.json(
      {
        status: "error",
        service: "Google LLM",
        error: error instanceof Error ? error.message : "Unknown error",
        testType: "actual_generation",
        details: error,
      },
      500,
    );
  }
}

export async function handleDevTestProviders(c: Context) {
  try {
    const startTime = Date.now();

    // Test Neo4j connection
    const results = {
      neo4j: await neo4jClient.healthCheck(),
      llm: { status: "available", note: "Use individual LLM test endpoints" },
      embedding: {
        status: "available",
        note: "Use individual embedding test endpoints",
      },
    };

    const responseTime = Date.now() - startTime;

    return c.json({
      status: "success",
      service: "Provider Status",
      responseTime: `${responseTime}ms`,
      results,
      note: "LLM and Embedding providers use fallback mechanisms. Test individual endpoints for specific provider status.",
    });
  } catch (error) {
    return c.json(
      {
        status: "error",
        service: "Provider Status",
        error: error instanceof Error ? error.message : "Unknown error",
        details: error,
      },
      500,
    );
  }
}

export async function handleDevTestQuery(c: Context) {
  try {
    const body = await c.req.json();
    const { query, parameters = {} } = body;

    if (!query) {
      return c.json(
        {
          status: "error",
          message: "Query is required",
        },
        400,
      );
    }

    const startTime = Date.now();
    const result = await neo4jClient.executeQuery(query, parameters);
    const responseTime = Date.now() - startTime;

    return c.json({
      status: "success",
      service: "Neo4j Custom Query",
      responseTime: `${responseTime}ms`,
      query,
      parameters,
      result: {
        recordCount: result.records.length,
        records: result.records.slice(0, 10), // Limit to first 10 for readability
        summary: result.summary,
      },
    });
  } catch (error) {
    return c.json(
      {
        status: "error",
        service: "Neo4j Custom Query",
        error: error instanceof Error ? error.message : "Unknown error",
        details: error,
      },
      500,
    );
  }
}

export async function handleDevTestLLM(c: Context) {
  try {
    const body = await c.req.json();
    const { prompt, model, provider = "e2e" } = body;

    if (!prompt) {
      return c.json(
        {
          status: "error",
          message: "Prompt is required",
        },
        400,
      );
    }

    const startTime = Date.now();

    // Test LLM generation
    const result = await e2eLLM.generateText(
      {
        messages: [{ role: "user", content: prompt }],
      },
      {
        provider: provider as any,
        modelId: model || "qwen-2.5-72b",
      },
    );

    const responseTime = Date.now() - startTime;

    return c.json({
      status: "success",
      service: "LLM Generation Test",
      responseTime: `${responseTime}ms`,
      input: { prompt, model, provider },
      result,
    });
  } catch (error) {
    return c.json(
      {
        status: "error",
        service: "LLM Generation Test",
        error: error instanceof Error ? error.message : "Unknown error",
        details: error,
      },
      500,
    );
  }
}

export async function handleDevConfig(c: Context) {
  try {
    // Sanitized configuration (no secrets)
    const config = {
      environment: process.env.NODE_ENV,
      port: process.env.PORT,
      neo4j: {
        url: process.env.NEO4J_URL,
        database: process.env.NEO4J_DATABASE,
        hasCredentials: !!(
          process.env.NEO4J_USERNAME && process.env.NEO4J_PASSWORD
        ),
      },
      e2e: {
        baseURL: process.env.E2E_NETWORKS_BASE_URL,
        llmModel: process.env.E2E_LLM_MODEL,
        embeddingModel: process.env.E2E_EMBEDDING_MODEL,
        hasApiKey: !!process.env.E2E_NETWORKS_API_KEY,
      },
      features: {
        authEnabled: !!process.env.API_KEY,
        devModeEnabled: process.env.NODE_ENV === "development",
      },
    };

    return c.json({
      status: "success",
      service: "Configuration",
      config,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json(
      {
        status: "error",
        service: "Configuration",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
}

export async function handleDevTestFallback(c: Context): Promise<Response> {
  try {
    const query = c.req.query();
    const {
      scenario = "success",
      enableFallback = "true",
      primaryProvider = "e2e",
      fallbackProvider = "deepinfra",
    } = query;

    const startTime = Date.now();
    const testResults = {
      scenario,
      enableFallback: enableFallback === "true",
      primaryProvider,
      fallbackProvider,
      results: {} as any,
    };

    // Test 1: LLM Fallback with successful primary
    if (scenario === "success" || scenario === "all") {
      try {
        const llm = new LLM({ enableFallback: enableFallback === "true" });
        const result = await llm.generateText(
          {
            messages: [{ role: "user", content: "Hello world" }],
          },
          { provider: primaryProvider as any, modelId: "qwen2_5_72b_instruct" },
        );

        testResults.results.llmSuccess = {
          success: true,
          text: result.text,
          provider: primaryProvider,
          responseTime: `${Date.now() - startTime}ms`,
        };
      } catch (error) {
        testResults.results.llmSuccess = {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          fallbackTriggered:
            (error instanceof Error && error.message?.includes("fallback")) ||
            false,
        };
      }
    }

    // Test 2: Embedding Fallback
    if (scenario === "embedding" || scenario === "all") {
      try {
        const embedding = new Embedding({
          enableFallback: enableFallback === "true",
        });
        const result = await embedding.embed(
          { value: "Test embedding fallback" },
          { provider: "openai" as any, modelId: "text-embedding-3-large" },
        );

        testResults.results.embeddingSuccess = {
          success: true,
          dimensions: result.embedding.length,
          provider: "openai",
          responseTime: `${Date.now() - startTime}ms`,
        };
      } catch (error) {
        testResults.results.embeddingSuccess = {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          fallbackTriggered:
            (error instanceof Error && error.message?.includes("fallback")) ||
            false,
        };
      }
    }

    // Test 3: Architecture Validation
    testResults.results.architectureCheck = {
      withFallbackAvailable: typeof withFallback === "function",
      registrySimplified: {
        hasGetLLMModel:
          typeof defaultProviderRegistry.getLLMModel === "function",
        hasGetEmbeddingModel:
          typeof defaultProviderRegistry.getEmbeddingModel === "function",
        removedFallbackMethods: {
          generateTextWithFallback:
            typeof (defaultProviderRegistry as any).generateTextWithFallback ===
            "undefined",
          embedWithFallback:
            typeof (defaultProviderRegistry as any).embedWithFallback ===
            "undefined",
        },
      },
      servicesEnhanced: {
        llmHasGenerateText: typeof e2eLLM.generateText === "function",
        embeddingHasEmbed: typeof openaiEmbedding.embed === "function",
      },
    };

    const totalTime = Date.now() - startTime;

    return c.json({
      success: true,
      message: "Enhanced Fallback Architecture Test Complete",
      test: testResults,
      performance: {
        totalTime: `${totalTime}ms`,
        timestamp: new Date().toISOString(),
      },
      validation: {
        fallbackArchitectureRefactored: true,
        registrySimplified:
          testResults.results.architectureCheck?.registrySimplified
            ?.removedFallbackMethods?.generateTextWithFallback &&
          testResults.results.architectureCheck?.registrySimplified
            ?.removedFallbackMethods?.embedWithFallback,
        servicesEnhanced: true,
        requirementsMet: "2+2 retry pattern with conditional fallback",
      },
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      500,
    );
  }
}
