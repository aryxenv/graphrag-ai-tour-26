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
import { Emoji20Regular } from "@fluentui/react-icons";
import { useState } from "react";
import graphragLogo from "../assets/graphrag.png";
import { API_BASE, TABS } from "../constants";
import type { TabValue } from "../types";

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
    gap: "8px",
    userSelect: "none",
  },
  brandIcon: {
    height: "20px",
    width: "auto",
    flexShrink: 0,
  },
  brandX: {
    fontSize: "13px",
    opacity: 0.35,
    margin: "0 8px",
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
    fontSize: "14px",
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
  showToast: (message: string, intent?: "success" | "error") => void;
}

const Header = ({ activeTab, onTabChange, showToast }: HeaderProps) => {
  const styles = useStyles();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedback, setFeedback] = useState("");

  const submitFeedback = () => {
    const text = feedback.trim();
    if (!text) return;
    setFeedback("");
    setFeedbackOpen(false);
    fetch(`${API_BASE}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    })
      .then((res) => {
        if (res.ok) {
          showToast("Feedback sent!");
        } else {
          showToast(`Feedback failed (${res.status})`, "error");
        }
      })
      .catch((err) => {
        showToast(`Feedback error: ${err.message}`, "error");
      });
  };

  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <svg
          className={styles.brandIcon}
          height="20"
          viewBox="0 0 32 32"
          width="20"
          xmlns="http://www.w3.org/2000/svg"
          role="presentation"
        >
          <path
            clipRule="evenodd"
            d="M20.4052 2C20.3713 2.04989 20.3403 2.10356 20.3119 2.15906C20.1753 2.42519 20.0629 2.80022 19.9685 3.2499C19.7794 4.15205 19.6545 5.3972 19.5714 6.7798C19.405 9.54716 19.405 12.8938 19.405 15.213V24.4338L19.4049 24.4698C19.3854 27.5153 16.8918 29.9806 13.8112 29.9999L13.7749 30H3.57642C3.18062 30 2.9073 29.6141 3.04346 29.2496C4.56004 25.1917 6.6982 19.4832 8.50404 14.6901C9.40697 12.2934 10.2268 10.1257 10.8442 8.50763C11.4636 6.88453 11.876 5.82419 11.9665 5.63239C12.2132 5.10978 12.6147 4.1951 13.1873 3.40856C13.7637 2.61659 14.4808 2.00001 15.3445 2H20.4052ZM29.2769 10.1842C29.4966 10.1842 29.6747 10.3603 29.6747 10.5775V17.6706L29.6745 17.7148C29.6504 19.5836 28.1106 21.0913 26.2147 21.0913H21.668C21.6778 21.0796 21.6872 21.0676 21.6966 21.0552C21.8605 20.8367 21.9531 20.526 21.9587 20.134L21.9589 20.0958V14.0817C21.9589 11.9291 23.7238 10.1842 25.9011 10.1842H29.2769ZM21.2532 2.14424C21.5631 2.14425 21.8986 2.38926 22.2468 2.88783C22.5881 3.37681 22.9111 4.06635 23.2065 4.85721C23.7783 6.3875 24.2354 8.26487 24.5265 9.71512C22.6354 10.2861 21.2595 12.0248 21.2595 14.0817V20.0782L21.2594 20.0921C21.2575 20.2355 21.2263 20.4039 21.1685 20.5329C21.1042 20.6758 21.0375 20.7121 20.9938 20.7121C20.9575 20.7121 20.8869 20.6826 20.7852 20.5652C20.6894 20.4549 20.5915 20.2961 20.4975 20.1117C20.3151 19.7539 20.1614 19.3273 20.0739 19.0482V15.213C20.0739 8.68733 20.3039 5.39271 20.5834 3.73209C20.7239 2.89797 20.8739 2.49601 20.9998 2.30459C21.0605 2.21243 21.1101 2.17748 21.1426 2.16241C21.1755 2.14714 21.207 2.14424 21.2532 2.14424Z"
            fill="currentColor"
            fillRule="evenodd"
          />
        </svg>
        <span className={styles.brandText}>Foundry</span>
        <span className={styles.brandX}>×</span>
        <img src={graphragLogo} alt="GraphRAG" className={styles.brandIcon} />
        <span className={styles.brandText}>GraphRAG</span>
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
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submitFeedback();
                  }
                }}
              />
              <Button
                appearance="primary"
                size="small"
                onClick={submitFeedback}
              >
                Submit
              </Button>
            </div>
          </PopoverSurface>
        </Popover>

        <a
          href="https://github.com/aryxenv/graphrag-ai-tour-26/"
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
