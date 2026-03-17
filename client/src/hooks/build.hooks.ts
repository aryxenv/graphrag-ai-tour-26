import { useCallback, useEffect, useRef, useState } from "react";
import type { BuildEvalScores } from "../api/build.api";
import type { TokenUsage } from "../api/ask.api";
import {
  evaluateBuild,
  generateBuildQuestions,
  generateMemos,
  indexBuildMemos,
  resetBuild,
  streamBuildQuery,
} from "../api";
import type {
  BuildStep,
  DemoScenario,
  GeneratedQuestion,
  GraphData,
  Memo,
} from "../types";
import { loadFromStorage, saveToStorage } from "./storage";

const STORAGE_KEY = "build:session";

export interface BuildStreamState {
  text: string;
  isStreaming: boolean;
  error: string | null;
  engine?: string;
  ttft: number | null;
  tokens: number;
  inputTokens: number | null;
  outputTokens: number | null;
}

const INITIAL_STREAM: BuildStreamState = {
  text: "",
  isStreaming: false,
  error: null,
  ttft: null,
  tokens: 0,
  inputTokens: null,
  outputTokens: null,
};

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

interface IndexProgress {
  workflow: string;
  status: string;
  completed: number;
  total: number;
}

interface PersistedBuildState {
  sessionId: string | null;
  scenario: DemoScenario;
  memoCount: number;
  step: BuildStep;
  memos: Memo[];
  graph: GraphData | null;
  questions: GeneratedQuestion[];
  stream: BuildStreamState;
  lastQuery: string;
  eval: BuildEvalScores | null;
}

function loadPersisted(): PersistedBuildState | undefined {
  return loadFromStorage<PersistedBuildState>(STORAGE_KEY);
}

