import type { Config } from "neo4j-driver";

export interface Neo4jConfig {
  url: string;
  username: string;
  password: string;
  database?: string;
  maxConnectionPoolSize?: number;
  maxConnectionLifetime?: number;
  connectionAcquisitionTimeout?: number;
  encrypted?: boolean;
}

export function createNeo4jConfig(): Neo4jConfig {
  const config: Neo4jConfig = {
    url: process.env.NEO4J_URL || "bolt://164.52.211.42:7687",
    username: process.env.NEO4J_USERNAME || "neo4j",
    password: process.env.NEO4J_PASSWORD || "NeO4j@123",
    database: process.env.NEO4J_DATABASE || "neo4j",
    maxConnectionPoolSize: Number.parseInt(
      process.env.NEO4J_MAX_POOL_SIZE || "50",
      10,
    ),
    maxConnectionLifetime: Number.parseInt(
      process.env.NEO4J_MAX_CONNECTION_LIFETIME || "3600000",
      10,
    ), // 1 hour
    connectionAcquisitionTimeout: Number.parseInt(
      process.env.NEO4J_CONNECTION_TIMEOUT || "60000",
      10,
    ), // 1 minute
    encrypted: process.env.NEO4J_ENCRYPTED === "true",
  };

  return config;
}

export function createDriverConfig(config: Neo4jConfig): Config {
  return {
    maxConnectionPoolSize: config.maxConnectionPoolSize,
    maxConnectionLifetime: config.maxConnectionLifetime,
    connectionAcquisitionTimeout: config.connectionAcquisitionTimeout,
    encrypted: config.encrypted,
    trust: "TRUST_ALL_CERTIFICATES",
  };
}
