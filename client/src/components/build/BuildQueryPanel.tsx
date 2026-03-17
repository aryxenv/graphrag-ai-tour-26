import {
  makeStyles,
  Spinner,
  Textarea,
  Tooltip,
  tokens,
} from "@fluentui/react-components";
import {
  Info12Regular,
  LightbulbFilament16Regular,
  QuestionCircle12Regular,
  Send16Regular,
  Stop16Filled,
} from "@fluentui/react-icons";
import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { BuildEvalScores } from "../../api/build.api";
import type { BuildStreamState } from "../../hooks/build.hooks";
import type { GeneratedQuestion } from "../../types";
import EvalBadge from "../ask/EvalBadge";
import FoundryLogo from "../ask/FoundryLogo";
import graphragLogo from "../../assets/graphrag.png";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    fontSize: "16px",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.8px",
    padding: "14px 0 10px 0",
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
  tokenBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "3px",
    fontSize: "11px",
    fontWeight: 400,
    textTransform: "none",
    padding: "2px 8px",
    borderRadius: "10px",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    color: "rgba(255, 255, 255, 0.5)",
    letterSpacing: "0.3px",
    cursor: "default",
  },
  tokenIcon: {
    display: "inline-flex",
    opacity: 0.5,
    fontSize: "10px",
  },
  divider: {
    height: "1px",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    width: "100%",
    flexShrink: 0,
  },
  panel: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    padding: "0 16px 8px 16px",
    overflowY: "auto",
    minHeight: 0,
  },
  content: {
    flex: 1,
    fontSize: "14px",
    lineHeight: "1.6",
    color: tokens.colorNeutralForeground2,
    "& h1": {
      fontSize: "16px",
      fontWeight: 600,
      marginTop: "16px",
      marginBottom: "8px",
    },
    "& h2": {
      fontSize: "15px",
      fontWeight: 600,
      marginTop: "14px",
      marginBottom: "6px",
    },
    "& h3": {
      fontSize: "14px",
      fontWeight: 600,
      marginTop: "12px",
      marginBottom: "4px",
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
  errorState: {
    color: "#ff6b6b",
    fontSize: "13px",
    padding: "12px",
  },
  question: {
    fontSize: "13px",
    fontWeight: 600,
    color: tokens.colorNeutralForeground1,
    padding: "12px 0 8px 0",
    borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
    marginBottom: "8px",
  },
  estimatedTime: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "4px",
    fontSize: "11px",
    color: tokens.colorNeutralForeground4,
    marginTop: "12px",
  },
  poweredBy: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    padding: "8px 0",
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
  inputArea: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    flexShrink: 0,
    padding: "8px 16px 12px 16px",
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
      maxHeight: "100px",
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
});