export function useBuildWizard() {
  const persisted = useRef(loadPersisted());

  const [sessionId, setSessionId] = useState<string | null>(
    persisted.current?.sessionId ?? null,
  );
  const [scenario, setScenario] = useState<DemoScenario>(
    persisted.current?.scenario ?? "tech-startup",
  );
  const [memoCount, setMemoCount] = useState(
    persisted.current?.memoCount ?? 12,
  );
  const [step, setStep] = useState<BuildStep>(
    persisted.current?.step ?? "configure",
  );
  const [memos, setMemos] = useState<Memo[]>(persisted.current?.memos ?? []);
  const [graph, setGraph] = useState<GraphData | null>(
    persisted.current?.graph ?? null,
  );
  const [questions, setQuestions] = useState<GeneratedQuestion[]>(
    persisted.current?.questions ?? [],
  );
  const [stream, setStream] = useState<BuildStreamState>(
    persisted.current?.stream ?? INITIAL_STREAM,
  );
  const [lastQuery, setLastQuery] = useState(
    persisted.current?.lastQuery ?? "",
  );
  const [buildEval, setBuildEval] = useState<BuildEvalScores | null>(
    persisted.current?.eval ?? null,
  );
  const [isEvaluating, setIsEvaluating] = useState(false);

  // Indexing state
  const [isGenerating, setIsGenerating] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexProgress, setIndexProgress] = useState<IndexProgress | null>(
    null,
  );
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const cancelledRef = useRef(false);
  const startTimeRef = useRef(0);
  const firstChunkRef = useRef(false);
  const ttftRef = useRef<number | null>(null);

  // Persist state to localStorage
  useEffect(() => {
    if (step !== "configure" || sessionId) {
      saveToStorage(STORAGE_KEY, {
        sessionId,
        scenario,
        memoCount,
        step,
        memos,
        graph,
        questions,
        stream: stream.isStreaming ? INITIAL_STREAM : stream,
        lastQuery,
        eval: buildEval,
      });
    }
  }, [
    sessionId,
    scenario,
    memoCount,
    step,
    memos,
    graph,
    questions,
    stream,
    lastQuery,
    buildEval,
  ]);

  const generate = useCallback(async () => {
    setIsGenerating(true);
    setStep("generating");
    cancelledRef.current = false;
    try {
      const result = await generateMemos(scenario, memoCount);
      if (cancelledRef.current) return;
      setSessionId(result.session_id);
      setMemos(result.memos);
      setStep("memos");
    } catch (err) {
      if (cancelledRef.current) return;
      console.error("Memo generation failed:", err);
      setStep("configure");
    } finally {
      setIsGenerating(false);
    }
  }, [scenario, memoCount]);

  const index = useCallback(() => {
    if (!sessionId) return;
    setIsIndexing(true);
    setStep("indexing");
    setIndexProgress(null);

    abortRef.current = indexBuildMemos(
      sessionId,
      (msg) => setIndexProgress(msg),
      (graphData) => {
        setGraph(graphData);
        setStep("graph");
      },
      () => {
        setIsIndexing(false);
        // Load questions after indexing
        if (sessionId) {
          setIsLoadingQuestions(true);
          generateBuildQuestions(sessionId)
            .then((q) => {
              setQuestions(q);
              setStep("ready");
            })
            .catch(() => setStep("ready"))
            .finally(() => setIsLoadingQuestions(false));
        }
      },
      (err) => {
        console.error("Indexing failed:", err);
        setIsIndexing(false);
        setStep("memos");
      },
    );
  }, [sessionId]);

  const refreshQuestions = useCallback(() => {
    if (!sessionId) return;
    setIsLoadingQuestions(true);
    generateBuildQuestions(sessionId)
      .then(setQuestions)
      .catch(() => {})
      .finally(() => setIsLoadingQuestions(false));
  }, [sessionId]);

  const sendQuery = useCallback(
    (query: string) => {
      if (!sessionId) return;

      abortRef.current?.abort();
      startTimeRef.current = performance.now();
      firstChunkRef.current = false;
      ttftRef.current = null;

      setLastQuery(query);
      setBuildEval(null);
      setIsEvaluating(false);
      setStream({
        text: "",
        isStreaming: true,
        error: null,
        ttft: null,
        tokens: 0,
        inputTokens: null,
        outputTokens: null,
      });

      abortRef.current = streamBuildQuery(
        sessionId,
        query,
        (chunk) => {
          if (!firstChunkRef.current) {
            firstChunkRef.current = true;
            ttftRef.current = (performance.now() - startTimeRef.current) / 1000;
          }
          setStream((prev) => ({
            ...prev,
            text: prev.text + chunk,
            ttft: ttftRef.current,
            tokens: estimateTokens(prev.text + chunk),
          }));
        },
        () => setStream((prev) => ({ ...prev, isStreaming: false })),
        (err) =>
          setStream((prev) => ({
            ...prev,
            isStreaming: false,
            error: err.message,
          })),
        (engine) => setStream((prev) => ({ ...prev, engine })),
        (usage: TokenUsage) =>
          setStream((prev) => ({
            ...prev,
            inputTokens: usage.inputTokens,
            outputTokens: usage.outputTokens,
          })),
      );
    },
    [sessionId],
  );

  const stopQuery = useCallback(() => {
    abortRef.current?.abort();
    setStream((prev) => ({ ...prev, isStreaming: false }));
  }, []);

  // Auto-trigger eval when streaming finishes
  useEffect(() => {
    if (
      !stream.isStreaming &&
      stream.text &&
      !stream.error &&
      lastQuery &&
      sessionId &&
      !buildEval
    ) {
      setIsEvaluating(true);
      evaluateBuild(sessionId, lastQuery, stream.text)
        .then(setBuildEval)
        .catch(() => setBuildEval(null))
        .finally(() => setIsEvaluating(false));
    }
  }, [stream.isStreaming, stream.text, stream.error, lastQuery, sessionId]);

  const reset = useCallback(async () => {
    // Kill all in-flight operations
    cancelledRef.current = true;
    abortRef.current?.abort();
    if (sessionId) {
      resetBuild(sessionId).catch(() => {});
    }
    setSessionId(null);
    setMemos([]);
    setGraph(null);
    setQuestions([]);
    setStream(INITIAL_STREAM);
    setLastQuery("");
    setBuildEval(null);
    setIsEvaluating(false);
    setIsGenerating(false);
    setIsIndexing(false);
    setIsLoadingQuestions(false);
    setIndexProgress(null);
    setStep("configure");
    localStorage.removeItem(STORAGE_KEY);
  }, [sessionId]);

  return {
    // Config
    scenario,
    setScenario,
    memoCount,
    setMemoCount,
    step,
    // Generation
    generate,
    isGenerating,
    memos,
    // Indexing
    index,
    isIndexing,
    indexProgress,
    graph,
    // Questions
    questions,
    isLoadingQuestions,
    refreshQuestions,
    // Query
    stream,
    lastQuery,
    sendQuery,
    stopQuery,
    isStreaming: stream.isStreaming,
    // Eval
    buildEval,
    isEvaluating,
    // Session
    sessionId,
    reset,
  };
}
