import neo4jDriver, {
  auth,
  type Driver,
  type QueryResult,
  type Session,
} from "neo4j-driver";
import {
  createDriverConfig,
  createNeo4jConfig,
} from "@/config/database.config";
import type {
  Neo4j as INeo4j,
  Neo4jHealthStatus,
  QueryOptions,
  QueryParams,
  QueryResultData,
} from "@/types/neo4j";

export class Neo4j implements INeo4j {
  public driver: Driver | null = null;
  public isConnected = false;
  private config = createNeo4jConfig();
  private connectionAttempts = 0;
  private maxRetries = 3;

  constructor() {
    // Bind methods to preserve context
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.healthCheck = this.healthCheck.bind(this);
    this.executeQuery = this.executeQuery.bind(this);
    this.executeTransaction = this.executeTransaction.bind(this);
  }

  /**
   * Initialize Neo4j driver connection with retry logic
   */
  async connect(): Promise<void> {
    if (this.isConnected && this.driver) {
      return;
    }

    try {
      const driverConfig = createDriverConfig(this.config);

      this.driver = neo4jDriver.driver(
        this.config.url,
        auth.basic(this.config.username, this.config.password),
        driverConfig,
      );

      // Test the connection using recommended approach
      await this.driver.getServerInfo();

      this.isConnected = true;
      this.connectionAttempts = 0;

      console.log("Neo4j driver connected successfully");
      console.log(`Connected to: ${this.config.url}`);
      console.log(`Default database: ${this.config.database}`);
    } catch (error) {
      this.connectionAttempts++;
      console.error(
        `Neo4j connection failed (attempt ${this.connectionAttempts}):`,
        error,
      );

      if (this.connectionAttempts >= this.maxRetries) {
        throw new Error(
          `Failed to connect to Neo4j after ${this.maxRetries} attempts: ${(error as Error).message}`,
        );
      }

      // Exponential backoff retry
      const delay = 2 ** this.connectionAttempts * 1000;
      console.log(`Retrying connection in ${delay}ms...`);

      await new Promise((resolve) => setTimeout(resolve, delay));
      return this.connect();
    }
  }

  /**
   * Close Neo4j driver connection gracefully
   */
  async disconnect(): Promise<void> {
    if (this.driver) {
      try {
        await this.driver.close();
        this.driver = null;
        this.isConnected = false;
        console.log("Neo4j driver disconnected");
      } catch (error) {
        console.error("Error during Neo4j disconnect:", error);
        throw error;
      }
    }
  }

  /**
   * Perform health check on Neo4j connection
   */
  async healthCheck(): Promise<Neo4jHealthStatus> {
    try {
      // executeQuery will auto-connect if needed
      await this.executeQuery(
        "CALL dbms.components() YIELD name, versions, edition RETURN name, versions[0] as version, edition",
      );

      return {
        status: "healthy",
        connection: "connected",
        database: this.config.database,
        lastConnected: new Date(),
      };
    } catch (error) {
      console.error("Neo4j health check failed:", error);

      return {
        status: "unhealthy",
        connection: "failed",
        error: `Health check failed: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Execute a Cypher query with parameters
   */
  async executeQuery<T = any>(
    cypher: string,
    parameters: QueryParams = {},
    options: QueryOptions = {},
  ): Promise<QueryResultData<T>> {
    // Smart auto-connect pattern
    if (!this.driver || !this.isConnected) {
      await this.connect();
    }

    let session: Session | null = null;
    const maxRetries = options.retries || 2;
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        if (!this.driver) {
          throw new Error("Driver not connected");
        }

        session = this.driver.session({
          database: options.database || this.config.database,
          defaultAccessMode: neo4jDriver.session.READ,
        });

        const result: QueryResult = await session.run(cypher, parameters);

        // Transform Neo4j result to our format
        const queryResult: QueryResultData<T> = {
          records: result.records.map((record) => record.toObject() as T),
          summary: {
            query: {
              text: result.summary.query.text,
              parameters: result.summary.query.parameters || {},
            },
            queryType: result.summary.queryType,
            counters: result.summary.counters,
            resultAvailableAfter:
              result.summary.resultAvailableAfter.toNumber(),
            resultConsumedAfter: result.summary.resultConsumedAfter.toNumber(),
          },
        };

        return queryResult;
      } catch (error) {
        attempt++;
        console.error(`Query execution failed (attempt ${attempt}):`, error);

        if (attempt > maxRetries) {
          throw new Error(
            `Query failed after ${maxRetries + 1} attempts: ${(error as Error).message}`,
          );
        }

        // Short delay before retry
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      } finally {
        if (session) {
          await session.close();
        }
      }
    }

    throw new Error("Query execution failed - this should not be reached");
  }

  /**
   * Execute multiple queries in a transaction
   */
  async executeTransaction<T = any>(
    queries: Array<{ cypher: string; parameters?: QueryParams }>,
    options: QueryOptions = {},
  ): Promise<T> {
    // Smart auto-connect pattern
    if (!this.driver || !this.isConnected) {
      await this.connect();
    }

    if (!this.driver) {
      throw new Error("Driver not connected");
    }

    const session = this.driver.session({
      database: options.database || this.config.database,
      defaultAccessMode: neo4jDriver.session.WRITE,
    });

    try {
      const result = await session.executeWrite(async (tx) => {
        const results = [];

        for (const query of queries) {
          const queryResult = await tx.run(
            query.cypher,
            query.parameters || {},
          );
          results.push(queryResult.records.map((record) => record.toObject()));
        }

        return results;
      });

      return result as T;
    } catch (error) {
      console.error("Transaction failed:", error);
      throw new Error(`Transaction failed: ${(error as Error).message}`);
    } finally {
      if (session) {
        await session.close();
      }
    }
  }

  /**
   * Get driver statistics and connection info
   */
  getConnectionInfo() {
    if (!this.driver) {
      return null;
    }

    return {
      isConnected: this.isConnected,
      url: this.config.url,
      database: this.config.database,
      encrypted: this.config.encrypted,
      maxPoolSize: this.config.maxConnectionPoolSize,
    };
  }
}

// Export singleton instance
export const neo4jClient = new Neo4j();
