import { API_BASE } from "../constants";
import type {
  DemoScenario,
  GeneratedQuestion,
  GraphData,
  Memo,
} from "../types";
import type { TokenUsage } from "./ask.api";

export interface BuildEvalScores {
  relevance: number;
  coherence: number;
  groundedness: number;
  similarity: number;
  retrieval: number;
}

/** Generate interconnected memos for a scenario via Azure OpenAI. */
export async function generateMemos(
  scenario: DemoScenario,
  count: number,
): Promise<{ session_id: string; memos: Memo[] }> {
  const res = await fetch(`${API_BASE}/build/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenario, count }),
  });
  if (!res.ok) throw new Error(`Memo generation failed: ${res.status}`);
  return res.json();
}

/** Index memos with GraphRAG. Returns SSE stream with progress + final graph. */
export function indexBuildMemos(
  sessionId: string,
  onProgress: (msg: {
    workflow: string;
    status: string;
    completed: number;
    total: number;
  }) => void,
  onGraph: (graph: GraphData) => void,
  onDone: () => void,
  onError: (err: Error) => void,
): AbortController {
  const controller = new AbortController();

  fetch(`${API_BASE}/build/index`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId }),
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok) throw new Error(`Indexing failed: ${res.status}`);
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const event of events) {
          const lines = event.split("\n");
          let eventType = "message";
          const dataLines: string[] = [];

          for (const line of lines) {
            if (line.startsWith("event: ")) eventType = line.slice(7).trim();
            else if (line.startsWith("data: ")) dataLines.push(line.slice(6));
          }

          if (dataLines.length === 0) continue;
          const data = dataLines.join("\n");
          if (data === "[DONE]") return;

          if (eventType === "graph") {
            onGraph(JSON.parse(data));
          } else {
            try {
              onProgress(JSON.parse(data));
            } catch {
              // non-JSON progress
            }
          }
        }
      }
    })
    .then(onDone)
    .catch((err) => {
      if (err.name !== "AbortError") onError(err);
    });

  return controller;
}

/** Fetch the indexed graph data for a build session. */
export async function fetchBuildGraph(sessionId: string): Promise<GraphData> {
  const res = await fetch(`${API_BASE}/build/graph/${sessionId}`);
  if (!res.ok) throw new Error(`Failed to fetch build graph: ${res.status}`);
  return res.json();
}

/** Generate curated questions from the build graph. */
export async function generateBuildQuestions(
  sessionId: string,
): Promise<GeneratedQuestion[]> {
  const res = await fetch(`${API_BASE}/build/questions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId }),
  });
  if (!res.ok) throw new Error(`Question generation failed: ${res.status}`);
  return res.json();
}

/** Stream a query against the build graph. Returns AbortController to cancel. */
export function streamBuildQuery(
  sessionId: string,
  query: string,
  onChunk: (chunk: string) => void,
  onDone: () => void,
  onError: (err: Error) => void,
  onEngine?: (engine: string) => void,
  onUsage?: (usage: TokenUsage) => void,
): AbortController {
  const controller = new AbortController();

  fetch(`${API_BASE}/build/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, query }),
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok) throw new Error(`Build query failed: ${res.status}`);
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const event of events) {
          const lines = event.split("\n");
          let eventType = "message";
          const dataLines: string[] = [];

          for (const line of lines) {
            if (line.startsWith("event: ")) eventType = line.slice(7).trim();
            else if (line.startsWith("data: ")) dataLines.push(line.slice(6));
          }

          if (dataLines.length === 0) continue;
          const data = dataLines.join("\n");
          if (data === "[DONE]") return;

          if (eventType === "engine" && onEngine) {
            onEngine(data);
          } else if (eventType === "usage" && onUsage) {
            const [input, output] = data.split(":").map(Number);
            onUsage({ inputTokens: input, outputTokens: output });
          } else {
            onChunk(data);
          }
        }
      }
    })
    .then(onDone)
    .catch((err) => {
      if (err.name !== "AbortError") onError(err);
    });

  return controller;
}

/** Evaluate a build query response (all 5 metrics). */
export async function evaluateBuild(
  sessionId: string,
  query: string,
  response: string,
): Promise<BuildEvalScores> {
  const res = await fetch(`${API_BASE}/build/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, query, response }),
  });
  if (!res.ok) throw new Error(`Build evaluation failed: ${res.status}`);
  return res.json();
}

/** Reset/cleanup a build session. */
export async function resetBuild(sessionId: string): Promise<void> {
  await fetch(`${API_BASE}/build/reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId }),
  });
}
