import type React from "react";
import {
  Button,
  makeStyles,
  Slider,
  Spinner,
  tokens,
} from "@fluentui/react-components";
import FoundryLogo from "../ask/FoundryLogo";
import {
  Building24Regular,
  Briefcase24Regular,
  Stethoscope24Regular,
} from "@fluentui/react-icons";
import type { DemoScenario } from "../../types";

const SCENARIOS: {
  value: DemoScenario;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "tech-startup",
    label: "Tech Startup",
    description:
      "Board memos, product updates, funding rounds, and team changes at a fast-growing startup.",
    icon: <Building24Regular />,
  },
  {
    value: "hospital",
    label: "Hospital",
    description:
      "Patient committee minutes, department reports, research updates, and policy changes.",
    icon: <Stethoscope24Regular />,
  },
  {
    value: "law-firm",
    label: "Law Firm",
    description:
      "Case summaries, client briefs, partnership memos, and regulatory updates.",
    icon: <Briefcase24Regular />,
  },
];

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  sectionLabel: {
    fontSize: "11px",
    color: "rgba(255,255,255,0.45)",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    fontWeight: 600,
  },
  cards: {
    display: "flex",
    gap: "10px",
  },
  card: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    padding: "14px",
    borderRadius: "10px",
    border: "1px solid rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.02)",
    cursor: "pointer",
    transition: "border-color 0.15s ease, background-color 0.15s ease",
    ":hover": {
      border: "1px solid rgba(255,255,255,0.18)",
      backgroundColor: "rgba(255,255,255,0.04)",
    },
  },
  cardSelected: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    padding: "14px",
    borderRadius: "10px",
    border: `1px solid ${tokens.colorBrandBackground}`,
    backgroundColor: "rgba(123,83,230,0.08)",
    cursor: "pointer",
  },
  cardIcon: {
    fontSize: "20px",
    color: "rgba(255,255,255,0.7)",
  },
  cardTitle: {
    fontSize: "14px",
    fontWeight: 600,
    color: tokens.colorNeutralForeground1,
  },
  cardDesc: {
    fontSize: "12px",
    lineHeight: "16px",
    color: "rgba(255,255,255,0.5)",
  },
  sliderRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  sliderLabel: {
    fontSize: "13px",
    color: "rgba(255,255,255,0.7)",
    whiteSpace: "nowrap",
  },
  sliderValue: {
    fontSize: "14px",
    fontWeight: 600,
    color: tokens.colorNeutralForeground1,
    minWidth: "24px",
    textAlign: "center",
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
  },
});

interface Props {
  scenario: DemoScenario;
  onScenarioChange: (s: DemoScenario) => void;
  memoCount: number;
  onMemoCountChange: (n: number) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  disabled?: boolean;
}

const ScenarioSelector = ({
  scenario,
  onScenarioChange,
  memoCount,
  onMemoCountChange,
  onGenerate,
  isGenerating,
  disabled,
}: Props) => {
  const styles = useStyles();

  return (
    <div className={styles.root}>
      <span className={styles.sectionLabel}>Scenario</span>
      <div className={styles.cards}>
        {SCENARIOS.map((s) => (
          <div
            key={s.value}
            className={
              scenario === s.value ? styles.cardSelected : styles.card
            }
            onClick={() => !disabled && onScenarioChange(s.value)}
          >
            <span className={styles.cardIcon}>{s.icon}</span>
            <span className={styles.cardTitle}>{s.label}</span>
            <span className={styles.cardDesc}>{s.description}</span>
          </div>
        ))}
      </div>

      <span className={styles.sectionLabel}>Memo Count</span>
      <div className={styles.sliderRow}>
        <span className={styles.sliderLabel}>Documents</span>
        <Slider
          min={10}
          max={15}
          step={1}
          value={memoCount}
          onChange={(_, data) => onMemoCountChange(data.value)}
          disabled={disabled || isGenerating}
          style={{ flex: 1 }}
        />
        <span className={styles.sliderValue}>{memoCount}</span>
      </div>

      <div className={styles.actions}>
        <Button
          appearance="primary"
          size="medium"
          onClick={onGenerate}
          disabled={disabled}
          icon={isGenerating ? <Spinner size="tiny" /> : <FoundryLogo size={16} />}
        >
          {isGenerating ? "Generating…" : "Generate Memos"}</Button>
      </div>
    </div>
  );
};

export default ScenarioSelector;
