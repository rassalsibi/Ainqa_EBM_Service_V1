import dotenv from "dotenv";
import { Hono } from "hono";
import {
  handleDevConfig,
  handleDevTestE2ELLM,
  handleDevTestFallback,
  handleDevTestGoogleLLM,
  handleDevTestLLM,
  handleDevTestNeo4j,
  handleDevTestOpenAIEmbedding,
  handleDevTestProviders,
  handleDevTestQuery,
} from "@/handlers/dev";

dotenv.config();

const dev = new Hono();

console.log(process.env.NODE_ENV);

// Development helper endpoints - only available in development mode
if (process.env.NODE_ENV === "development") {
  // Individual component tests
  dev.get("/test/neo4j", handleDevTestNeo4j);
  dev.get("/test/e2e-llm", handleDevTestE2ELLM);
  dev.get("/test/openai-embedding", handleDevTestOpenAIEmbedding);
  dev.get("/test/google-llm", handleDevTestGoogleLLM);
  dev.get("/test/providers", handleDevTestProviders);

  // Enhanced fallback architecture test
  dev.get("/test/fallback", handleDevTestFallback);

  // Interactive testing endpoints
  dev.post("/test/query", handleDevTestQuery);
  dev.post("/test/llm", handleDevTestLLM);

  // Configuration inspection
  dev.get("/config", handleDevConfig);

  // Dev mode info endpoint
  dev.get("/", (c) => {
    return c.json({
      service: "EBM Diagnosis Service - Development APIs",
      mode: "development",
    });
  });
} else {
  // In production, return 404 for all dev endpoints
  dev.all("*", (c) => {
    return c.json(
      {
        error: "Development APIs are not available in production mode",
      },
      404,
    );
  });
}

export default dev;
