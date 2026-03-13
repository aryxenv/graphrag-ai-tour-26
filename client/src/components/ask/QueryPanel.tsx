import { makeStyles, Spinner, tokens } from "@fluentui/react-components";
import { Info12Regular } from "@fluentui/react-icons";
import type React from "react";
import { forwardRef } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { StreamState } from "../../hooks/ask.hooks";
import FoundryLogo from "./FoundryLogo";

const useStyles = makeStyles({
  panel: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    padding: "0 24px 12px 24px",
    overflowY: "auto",
  },
  content: {
    flex: 1,
    fontSize: "14px",
    lineHeight: "1.6",
    color: tokens.colorNeutralForeground2,
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
  estimatedTime: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "4px",
    fontSize: "11px",
    color: tokens.colorNeutralForeground4,
    marginTop: "12px",
  },
});

interface QueryPanelProps {
  state: StreamState;
  question?: string;
  spinnerLabel: string;
  estimatedTime?: string;
  poweredByLogo: string;
  poweredByLabel: string;
}

const QueryPanel = forwardRef<HTMLDivElement, QueryPanelProps>(
  (
    {
      state,
      question,
      spinnerLabel,
      estimatedTime,
      poweredByLogo,
      poweredByLabel,
    },
    ref,
  ) => {
    const styles = useStyles();

    let content: React.ReactNode;
    if (state.error) {
      content = <div className={styles.errorState}>{state.error}</div>;
    } else if (state.text) {
      content = <Markdown remarkPlugins={[remarkGfm]}>{state.text}</Markdown>;
    } else if (state.isStreaming) {
      content = (
        <>
          <Spinner size="small" label={spinnerLabel} />
          {estimatedTime && (
            <div className={styles.estimatedTime}>
              <Info12Regular /> {estimatedTime}
            </div>
          )}
        </>
      );
    } else {
      content = (
        <div className={styles.emptyState}>Ask a question to compare</div>
      );
    }

    return (
      <div className={styles.panel} ref={ref}>
        {question && <div className={styles.question}>{question}</div>}
        <div className={styles.content}>{content}</div>
        <div className={styles.poweredBy}>
          <span className={styles.poweredByItem}>
            <img src={poweredByLogo} alt="" className={styles.poweredByLogo} />
            {poweredByLabel}
          </span>
          <span className={styles.poweredByItem}>
            <FoundryLogo />
            Foundry Models
          </span>
        </div>
      </div>
    );
  },
);

QueryPanel.displayName = "QueryPanel";

export default QueryPanel;
