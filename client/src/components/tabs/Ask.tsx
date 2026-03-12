import { makeStyles, Textarea, tokens } from "@fluentui/react-components";
import {
  ArrowUpRight12Regular,
  LightbulbFilament16Regular,
  Send16Regular,
} from "@fluentui/react-icons";
import { useEffect, useRef, useState } from "react";
import bookUrl from "../../assets/book.txt?url";
import {
  useAskQuestions,
  useQueryGraphRAG,
  useQueryVanillaRAG,
} from "../../hooks";
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
    fontSize: "16px",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.8px",
    textAlign: "center",
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
    padding: "0 24px",
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

  const vanillaRAG = useQueryVanillaRAG();
  const graphRAG = useQueryGraphRAG();

  const suggestions: Suggestion[] = (suggestionsData?.questions ?? []).map(
    (q) => ({
      text: q.question,
      searchMethod: suggestionsData?.mode ?? "local",
    }),
  );

  // Auto-scroll both panels to bottom when answers change
  useEffect(() => {
    ragPanelRef.current?.scrollTo({
      top: ragPanelRef.current.scrollHeight,
      behavior: "smooth",
    });
    graphRagPanelRef.current?.scrollTo({
      top: graphRagPanelRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [vanillaRAG.data, graphRAG.data]);

  const handleSend = () => {
    if (!query.trim()) return;
    const q = query;
    setQuery("");
    vanillaRAG.mutate(q);
    graphRAG.mutate(q);
  };

  const ragAnswer = vanillaRAG.data?.answer ?? null;
  const graphRagAnswer = graphRAG.data?.answer ?? null;

  return (
    <div className={styles.root}>
      {/* Fixed headers */}
      <div className={styles.panelHeaders}>
        <div className={styles.panelHeader}>RAG</div>
        <div className={styles.verticalDivider} />
        <div className={styles.panelHeader}>GraphRAG</div>
      </div>

      {/* Scrollable panels */}
      <div className={styles.panels}>
        <div className={styles.panel} ref={ragPanelRef}>
          <div className={styles.panelContent}>
            {ragAnswer ? (
              <p>{ragAnswer}</p>
            ) : (
              <div className={styles.emptyState}>Ask a question to compare</div>
            )}
          </div>
        </div>

        <div className={styles.verticalDivider} />

        <div className={styles.panel} ref={graphRagPanelRef}>
          <div className={styles.panelContent}>
            {graphRagAnswer ? (
              <p>{graphRagAnswer}</p>
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
            disabled={!query.trim()}
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
