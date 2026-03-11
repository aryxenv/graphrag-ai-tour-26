import { makeStyles, Textarea, tokens } from "@fluentui/react-components";
import { Send16Regular } from "@fluentui/react-icons";
import { useEffect, useRef, useState } from "react";

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
  inputArea: {
    display: "flex",
    alignItems: "flex-end",
    gap: "8px",
    padding: "0.5rem",
    flexShrink: 0,
    maxWidth: "800px",
    marginLeft: "auto",
    marginRight: "auto",
    width: "100%",
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
  const [ragAnswer, setRagAnswer] = useState<string | null>(null);
  const [graphRagAnswer, setGraphRagAnswer] = useState<string | null>(null);
  const ragPanelRef = useRef<HTMLDivElement>(null);
  const graphRagPanelRef = useRef<HTMLDivElement>(null);

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
  }, [ragAnswer, graphRagAnswer]);

  const handleSend = () => {
    if (!query.trim()) return;
    // TODO: call actual APIs
    setRagAnswer(`[RAG placeholder] Answer for: "${query}"`);
    setGraphRagAnswer(`[GraphRAG placeholder] Answer for: "${query}"`);
    setQuery("");
  };

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

      {/* Input bar */}
      <div className={styles.inputArea}>
        <Textarea
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
  );
};

export default Ask;
