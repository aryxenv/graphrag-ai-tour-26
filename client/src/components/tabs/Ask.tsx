import {
  makeStyles,
  Spinner,
  Textarea,
  tokens,
} from "@fluentui/react-components";
import {
  ArrowUpRight12Regular,
  LightbulbFilament16Regular,
  Send16Regular,
} from "@fluentui/react-icons";
import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import bookUrl from "../../assets/book.txt?url";
import { useAskQuestions, useStreamingQuery } from "../../hooks";
import type { SearchMethod } from "../../types";

interface Suggestion {
  text: string;
  searchMethod: SearchMethod;
}

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
  panel: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    padding: "0 24px 24px 24px",
    overflowY: "auto",
  },
  panelContent: {
    flex: 1,
    fontSize: "14px",
    lineHeight: "1.6",
    color: tokens.colorNeutralForeground2,
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
  inputSection: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    flexShrink: 0,
    maxWidth: "800px",
    marginLeft: "auto",
    marginRight: "auto",
    width: "100%",
    padding: "0.5rem",
  },
  suggestions: {
    display: "flex",
    gap: "6px",
    flexWrap: "wrap",
  },
  suggestionBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "12px",
    padding: "5px 12px",
    borderRadius: "14px",
    border: "1px solid rgba(255, 255, 255, 0.12)",
    backgroundColor: "transparent",
    color: tokens.colorNeutralForeground2,
    cursor: "pointer",
    transition: "border-color 0.15s ease, background-color 0.15s ease",
    whiteSpace: "nowrap",
    ":hover": {
      border: "1px solid rgba(255, 255, 255, 0.3)",
      backgroundColor: "rgba(255, 255, 255, 0.04)",
    },
  },
  inputRow: {
    display: "flex",
    alignItems: "flex-end",
    gap: "8px",
  },
  textareaWrapper: {
    flex: 1,
    "& textarea": {
      fieldSizing: "content",
      maxHeight: "150px",
      minHeight: "32px",
    },
  },
  sendBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "32px",
    height: "32px",
    border: "none",
    borderRadius: "6px",
    backgroundColor: "#7b53e6",
    color: "#fff",
    cursor: "pointer",
    transition: "opacity 0.15s ease",
    flexShrink: 0,
    marginBottom: "2px",
    ":hover": {
      opacity: 0.85,
    },
    ":disabled": {
      opacity: 0.3,
      cursor: "default",
    },
  },
  emptyState: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.3,
    fontSize: "14px",
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
  errorState: {
    color: "#ff6b6b",
    fontSize: "13px",
    padding: "12px",
  },
});

const Ask = () => {
  const styles = useStyles();
  const [query, setQuery] = useState("");
  const ragPanelRef = useRef<HTMLDivElement>(null);
  const graphRagPanelRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    data: suggestionsData,
    isFetching: loadingSuggestions,
    refresh: loadSuggestions,
  } = useAskQuestions();

  const { rag, graphRag, send, isStreaming } = useStreamingQuery();

  const suggestions: Suggestion[] = (suggestionsData?.questions ?? []).map(
    (q) => ({
      text: q.question,
      searchMethod: suggestionsData?.mode ?? "local",
    }),
  );

  // Auto-scroll both panels to bottom when streaming text changes
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

  const handleSend = () => {
    if (!query.trim() || isStreaming) return;
    send(query.trim());
    setQuery("");
  };

  return (
    <div className={styles.root}>
      {/* Fixed headers */}
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
        </div>
      </div>

      {/* Scrollable panels */}
      <div className={styles.panels}>
        <div className={styles.panel} ref={ragPanelRef}>
          <div className={styles.panelContent}>
            {rag.error ? (
              <div className={styles.errorState}>{rag.error}</div>
            ) : rag.text ? (
              <Markdown>{rag.text}</Markdown>
            ) : rag.isStreaming ? (
              <Spinner size="small" label="Querying RAG..." />
            ) : (
              <div className={styles.emptyState}>Ask a question to compare</div>
            )}
          </div>
        </div>

        <div className={styles.verticalDivider} />

        <div className={styles.panel} ref={graphRagPanelRef}>
          <div className={styles.panelContent}>
            {graphRag.error ? (
              <div className={styles.errorState}>{graphRag.error}</div>
            ) : graphRag.text ? (
              <Markdown>{graphRag.text}</Markdown>
            ) : graphRag.isStreaming ? (
              <Spinner size="small" label="Querying GraphRAG..." />
            ) : (
              <div className={styles.emptyState}>Ask a question to compare</div>
            )}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className={styles.horizontalDivider} />

      {/* Input section */}
      <div className={styles.inputSection}>
        <div className={styles.suggestions}>
          {suggestions.map((s) => (
            <button
              key={s.text}
              className={styles.suggestionBtn}
              onClick={() => {
                setQuery(s.text);
                textareaRef.current?.focus();
              }}
            >
              {s.text}
            </button>
          ))}
          <button
            className={styles.suggestionBtn}
            onClick={loadSuggestions}
            disabled={loadingSuggestions}
            title="Generate new suggestions"
          >
            {loadingSuggestions ? "Generating…" : "Suggest with Foundry"}
            <LightbulbFilament16Regular />
          </button>
          <button
            className={styles.suggestionBtn}
            onClick={() => {
              window.open(bookUrl, "_blank");
            }}
          >
            Show book
            <ArrowUpRight12Regular />
          </button>
        </div>
        <div className={styles.inputRow}>
          <Textarea
            ref={textareaRef}
            className={styles.textareaWrapper}
            placeholder="Ask a question to compare RAG vs GraphRAG..."
            value={query}
            onChange={(_, data) => setQuery(data.value)}
            resize="none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            className={styles.sendBtn}
            onClick={handleSend}
            disabled={!query.trim() || isStreaming}
            title="Send"
          >
            <Send16Regular />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Ask;
