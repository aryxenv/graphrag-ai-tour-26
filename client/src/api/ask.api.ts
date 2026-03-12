import { API_BASE } from "../constants";
import type { GeneratedQuestion, QueryResult } from "../types";

/** Query the pre-built graph with GraphRAG (local/global search). */
export async function queryGraphRAG(question: string): Promise<QueryResult> {
  // TODO: POST ${API_BASE}/query/graphrag { question }
  console.log("[api] queryGraphRAG placeholder:", question);
  return {
    answer:
      "GraphRAG answer placeholder — will be replaced by actual GraphRAG local/global search response.",
    citations: ["Entities (12, 34)", "Reports (2)"],
  };
}

/** Query the same corpus with plain vector-search RAG for comparison. */
export async function queryVanillaRAG(question: string): Promise<QueryResult> {
  // TODO: POST ${API_BASE}/query/vanilla { question }
  console.log("[api] queryVanillaRAG placeholder:", question);
  return {
    answer:
      "Vanilla RAG answer placeholder — will be replaced by basic vector search response.",
  };
}

/** Fetch AI-generated questions from the backend (random global/local mode). */
export async function fetchAskQuestions(): Promise<{
  questions: GeneratedQuestion[];
  mode: "global" | "local";
}> {
  const mode = Math.random() < 0.5 ? "global" : "local";
  const res = await fetch(`${API_BASE}/questions/ask?mode=${mode}&count=3`);
  if (!res.ok) {
    throw new Error(`Failed to fetch questions: ${res.status}`);
  }
  const data: GeneratedQuestion[] = await res.json();
  return { questions: data, mode };
}
