import { makeStyles, Spinner, tokens } from "@fluentui/react-components";
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

interface QueryPanelProps {
  state: StreamState;
  spinnerLabel: string;
  poweredByLogo: string;
  poweredByLabel: string;
}

const QueryPanel = forwardRef<HTMLDivElement, QueryPanelProps>(
  ({ state, spinnerLabel, poweredByLogo, poweredByLabel }, ref) => {
    const styles = useStyles();

    let content: React.ReactNode;
    if (state.error) {
      content = <div className={styles.errorState}>{state.error}</div>;
    } else if (state.text) {
      content = <Markdown remarkPlugins={[remarkGfm]}>{state.text}</Markdown>;
    } else if (state.isStreaming) {
      content = <Spinner size="small" label={spinnerLabel} />;
    } else {
      content = (
        <div className={styles.emptyState}>Ask a question to compare</div>
      );
    }

    return (
      <div className={styles.panel} ref={ref}>
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
