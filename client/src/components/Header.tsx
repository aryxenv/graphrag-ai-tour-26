import {
  Button,
  makeStyles,
  mergeClasses,
  Popover,
  PopoverSurface,
  PopoverTrigger,
  Textarea,
  tokens,
} from "@fluentui/react-components";
import {
  ChatMultiple20Regular,
  Emoji20Regular,
  Globe20Regular,
  Wrench20Regular,
} from "@fluentui/react-icons";
import { useState } from "react";
import type { TabValue } from "../types";

const TABS: { value: TabValue; label: string; icon: React.ReactNode }[] = [
  { value: "ask", label: "Ask", icon: <ChatMultiple20Regular /> },
  { value: "explore", label: "Explore", icon: <Globe20Regular /> },
  { value: "build", label: "Build", icon: <Wrench20Regular /> },
];

const useStyles = makeStyles({
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    height: "48px",
    padding: "0 20px",
    borderBottom: `1px solid rgba(255, 255, 255, 0.08)`,
    backgroundColor: "#151515",
    position: "sticky",
    top: "0",
    zIndex: 100,
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    userSelect: "none",
  },
  logo: {
    width: "16px",
    height: "16px",
  },
  brandText: {
    fontSize: "14px",
    fontWeight: 600,
    color: tokens.colorNeutralForeground1,
    letterSpacing: "-0.2px",
  },
  nav: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    height: "100%",
  },
  tab: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 14px",
    fontSize: "13px",
    fontWeight: 400,
    color: tokens.colorNeutralForeground1,
    opacity: 0.45,
    cursor: "pointer",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "transparent",
    transition: "opacity 0.2s ease, background-color 0.2s ease",
    height: "32px",
    ":hover": {
      opacity: 0.85,
      backgroundColor: "rgba(255, 255, 255, 0.06)",
    },
  },
  tabActive: {
    opacity: 1,
    fontWeight: 600,
  },
  tabIcon: {
    display: "flex",
    alignItems: "center",
    fontSize: "16px",
  },
  divider: {
    width: "1px",
    height: "20px",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    marginLeft: "8px",
    marginRight: "4px",
  },
  iconBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "32px",
    height: "32px",
    border: "none",
    backgroundColor: "transparent",
    color: tokens.colorNeutralForeground1,
    opacity: 0.45,
    cursor: "pointer",
    borderRadius: "6px",
    transition: "opacity 0.2s ease, background-color 0.2s ease",
    ":hover": {
      opacity: 0.85,
      backgroundColor: "rgba(255, 255, 255, 0.06)",
    },
  },
  feedbackSurface: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    width: "260px",
  },
});

interface HeaderProps {
  activeTab: TabValue;
  onTabChange: (tab: TabValue) => void;
}

const Header = ({ activeTab, onTabChange }: HeaderProps) => {
  const styles = useStyles();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedback, setFeedback] = useState("");

  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <svg
          className={styles.logo}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 21 21"
        >
          <path fill="#f35325" d="M0 0h10v10H0z" />
          <path fill="#81bc06" d="M11 0h10v10H11z" />
          <path fill="#05a6f0" d="M0 11h10v10H0z" />
          <path fill="#ffba08" d="M11 11h10v10H11z" />
        </svg>
        <span className={styles.brandText}>GraphRAG · Foundry</span>
      </div>

      <nav className={styles.nav}>
        {TABS.map((tab) => (
          <button
            key={tab.value}
            className={mergeClasses(
              styles.tab,
              activeTab === tab.value && styles.tabActive,
            )}
            onClick={() => onTabChange(tab.value)}
          >
            <span className={styles.tabIcon}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}

        <div className={styles.divider} />

        <Popover
          open={feedbackOpen}
          onOpenChange={(_, data) => setFeedbackOpen(data.open)}
        >
          <PopoverTrigger disableButtonEnhancement>
            <button className={styles.iconBtn} title="Send feedback">
              <Emoji20Regular />
            </button>
          </PopoverTrigger>
          <PopoverSurface>
            <div className={styles.feedbackSurface}>
              <Textarea
                placeholder="Share your feedback..."
                value={feedback}
                onChange={(_, data) => setFeedback(data.value)}
                resize="vertical"
              />
              <Button
                appearance="primary"
                size="small"
                onClick={() => {
                  console.log("[feedback]", feedback);
                  setFeedback("");
                  setFeedbackOpen(false);
                }}
              >
                Submit
              </Button>
            </div>
          </PopoverSurface>
        </Popover>

        <a
          href="https://github.com/microsoft/graphrag"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.iconBtn}
          title="GitHub"
        >
          <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
        </a>
      </nav>
    </header>
  );
};

export default Header;
