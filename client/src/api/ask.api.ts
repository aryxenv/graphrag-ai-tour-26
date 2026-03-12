import { API_BASE } from "../constants";
import type { GeneratedQuestion } from "../types";

export type StreamCallback = (chunk: string) => void;

/** Parse an SSE stream and invoke onChunk for each data payload. */
async function consumeSSE(
  response: Response,
  onChunk: StreamCallback,
  onEngine?: (engine: string) => void,
) {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE events are separated by blank lines (\n\n)
    const events = buffer.split("\n\n");
    // Last piece may be incomplete — keep it in buffer
    buffer = events.pop() ?? "";

    for (const event of events) {
      const lines = event.split("\n");
      let eventType = "message";
      const dataLines: string[] = [];

      for (const line of lines) {
        if (line.startsWith("event: ")) {
          eventType = line.slice(7).trim();
        } else if (line.startsWith("data: ")) {
          dataLines.push(line.slice(6));
        }
      }

      if (dataLines.length === 0) continue;

      // Multiple data: lines in one event are joined with newlines per SSE spec
      const data = dataLines.join("\n");
      if (data === "[DONE]") return;

      if (eventType === "engine" && onEngine) {
        onEngine(data);
      } else {
        onChunk(data);
      }
    }
  }
}

/** Stream a RAG query. Returns an AbortController to cancel. */
export function streamRAGQuery(
  query: string,
  onChunk: StreamCallback,
  onDone: () => void,
  onError: (err: Error) => void,
): AbortController {
  const controller = new AbortController();

  fetch(`${API_BASE}/query/rag`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
    signal: controller.signal,
  })
    .then((res) => {
      if (!res.ok) throw new Error(`RAG query failed: ${res.status}`);
      return consumeSSE(res, onChunk);
    })
    .then(onDone)
    .catch((err) => {
      if (err.name !== "AbortError") onError(err);
    });

  return controller;
}

/** Stream a GraphRAG query. Returns an AbortController to cancel. */
export function streamGraphRAGQuery(
  query: string,
  onChunk: StreamCallback,
  onDone: () => void,
  onError: (err: Error) => void,
  onEngine?: (engine: string) => void,
): AbortController {
  const controller = new AbortController();

  fetch(`${API_BASE}/query/graphrag`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, community_level: 2 }),
    signal: controller.signal,
  })
    .then((res) => {
      if (!res.ok) throw new Error(`GraphRAG query failed: ${res.status}`);
      return consumeSSE(res, onChunk, onEngine);
    })
    .then(onDone)
    .catch((err) => {
      if (err.name !== "AbortError") onError(err);
    });

  return controller;
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
