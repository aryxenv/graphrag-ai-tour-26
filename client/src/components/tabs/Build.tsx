import {
  Button,
  Caption1,
  makeStyles,
  ProgressBar,
  Spinner,
  tokens,
} from "@fluentui/react-components";
import { ArrowReset20Regular, Info12Regular } from "@fluentui/react-icons";
import { useBuildWizard } from "../../hooks";
import BuildGraph from "../build/BuildGraph";
import BuildQueryPanel from "../build/BuildQueryPanel";
import MemoList from "../build/MemoList";
import ScenarioSelector from "../build/ScenarioSelector";

const useStyles = makeStyles({
  root: {
    display: "flex",
    height: "calc(100vh - 48px)",
    overflow: "hidden",
  },
  /* Left panel — wizard */
  wizard: {
    width: "50%",
    display: "flex",
    flexDirection: "column",
    overflowY: "auto",
    borderRight: "1px solid rgba(255,255,255,0.08)",
  },
  wizardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 20px 0 20px",
    flexShrink: 0,
  },
  wizardTitle: {
    fontSize: "16px",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.8px",
    color: tokens.colorNeutralForeground1,
  },
  wizardBody: {
    padding: "16px 20px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  divider: {
    height: "1px",
    backgroundColor: "rgba(255,255,255,0.08)",
    margin: "12px 0",
    flexShrink: 0,
  },
  /* Right panels */
  rightColumn: {
    width: "50%",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  graphPanel: {
    height: "30%",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    flexShrink: 0,
    position: "relative",
    overflow: "hidden",
  },
  queryPanel: {
    height: "70%",
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
  },
  /* Indexing progress */
  progressSection: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  sectionLabel: {
    fontSize: "11px",
    color: "rgba(255,255,255,0.45)",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    fontWeight: 600,
  },
  progressInfo: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  progressText: {
    fontSize: "12px",
    color: "rgba(255,255,255,0.6)",
  },
  centered: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    width: "100%",
  },
  infoText: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "11px",
    color: tokens.colorNeutralForeground4,
    marginTop: "4px",
  },
});

const Build = () => {
  const styles = useStyles();
  const {
    scenario,
    setScenario,
    memoCount,
    setMemoCount,
    step,
    generate,
    isGenerating,
    memos,
    index,
    isIndexing,
    indexProgress,
    graph,
    questions,
    isLoadingQuestions,
    refreshQuestions,
    stream,
    lastQuery,
    sendQuery,
    stopQuery,
    isStreaming,
    buildEval,
    isEvaluating,
    reset,
  } = useBuildWizard();

  const wizardDone = step === "graph" || step === "ready";
  const showMemos =
    step === "memos" ||
    step === "indexing" ||
    step === "graph" ||
    step === "ready";
  const showProgress = step === "indexing";
  const showProgressDone = wizardDone;

  return (
    <div className={styles.root}>
      {/* ─── Left: Wizard ─── */}
      <div className={styles.wizard}>
        <div className={styles.wizardHeader}>
          <span className={styles.wizardTitle}>Build</span>
          {step !== "configure" && (
            <Button
              appearance="subtle"
              size="small"
              icon={<ArrowReset20Regular />}
              onClick={reset}
            >
              Restart
            </Button>
          )}
        </div>

        <div className={styles.wizardBody}>
          {/* Step 1: Scenario selection */}
          <ScenarioSelector
            scenario={scenario}
            onScenarioChange={setScenario}
            memoCount={memoCount}
            onMemoCountChange={setMemoCount}
            onGenerate={generate}
            isGenerating={isGenerating}
            disabled={step !== "configure" && step !== "generating"}
          />

          {/* Generating progress */}
          {step === "generating" && (
            <>
              <div className={styles.divider} />
              <div className={styles.progressSection}>
                <span className={styles.sectionLabel}>Generating</span>
                <ProgressBar />
                <div className={styles.progressInfo}>
                  <Spinner size="extra-tiny" />
                  <span className={styles.progressText}>
                    Generating {memoCount} interconnected memos…
                  </span>
                </div>
                <div className={styles.infoText}>
                  <Info12Regular /> Generating memos may take up to 30 seconds
                </div>
              </div>
            </>
          )}

          {/* Step 2: Memos */}
          {showMemos && memos.length > 0 && (
            <>
              <div className={styles.divider} />
              <MemoList
                memos={memos}
                onIndex={index}
                isIndexing={isIndexing}
                disabled={wizardDone}
              />
            </>
          )}

          {/* Step 3: Indexing progress */}
          {showProgress && (
            <>
              <div className={styles.divider} />
              <div className={styles.progressSection}>
                <span className={styles.sectionLabel}>Indexing</span>
                <ProgressBar />
                {indexProgress && (
                  <div className={styles.progressInfo}>
                    <Spinner size="extra-tiny" />
                    <span className={styles.progressText}>
                      {indexProgress.workflow}: {indexProgress.status}
                      {indexProgress.total > 0 &&
                        ` (${indexProgress.completed}/${indexProgress.total})`}
                    </span>
                  </div>
                )}
                <div className={styles.infoText}>
                  <Info12Regular /> Indexing may take up to 5 minutes
                </div>
              </div>
            </>
          )}

          {/* Step 4: Indexing complete */}
          {showProgressDone && graph && (
            <>
              <div className={styles.divider} />
              <div className={styles.progressSection}>
                <span className={styles.sectionLabel}>Indexing Complete</span>
                <Caption1 style={{ color: "rgba(255,255,255,0.6)" }}>
                  Extracted {graph.nodes.length} entities and{" "}
                  {graph.links.length} relationships across{" "}
                  {graph.communities.length} communities.
                </Caption1>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ─── Right: Graph + Query ─── */}
      <div className={styles.rightColumn}>
        <div className={styles.graphPanel}>
          <BuildGraph data={graph} />
        </div>
        <div className={styles.queryPanel}>
          <BuildQueryPanel
            stream={stream}
            lastQuery={lastQuery}
            questions={questions}
            isLoadingQuestions={isLoadingQuestions}
            onRefreshQuestions={refreshQuestions}
            onSend={sendQuery}
            onStop={stopQuery}
            isStreaming={isStreaming}
            evalScores={buildEval}
            isEvaluating={isEvaluating}
            disabled={!wizardDone}
          />
        </div>
      </div>
    </div>
  );
};

export default Build;
