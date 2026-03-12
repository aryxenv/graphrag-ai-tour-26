import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import type { EvalScores } from "../api";
import {
  evaluateSingle,
  fetchAskQuestions,
  streamGraphRAGQuery,
  streamRAGQuery,
} from "../api";

export function useAskQuestions() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["askQuestions"],
    queryFn: fetchAskQuestions,
    refetchOnWindowFocus: false,
  });

  const refresh = () =>
    queryClient.refetchQueries({ queryKey: ["askQuestions"] });

  return { ...query, refresh };
}

export interface StreamState {
  text: string;
  isStreaming: boolean;
  error: string | null;
  engine?: string;
  ttft: number | null;
  tokens: number;
}

const INITIAL_STREAM: StreamState = {
  text: "",
  isStreaming: false,
  error: null,
  ttft: null,
  tokens: 0,
};

/** Rough token estimate: ~4 characters per token for English text. */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function useStreamingQuery() {
  const [rag, setRag] = useState<StreamState>(INITIAL_STREAM);
  const [graphRag, setGraphRag] = useState<StreamState>(INITIAL_STREAM);
  const ragAbort = useRef<AbortController | null>(null);
  const graphRagAbort = useRef<AbortController | null>(null);
  const ragFirstChunk = useRef(false);
  const graphRagFirstChunk = useRef(false);
  const ragTtft = useRef<number | null>(null);
  const graphRagTtft = useRef<number | null>(null);
  const startTimeRef = useRef(0);

  const send = useCallback((query: string) => {
    // Cancel any in-flight requests
    ragAbort.current?.abort();
    graphRagAbort.current?.abort();

    startTimeRef.current = performance.now();
    ragFirstChunk.current = false;
    graphRagFirstChunk.current = false;
    ragTtft.current = null;
    graphRagTtft.current = null;

    // Reset state
    setRag({ text: "", isStreaming: true, error: null, ttft: null, tokens: 0 });
    setGraphRag({
      text: "",
      isStreaming: true,
      error: null,
      ttft: null,
      tokens: 0,
    });

    // Fire both streams concurrently
    ragAbort.current = streamRAGQuery(
      query,
      (chunk) => {
        if (!ragFirstChunk.current) {
          ragFirstChunk.current = true;
          ragTtft.current = (performance.now() - startTimeRef.current) / 1000;
        }
        setRag((prev) => ({
          ...prev,
          text: prev.text + chunk,
          ttft: ragTtft.current,
          tokens: estimateTokens(prev.text + chunk),
        }));
      },
      () => setRag((prev) => ({ ...prev, isStreaming: false })),
      (err) =>
        setRag((prev) => ({ ...prev, isStreaming: false, error: err.message })),
    );

    graphRagAbort.current = streamGraphRAGQuery(
      query,
      (chunk) => {
        if (!graphRagFirstChunk.current) {
          graphRagFirstChunk.current = true;
          graphRagTtft.current =
            (performance.now() - startTimeRef.current) / 1000;
        }
        setGraphRag((prev) => ({
          ...prev,
          text: prev.text + chunk,
          ttft: graphRagTtft.current,
          tokens: estimateTokens(prev.text + chunk),
        }));
      },
      () => setGraphRag((prev) => ({ ...prev, isStreaming: false })),
      (err) =>
        setGraphRag((prev) => ({
          ...prev,
          isStreaming: false,
          error: err.message,
        })),
      (engine) => setGraphRag((prev) => ({ ...prev, engine })),
    );
  }, []);

  const isStreaming = rag.isStreaming || graphRag.isStreaming;

  // Independent eval state for each side
  const [ragEval, setRagEval] = useState<EvalScores | null>(null);
  const [graphRagEval, setGraphRagEval] = useState<EvalScores | null>(null);
  const [isRagEvaluating, setIsRagEvaluating] = useState(false);
  const [isGraphRagEvaluating, setIsGraphRagEvaluating] = useState(false);
  const lastQueryRef = useRef("");

  // Trigger RAG eval as soon as RAG finishes
  useEffect(() => {
    if (!rag.isStreaming && rag.text && !rag.error && lastQueryRef.current) {
      setIsRagEvaluating(true);
      evaluateSingle(lastQueryRef.current, rag.text)
        .then(setRagEval)
        .catch(() => setRagEval(null))
        .finally(() => setIsRagEvaluating(false));
    }
  }, [rag.isStreaming, rag.text, rag.error]);

  // Trigger GraphRAG eval as soon as GraphRAG finishes
  useEffect(() => {
    if (
      !graphRag.isStreaming &&
      graphRag.text &&
      !graphRag.error &&
      lastQueryRef.current
    ) {
      setIsGraphRagEvaluating(true);
      evaluateSingle(lastQueryRef.current, graphRag.text)
        .then(setGraphRagEval)
        .catch(() => setGraphRagEval(null))
        .finally(() => setIsGraphRagEvaluating(false));
    }
  }, [graphRag.isStreaming, graphRag.text, graphRag.error]);

  const wrappedSend = useCallback(
    (query: string) => {
      lastQueryRef.current = query;
      setRagEval(null);
      setGraphRagEval(null);
      setIsRagEvaluating(false);
      setIsGraphRagEvaluating(false);
      send(query);
    },
    [send],
  );

  return {
    rag,
    graphRag,
    send: wrappedSend,
    isStreaming,
    ragEval,
    graphRagEval,
    isRagEvaluating,
    isGraphRagEvaluating,
  };
}
