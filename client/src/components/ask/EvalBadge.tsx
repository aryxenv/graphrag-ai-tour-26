import { makeStyles, Spinner, Tooltip } from "@fluentui/react-components";
import { QuestionCircle12Regular } from "@fluentui/react-icons";
import type { EvalScores, FullEvalScores } from "../../api";
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
  pendingRow: {
    opacity: 0.5,
    fontStyle: "italic",
  },
});

interface EvalBadgeProps {
  scores: EvalScores | null;
  fullScores: FullEvalScores | null;
  isEvaluating: boolean;
  isFullEvaluating: boolean;
}

function computeOverall(
  scores: EvalScores | null,
  fullScores: FullEvalScores | null,
): number | null {
  const vals: number[] = [];
  if (scores) {
    vals.push(scores.relevance, scores.coherence);
  }
  if (fullScores) {
    vals.push(
      fullScores.groundedness,
      fullScores.similarity,
      fullScores.retrieval,
    );
  }
  if (vals.length === 0) return null;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

const EvalBadge = ({
  scores,
  fullScores,
  isEvaluating,
  isFullEvaluating,
}: EvalBadgeProps) => {
  const styles = useStyles();

  if (isEvaluating && !scores) {
    return (
      <span className={styles.badge}>
        <Spinner className={styles.spinner} size="extra-tiny" />
      </span>
    );
  }

  if (!scores) return null;

  const overall = computeOverall(scores, fullScores);
  const pendingLabel = isFullEvaluating ? " (loading...)" : " (pending)";

  const tooltipContent = (
    <div style={{ fontSize: "12px", lineHeight: "1.6" }}>
      <div>Relevance: {scores.relevance}%</div>
      <div>Coherence: {scores.coherence}%</div>
      {fullScores ? (
        <>
          <div>Groundedness: {fullScores.groundedness}%</div>
          <div>Similarity: {fullScores.similarity}%</div>
          <div>Retrieval: {fullScores.retrieval}%</div>
        </>
      ) : (
        <div className={styles.pendingRow}>
          Groundedness / Similarity / Retrieval{pendingLabel}
        </div>
      )}
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
        {overall != null ? `${overall}%` : "..."}
        {isFullEvaluating && (
          <Spinner className={styles.spinner} size="extra-tiny" />
        )}
        <span className={styles.icon}>
          <QuestionCircle12Regular />
        </span>
      </span>
    </Tooltip>
  );
};

export default EvalBadge;
