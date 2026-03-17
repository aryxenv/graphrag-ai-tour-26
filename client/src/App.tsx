import {
  makeStyles,
  Toast,
  Toaster,
  ToastTitle,
  useId,
  useToastController,
} from "@fluentui/react-components";
import {
  CheckmarkCircle20Filled,
  DismissCircle20Filled,
} from "@fluentui/react-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import Header from "./components/Header";
import Ask from "./components/tabs/Ask";
import Build from "./components/tabs/Build";
import Explore from "./components/tabs/Explore";
import { TABS } from "./constants";
import type { TabValue } from "./types";

const TAB_VALUES = new Set<string>(TABS.map((t) => t.value));

function getTabFromHash(): TabValue {
  const hash = window.location.hash.replace("#", "");
  return TAB_VALUES.has(hash) ? (hash as TabValue) : "ask";
}
const TAB_COMPONENTS: Record<TabValue, React.ComponentType> = {
  ask: Ask,
  explore: Explore,
  build: Build,
};

const useStyles = makeStyles({
  root: {
    minHeight: "100vh",
    backgroundColor: "#151515",
    position: "relative",
    overflow: "hidden",
  },
  glow: {
    position: "fixed",
    bottom: "-120px",
    left: "50%",
    transform: "translateX(-50%)",
    width: "100%",
    height: "400px",
    background:
      "linear-gradient(to bottom, rgba(123, 83, 230, 0) 0%, rgba(109, 65, 230, 0.2) 100%)",
    pointerEvents: "none",
    zIndex: 0,
  },
  content: {
    margin: "0 auto",
    position: "relative",
  },
  panel: {
    transition: "opacity 0.25s ease",
  },
  panelVisible: {
    opacity: 1,
  },
  panelHidden: {
    opacity: 0,
  },
});

const App = () => {
  const [activeTab, setActiveTab] = useState<TabValue>(getTabFromHash);
  const [displayedTab, setDisplayedTab] = useState<TabValue>(getTabFromHash);
  const [visible, setVisible] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const styles = useStyles();
  const toasterId = useId("app-toaster");
  const { dispatchToast } = useToastController(toasterId);

  const showToast = useCallback(
    (message: string, intent: "success" | "error" = "success") => {
      dispatchToast(
        <Toast>
          <ToastTitle
            media={
              intent === "success" ? (
                <CheckmarkCircle20Filled style={{ color: "#4caf50" }} />
              ) : (
                <DismissCircle20Filled style={{ color: "#f44336" }} />
              )
            }
          >
            {message}
          </ToastTitle>
        </Toast>,
        { intent, timeout: 3000 },
      );
    },
    [dispatchToast],
  );

  // Sync hash → state on browser back/forward
  useEffect(() => {
    const onHashChange = () => setActiveTab(getTabFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  // Sync state → hash on tab change
  const handleTabChange = useCallback((tab: TabValue) => {
    setActiveTab(tab);
    window.location.hash = tab;
  }, []);

  useEffect(() => {
    if (activeTab === displayedTab) return;

    // Fade out
    setVisible(false);

    timeoutRef.current = setTimeout(() => {
      // Swap content, then fade in
      setDisplayedTab(activeTab);
      requestAnimationFrame(() => setVisible(true));
    }, 200);

    return () => clearTimeout(timeoutRef.current);
  }, [activeTab, displayedTab]);

  const ActiveComponent = TAB_COMPONENTS[displayedTab];

  return (
    <div className={styles.root}>
      <Toaster toasterId={toasterId} position="bottom-end" />
      <div className={styles.glow} />
      <Header
        activeTab={activeTab}
        onTabChange={handleTabChange}
        showToast={showToast}
      />

      <main className={styles.content}>
        <div
          className={`${styles.panel} ${visible ? styles.panelVisible : styles.panelHidden}`}
        >
          <ActiveComponent />
        </div>
      </main>
    </div>
  );
};

export default App;
