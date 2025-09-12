import type { Driver } from "neo4j-driver";

// Connection status types
export interface Neo4jHealthStatus {
  status: "healthy" | "unhealthy" | "degraded";
  connection: string;
  database?: string;
  lastConnected?: Date;
  error?: string;
}

// Query execution types
export interface QueryParams {
  [key: string]: any;
}

export interface QueryOptions {
  database?: string;
  timeout?: number;
  retries?: number;
}

// Result transformation types
export interface QueryResultData<T = any> {
  records: T[];
  summary: {
    query: {
      text: string;
      parameters: QueryParams;
    };
    queryType: string;
    counters: any;
    resultAvailableAfter: number;
    resultConsumedAfter: number;
  };
}

// Node and relationship types (based on knowledge map structure)
export interface GraphNode {
  id: string;
  type: "Diagnosis" | "Symptom" | "Investigation" | "Observation";
  code_set?: string;
  code?: string;
  name: string;
  condition?: string;
  reference?: string;
  text?: string;
}

export interface GraphEdge {
  id: string;
  source_node: string;
  destination_node: string;
  edge_name:
    | "may indicate"
    | "prompts"
    | "reveals"
    | "confirms"
    | "used to diagnose"
    | "subtype";
  reference?: string;
  text?: string;
  confidence?: number;
}

// Vector/embedding types
export interface VectorIndex {
  name: string;
  dimension: number;
  similarity_function: "cosine" | "euclidean" | "dot";
}

// Error types
export interface Neo4jError {
  code: string;
  message: string;
  classification: string;
}

// Service types
export interface Neo4j {
  driver: Driver | null;
  isConnected: boolean;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  healthCheck(): Promise<Neo4jHealthStatus>;
  executeQuery<T = any>(
    cypher: string,
    parameters?: QueryParams,
    options?: QueryOptions,
  ): Promise<QueryResultData<T>>;
  executeTransaction<T = any>(
    queries: Array<{ cypher: string; parameters?: QueryParams }>,
    options?: QueryOptions,
  ): Promise<T>;
}