interface Props {
  stream: BuildStreamState;
  lastQuery: string;
  questions: GeneratedQuestion[];
  isLoadingQuestions: boolean;
  onRefreshQuestions?: () => void;
  onSend: (query: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  evalScores: BuildEvalScores | null;
  isEvaluating: boolean;
  disabled?: boolean;
}

const BuildQueryPanel = ({
  stream,
  lastQuery,
  questions,
  isLoadingQuestions,
  onRefreshQuestions,
  onSend,
  onStop,
  isStreaming,
  evalScores,
  isEvaluating,
  disabled,
}: Props) => {
  const styles = useStyles();
  const [query, setQuery] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Auto-scroll when streaming
  useEffect(() => {
    panelRef.current?.scrollTo({
      top: panelRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [stream.text]);

  const handleSend = () => {
    if (!query.trim() || disabled || isStreaming) return;
    onSend(query.trim());
    setQuery("");
  };

  // Split BuildEvalScores into quick + full for EvalBadge reuse
  const quickScores = evalScores
    ? { relevance: evalScores.relevance, coherence: evalScores.coherence }
    : null;
  const fullScores = evalScores
    ? {
        groundedness: evalScores.groundedness,
        similarity: evalScores.similarity,
        retrieval: evalScores.retrieval,
      }
    : null;

  const renderTokenBadge = () => {
    if (stream.isStreaming || stream.tokens === 0) return null;
    const hasUsage =
      stream.inputTokens !== null && stream.outputTokens !== null;
    const tooltipContent = hasUsage ? (
      <div>
        <div>Input: {stream.inputTokens}tk</div>
        <div>Output: {stream.outputTokens}tk</div>
      </div>
    ) : (
      `Estimated: ${stream.tokens}tk`
    );
    const total = hasUsage
      ? stream.inputTokens! + stream.outputTokens!
      : stream.tokens;
    return (
      <Tooltip
        content={tooltipContent}
        relationship="description"
        positioning="below"
        withArrow
      >
        <span className={styles.tokenBadge}>
          {total}tk
          <span className={styles.tokenIcon}>
            <QuestionCircle12Regular />
          </span>
        </span>
      </Tooltip>
    );
  };

  // Panel content
  let content;
  if (stream.error) {
    content = <div className={styles.errorState}>{stream.error}</div>;
  } else if (stream.text) {
    content = <Markdown remarkPlugins={[remarkGfm]}>{stream.text}</Markdown>;
  } else if (stream.isStreaming) {
    content = (
      <>
        <Spinner size="small" label="Performing GraphRAG..." />
        <div className={styles.estimatedTime}>
          <Info12Regular /> TTFT may take up to 5 minutes
        </div>
      </>
    );
  } else {
    content = (
      <div className={styles.emptyState}>
        Select a question or ask your own
      </div>
    );
  }

  const suggestions = questions.map((q) => ({ text: q.question }));

  return (
    <div className={styles.root}>
      {/* Header with badges */}
      <div className={styles.header}>
        GraphRAG
        {stream.engine && (
          <span className={styles.engineBadge}>{stream.engine}</span>
        )}
        {stream.ttft !== null && (
          <Tooltip
            content="Time to first token"
            relationship="description"
            positioning="below"
            withArrow
          >
            <span className={styles.tokenBadge}>
              {stream.ttft.toFixed(1)}s TTFT
              <span className={styles.tokenIcon}>
                <QuestionCircle12Regular />
              </span>
            </span>
          </Tooltip>
        )}
        {renderTokenBadge()}
        <EvalBadge
          scores={quickScores}
          fullScores={fullScores}
          isEvaluating={isEvaluating}
          isFullEvaluating={false}
        />
      </div>

      {/* Answer panel */}
      <div className={styles.panel} ref={panelRef}>
        {lastQuery && <div className={styles.question}>{lastQuery}</div>}
        <div className={styles.content}>{content}</div>
        <div className={styles.poweredBy}>
          <span className={styles.poweredByItem}>
            <img src={graphragLogo} alt="" className={styles.poweredByLogo} />
            GraphRAG
          </span>
          <span className={styles.poweredByItem}>
            <FoundryLogo />
            Foundry Models
          </span>
        </div>
      </div>

      <div className={styles.divider} />

      {/* Input area */}
      <div className={styles.inputArea}>
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
          {onRefreshQuestions && (
            <button
              className={styles.suggestionBtn}
              onClick={onRefreshQuestions}
              disabled={isLoadingQuestions}
            >
              {isLoadingQuestions ? "Generating…" : "Suggest with Foundry"}
              <LightbulbFilament16Regular />
            </button>
          )}
        </div>
        <div className={styles.inputRow}>
          <Textarea
            ref={textareaRef}
            className={styles.textareaWrapper}
            placeholder="Ask a question about the memos…"
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
            onClick={isStreaming ? onStop : handleSend}
            disabled={!isStreaming && (!query.trim() || disabled)}
            title={isStreaming ? "Stop" : "Send"}
          >
            {isStreaming ? <Stop16Filled /> : <Send16Regular />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BuildQueryPanel;
