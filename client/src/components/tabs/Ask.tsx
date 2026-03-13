import { makeStyles } from "@fluentui/react-components";
import { useEffect, useRef } from "react";
import azureAiSearchLogo from "../../assets/azure_ai_search.svg";
import graphragLogo from "../../assets/graphrag.png";
import { useAskQuestions, useStreamingQuery } from "../../hooks";
import EvalBadge from "../ask/EvalBadge";
import QueryInput from "../ask/QueryInput";
import QueryPanel from "../ask/QueryPanel";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    height: "calc(100vh - 48px)",
  },
  panelHeaders: {
    display: "flex",
    flexShrink: 0,
  },
  panelHeader: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    fontSize: "16px",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.8px",
    padding: "24px 0 12px 0",
  },
  panels: {
    display: "flex",
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
  },
  verticalDivider: {
    width: "1px",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignSelf: "stretch",
    flexShrink: 0,
  },
  horizontalDivider: {
    height: "1px",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    width: "100%",
    flexShrink: 0,
  },
  engineBadge: {
    fontSize: "11px",
    fontWeight: 400,
    textTransform: "lowercase",
    padding: "2px 8px",
    borderRadius: "10px",
    backgroundColor: "rgba(123, 83, 230, 0.25)",
    color: "#c4a8ff",
    letterSpacing: "0.3px",
  },
  metricBadge: {
    fontSize: "11px",
    fontWeight: 400,
    textTransform: "none",
    padding: "2px 8px",
    borderRadius: "10px",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    color: "rgba(255, 255, 255, 0.5)",
    letterSpacing: "0.3px",
  },
});

const Ask = () => {
  const styles = useStyles();
  const ragPanelRef = useRef<HTMLDivElement>(null);
  const graphRagPanelRef = useRef<HTMLDivElement>(null);

  const {
    data: suggestionsData,
    isFetching: loadingSuggestions,
    refresh: loadSuggestions,
  } = useAskQuestions();

  const {
    rag,
    graphRag,
    send,
    isStreaming,
    ragEval,
    graphRagEval,
    isRagEvaluating,
    isGraphRagEvaluating,
  } = useStreamingQuery();

  const suggestions = (suggestionsData?.questions ?? []).map((q) => ({
    text: q.question,
  }));

  // Auto-scroll panels when streaming
  useEffect(() => {
    ragPanelRef.current?.scrollTo({
      top: ragPanelRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [rag.text]);

  useEffect(() => {
    graphRagPanelRef.current?.scrollTo({
      top: graphRagPanelRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [graphRag.text]);

  return (
    <div className={styles.root}>
      {/* Headers */}
      <div className={styles.panelHeaders}>
        <div className={styles.panelHeader}>
          RAG
          {rag.ttft !== null && (
            <span className={styles.metricBadge}>
              {rag.ttft.toFixed(1)}s TTFT
            </span>
          )}
          {!rag.isStreaming && rag.tokens > 0 && (
            <span className={styles.metricBadge}>{rag.tokens}tk</span>
          )}
          <EvalBadge scores={ragEval} isEvaluating={isRagEvaluating} />
        </div>
        <div className={styles.verticalDivider} />
        <div className={styles.panelHeader}>
          GraphRAG
          {graphRag.engine && (
            <span className={styles.engineBadge}>{graphRag.engine}</span>
          )}
          {graphRag.ttft !== null && (
            <span className={styles.metricBadge}>
              {graphRag.ttft.toFixed(1)}s TTFT
            </span>
          )}
          {!graphRag.isStreaming && graphRag.tokens > 0 && (
            <span className={styles.metricBadge}>{graphRag.tokens}tk</span>
          )}
          <EvalBadge
            scores={graphRagEval}
            isEvaluating={isGraphRagEvaluating}
          />
        </div>
      </div>

      {/* Panels */}
      <div className={styles.panels}>
        <QueryPanel
          ref={ragPanelRef}
          state={rag}
          spinnerLabel="Querying RAG..."
          poweredByLogo={azureAiSearchLogo}
          poweredByLabel="Azure AI Search"
        />
        <div className={styles.verticalDivider} />
        <QueryPanel
          ref={graphRagPanelRef}
          state={graphRag}
          spinnerLabel="Querying GraphRAG..."
          poweredByLogo={graphragLogo}
          poweredByLabel="GraphRAG"
        />
      </div>

      <div className={styles.horizontalDivider} />

      {/* Input */}
      <QueryInput
        suggestions={suggestions}
        loadingSuggestions={loadingSuggestions}
        onRefreshSuggestions={loadSuggestions}
        onSend={send}
        disabled={isStreaming}
      />
    </div>
  );
};

export default Ask;
