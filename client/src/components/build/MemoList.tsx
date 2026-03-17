import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  Body1,
  Button,
  Caption1,
  makeStyles,
  Spinner,
} from "@fluentui/react-components";
import type { Memo } from "../../types";
import FoundryLogo from "../ask/FoundryLogo";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  sectionLabel: {
    fontSize: "11px",
    color: "rgba(255,255,255,0.45)",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    fontWeight: 600,
  },
  accordionItem: {
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: "8px",
    border: "1px solid rgba(255,255,255,0.06)",
    marginBottom: "4px",
  },
  memoHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  memoDate: {
    fontSize: "11px",
    color: "rgba(255,255,255,0.35)",
  },
  memoContent: {
    fontSize: "13px",
    lineHeight: "20px",
    color: "rgba(255,255,255,0.7)",
    whiteSpace: "pre-wrap",
    maxHeight: "200px",
    overflowY: "auto",
    marginBottom: "12px",
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: "4px",
  },
});

interface Props {
  memos: Memo[];
  onIndex: () => void;
  isIndexing: boolean;
  disabled?: boolean;
}

const MemoList = ({ memos, onIndex, isIndexing, disabled }: Props) => {
  const styles = useStyles();

  return (
    <div className={styles.root}>
      <span className={styles.sectionLabel}>
        Generated Memos ({memos.length})
      </span>

      <Accordion collapsible>
        {memos.map((memo) => (
          <AccordionItem key={memo.id} value={`memo-${memo.id}`}>
            <AccordionHeader className={styles.accordionItem}>
              <div className={styles.memoHeader}>
                <Body1>{memo.title}</Body1>
                <Caption1 className={styles.memoDate}>{memo.date}</Caption1>
              </div>
            </AccordionHeader>
            <AccordionPanel>
              <div className={styles.memoContent}>{memo.content}</div>
            </AccordionPanel>
          </AccordionItem>
        ))}
      </Accordion>

      <div className={styles.actions}>
        <Button
          appearance="primary"
          size="medium"
          onClick={onIndex}
          disabled={disabled || isIndexing}
          icon={isIndexing ? <Spinner size="tiny" /> : <FoundryLogo size={16} />}
        >
          {isIndexing ? "Indexing…" : "Index with GraphRAG"}
        </Button>
      </div>
    </div>
  );
};

export default MemoList;
