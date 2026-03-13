import { makeStyles, Textarea, tokens } from "@fluentui/react-components";
import {
  ArrowUpRight12Regular,
  LightbulbFilament16Regular,
  Send16Regular,
} from "@fluentui/react-icons";
import { useRef, useState } from "react";
import { BOOK_URL } from "../../constants";

const useStyles = makeStyles({
  root: {
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
});

interface Suggestion {
  text: string;
}

interface QueryInputProps {
  suggestions: Suggestion[];
  loadingSuggestions: boolean;
  onRefreshSuggestions: () => void;
  onSend: (query: string) => void;
  disabled: boolean;
}

const QueryInput = ({
  suggestions,
  loadingSuggestions,
  onRefreshSuggestions,
  onSend,
  disabled,
}: QueryInputProps) => {
  const styles = useStyles();
  const [query, setQuery] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (!query.trim() || disabled) return;
    onSend(query.trim());
    setQuery("");
  };

  return (
    <div className={styles.root}>
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
          onClick={onRefreshSuggestions}
          disabled={loadingSuggestions}
          title="Generate new suggestions"
        >
          {loadingSuggestions ? "Generating…" : "Suggest with Foundry"}
          <LightbulbFilament16Regular />
        </button>
        <button
          className={styles.suggestionBtn}
          onClick={() => window.open(BOOK_URL, "_blank")}
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
          disabled={!query.trim() || disabled}
          title="Send"
        >
          <Send16Regular />
        </button>
      </div>
    </div>
  );
};

export default QueryInput;
