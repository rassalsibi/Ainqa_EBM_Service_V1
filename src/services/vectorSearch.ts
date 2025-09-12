import type { Driver } from "neo4j-driver";

export interface VectorSearchResult {
  id: string;
  label: string;
  score: number;
  reference: string;
  condition: string;
  embeddingText: string;
  text: string;
  type: string;
}

export async function searchByEmbedding(
  driver: Driver,
  label: "Symptom" | "Diagnosis" | "Investigation" | "Observation",
  embedding: number[],
  topN: number = 5,
): Promise<VectorSearchResult[]> {
  const session = driver.session();
  try {
    const query = `
      CALL db.index.vector.queryNodes($indexName, $topN, $embedding)
      YIELD node, score
      RETURN elementId(node) AS id, labels(node)[0] AS label, score, node.reference AS reference, node.condition AS condition, node.embeddingText AS embeddingText, node.text AS text, node.type AS type
    `;

    const indexName = label.toLowerCase() + "Embeddings";

    const result = await session.run(query, { indexName, topN, embedding });

    return result.records.map((r) => ({
      id: r.get("id"),
      label: r.get("label"),
      score: r.get("score"),
      reference: r.get("reference"),
      condition: r.get("condition"),
      embeddingText: r.get("embeddingText"),
      text: r.get("text"),
      type: r.get("type"),
    }));
  } finally {
    await session.close();
  }
}
