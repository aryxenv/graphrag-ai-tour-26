import {
  makeStyles,
  Spinner,
  Textarea,
  tokens,
  Tooltip,
} from "@fluentui/react-components";
import {
  ArrowUpRight12Regular,
  LightbulbFilament16Regular,
  QuestionCircle12Regular,
  Send16Regular,
} from "@fluentui/react-icons";
import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import type { EvalScores } from "../../api";
import azureAiSearchLogo from "../../assets/azure_ai_search.svg";
import bookUrl from "../../assets/book.txt?url";
import graphragLogo from "../../assets/graphrag.png";
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
  evalBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "3px",
    fontSize: "11px",
    fontWeight: 500,
    textTransform: "none",
    padding: "2px 8px",
    borderRadius: "10px",
    backgroundColor: "rgba(76, 175, 80, 0.15)",
    color: "#81c784",
    letterSpacing: "0.3px",
    cursor: "default",
  },
  evalIcon: {
    display: "inline-flex",
    opacity: 0.6,
    fontSize: "10px",
  },
  evalSpinner: {
    display: "inline-flex",
  },
  poweredBy: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    padding: "10px 0",
    flexShrink: 0,
    marginTop: "auto",
    opacity: 0.4,
    fontSize: "11px",
    letterSpacing: "0.3px",
  },
  poweredByItem: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
  },
  poweredByLogo: {
    height: "14px",
    width: "auto",
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

  const renderEvalBadge = (scores: EvalScores | null, evaluating: boolean) => {
    if (evaluating) {
      return (
        <span className={styles.evalBadge}>
          <Spinner className={styles.evalSpinner} size="extra-tiny" />
        </span>
      );
    }
    if (!scores) return null;
    const tooltipContent = (
      <div style={{ fontSize: "12px", lineHeight: "1.6" }}>
        <div>Relevance: {scores.relevance}%</div>
        <div>Groundedness: {scores.groundedness}%</div>
        <div>Coherence: {scores.coherence}%</div>
        <div
          style={{
            marginTop: "6px",
            paddingTop: "6px",
            borderTop: "1px solid rgba(255,255,255,0.1)",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            opacity: 0.6,
            fontSize: "10px",
          }}
        >
          <svg
            height="12"
            width="12"
            viewBox="0 0 32 32"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              clipRule="evenodd"
              d="M20.4052 2C20.3713 2.04989 20.3403 2.10356 20.3119 2.15906C20.1753 2.42519 20.0629 2.80022 19.9685 3.2499C19.7794 4.15205 19.6545 5.3972 19.5714 6.7798C19.405 9.54716 19.405 12.8938 19.405 15.213V24.4338L19.4049 24.4698C19.3854 27.5153 16.8918 29.9806 13.8112 29.9999L13.7749 30H3.57642C3.18062 30 2.9073 29.6141 3.04346 29.2496C4.56004 25.1917 6.6982 19.4832 8.50404 14.6901C9.40697 12.2934 10.2268 10.1257 10.8442 8.50763C11.4636 6.88453 11.876 5.82419 11.9665 5.63239C12.2132 5.10978 12.6147 4.1951 13.1873 3.40856C13.7637 2.61659 14.4808 2.00001 15.3445 2H20.4052ZM29.2769 10.1842C29.4966 10.1842 29.6747 10.3603 29.6747 10.5775V17.6706L29.6745 17.7148C29.6504 19.5836 28.1106 21.0913 26.2147 21.0913H21.668C21.6778 21.0796 21.6872 21.0676 21.6966 21.0552C21.8605 20.8367 21.9531 20.526 21.9587 20.134L21.9589 20.0958V14.0817C21.9589 11.9291 23.7238 10.1842 25.9011 10.1842H29.2769ZM21.2532 2.14424C21.5631 2.14425 21.8986 2.38926 22.2468 2.88783C22.5881 3.37681 22.9111 4.06635 23.2065 4.85721C23.7783 6.3875 24.2354 8.26487 24.5265 9.71512C22.6354 10.2861 21.2595 12.0248 21.2595 14.0817V20.0782L21.2594 20.0921C21.2575 20.2355 21.2263 20.4039 21.1685 20.5329C21.1042 20.6758 21.0375 20.7121 20.9938 20.7121C20.9575 20.7121 20.8869 20.6826 20.7852 20.5652C20.6894 20.4549 20.5915 20.2961 20.4975 20.1117C20.3151 19.7539 20.1614 19.3273 20.0739 19.0482V15.213C20.0739 8.68733 20.3039 5.39271 20.5834 3.73209C20.7239 2.89797 20.8739 2.49601 20.9998 2.30459C21.0605 2.21243 21.1101 2.17748 21.1426 2.16241C21.1755 2.14714 21.207 2.14424 21.2532 2.14424Z"
              fill="currentColor"
              fillRule="evenodd"
            />
          </svg>
          Powered by Foundry evaluations
        </div>
      </div>
    );
    return (
      <Tooltip
        content={tooltipContent}
        relationship="description"
        positioning="below"
        withArrow
      >
        <span className={styles.evalBadge}>
          {scores.overall}%
          <span className={styles.evalIcon}>
            <QuestionCircle12Regular />
          </span>
        </span>
      </Tooltip>
    );
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
          {renderEvalBadge(ragEval, isRagEvaluating)}
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
          {renderEvalBadge(graphRagEval, isGraphRagEvaluating)}
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
          <div className={styles.poweredBy}>
            <span className={styles.poweredByItem}>
              <img
                src={azureAiSearchLogo}
                alt=""
                className={styles.poweredByLogo}
              />
              Azure AI Search
            </span>
            <span className={styles.poweredByItem}>
              <svg
                height="14"
                width="14"
                viewBox="0 0 32 32"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  clipRule="evenodd"
                  d="M20.4052 2C20.3713 2.04989 20.3403 2.10356 20.3119 2.15906C20.1753 2.42519 20.0629 2.80022 19.9685 3.2499C19.7794 4.15205 19.6545 5.3972 19.5714 6.7798C19.405 9.54716 19.405 12.8938 19.405 15.213V24.4338L19.4049 24.4698C19.3854 27.5153 16.8918 29.9806 13.8112 29.9999L13.7749 30H3.57642C3.18062 30 2.9073 29.6141 3.04346 29.2496C4.56004 25.1917 6.6982 19.4832 8.50404 14.6901C9.40697 12.2934 10.2268 10.1257 10.8442 8.50763C11.4636 6.88453 11.876 5.82419 11.9665 5.63239C12.2132 5.10978 12.6147 4.1951 13.1873 3.40856C13.7637 2.61659 14.4808 2.00001 15.3445 2H20.4052ZM29.2769 10.1842C29.4966 10.1842 29.6747 10.3603 29.6747 10.5775V17.6706L29.6745 17.7148C29.6504 19.5836 28.1106 21.0913 26.2147 21.0913H21.668C21.6778 21.0796 21.6872 21.0676 21.6966 21.0552C21.8605 20.8367 21.9531 20.526 21.9587 20.134L21.9589 20.0958V14.0817C21.9589 11.9291 23.7238 10.1842 25.9011 10.1842H29.2769ZM21.2532 2.14424C21.5631 2.14425 21.8986 2.38926 22.2468 2.88783C22.5881 3.37681 22.9111 4.06635 23.2065 4.85721C23.7783 6.3875 24.2354 8.26487 24.5265 9.71512C22.6354 10.2861 21.2595 12.0248 21.2595 14.0817V20.0782L21.2594 20.0921C21.2575 20.2355 21.2263 20.4039 21.1685 20.5329C21.1042 20.6758 21.0375 20.7121 20.9938 20.7121C20.9575 20.7121 20.8869 20.6826 20.7852 20.5652C20.6894 20.4549 20.5915 20.2961 20.4975 20.1117C20.3151 19.7539 20.1614 19.3273 20.0739 19.0482V15.213C20.0739 8.68733 20.3039 5.39271 20.5834 3.73209C20.7239 2.89797 20.8739 2.49601 20.9998 2.30459C21.0605 2.21243 21.1101 2.17748 21.1426 2.16241C21.1755 2.14714 21.207 2.14424 21.2532 2.14424Z"
                  fill="currentColor"
                  fillRule="evenodd"
                />
              </svg>
              Foundry Models
            </span>
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
          <div className={styles.poweredBy}>
            <span className={styles.poweredByItem}>
              <img src={graphragLogo} alt="" className={styles.poweredByLogo} />
              GraphRAG
            </span>
            <span className={styles.poweredByItem}>
              <svg
                height="14"
                width="14"
                viewBox="0 0 32 32"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  clipRule="evenodd"
                  d="M20.4052 2C20.3713 2.04989 20.3403 2.10356 20.3119 2.15906C20.1753 2.42519 20.0629 2.80022 19.9685 3.2499C19.7794 4.15205 19.6545 5.3972 19.5714 6.7798C19.405 9.54716 19.405 12.8938 19.405 15.213V24.4338L19.4049 24.4698C19.3854 27.5153 16.8918 29.9806 13.8112 29.9999L13.7749 30H3.57642C3.18062 30 2.9073 29.6141 3.04346 29.2496C4.56004 25.1917 6.6982 19.4832 8.50404 14.6901C9.40697 12.2934 10.2268 10.1257 10.8442 8.50763C11.4636 6.88453 11.876 5.82419 11.9665 5.63239C12.2132 5.10978 12.6147 4.1951 13.1873 3.40856C13.7637 2.61659 14.4808 2.00001 15.3445 2H20.4052ZM29.2769 10.1842C29.4966 10.1842 29.6747 10.3603 29.6747 10.5775V17.6706L29.6745 17.7148C29.6504 19.5836 28.1106 21.0913 26.2147 21.0913H21.668C21.6778 21.0796 21.6872 21.0676 21.6966 21.0552C21.8605 20.8367 21.9531 20.526 21.9587 20.134L21.9589 20.0958V14.0817C21.9589 11.9291 23.7238 10.1842 25.9011 10.1842H29.2769ZM21.2532 2.14424C21.5631 2.14425 21.8986 2.38926 22.2468 2.88783C22.5881 3.37681 22.9111 4.06635 23.2065 4.85721C23.7783 6.3875 24.2354 8.26487 24.5265 9.71512C22.6354 10.2861 21.2595 12.0248 21.2595 14.0817V20.0782L21.2594 20.0921C21.2575 20.2355 21.2263 20.4039 21.1685 20.5329C21.1042 20.6758 21.0375 20.7121 20.9938 20.7121C20.9575 20.7121 20.8869 20.6826 20.7852 20.5652C20.6894 20.4549 20.5915 20.2961 20.4975 20.1117C20.3151 19.7539 20.1614 19.3273 20.0739 19.0482V15.213C20.0739 8.68733 20.3039 5.39271 20.5834 3.73209C20.7239 2.89797 20.8739 2.49601 20.9998 2.30459C21.0605 2.21243 21.1101 2.17748 21.1426 2.16241C21.1755 2.14714 21.207 2.14424 21.2532 2.14424Z"
                  fill="currentColor"
                  fillRule="evenodd"
                />
              </svg>
              Foundry Models
            </span>
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
