import { makeStyles, Spinner, Tooltip } from "@fluentui/react-components";
import { QuestionCircle12Regular } from "@fluentui/react-icons";
import type { EvalScores } from "../../api";
import FoundryLogo from "./FoundryLogo";

const useStyles = makeStyles({
  badge: {
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
  icon: {
    display: "inline-flex",
    opacity: 0.6,
    fontSize: "10px",
  },
  spinner: {
    display: "inline-flex",
  },
});

interface EvalBadgeProps {
  scores: EvalScores | null;
  isEvaluating: boolean;
}

const EvalBadge = ({ scores, isEvaluating }: EvalBadgeProps) => {
  const styles = useStyles();

  if (isEvaluating) {
    return (
      <span className={styles.badge}>
        <Spinner className={styles.spinner} size="extra-tiny" />
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
        <FoundryLogo size={12} />
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
      <span className={styles.badge}>
        {scores.overall}%
        <span className={styles.icon}>
          <QuestionCircle12Regular />
        </span>
      </span>
    </Tooltip>
  );
};

export default EvalBadge;
