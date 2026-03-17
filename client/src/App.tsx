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
    height: "calc(100vh - 48px)",
    overflow: "hidden",
  },
  tabPanel: {
    position: "absolute",
    top: "0",
    left: "0",
    right: "0",
    bottom: "0",
    transition: "opacity 0.2s ease",
  },
});

const App = () => {
  const [activeTab, setActiveTab] = useState<TabValue>(getTabFromHash);
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

  const prevTabRef = useRef(activeTab);

  // Trigger window resize when switching to explore tab so Three.js recalculates canvas dimensions
  useEffect(() => {
    if (activeTab === "explore" && prevTabRef.current !== "explore") {
      requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
    }
    prevTabRef.current = activeTab;
  }, [activeTab]);

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
        {TABS.map((tab) => {
          const Component = TAB_COMPONENTS[tab.value];
          const isActive = activeTab === tab.value;
          return (
            <div
              key={tab.value}
              className={styles.tabPanel}
              style={{
                opacity: isActive ? 1 : 0,
                visibility: isActive ? "visible" : "hidden",
                zIndex: isActive ? 1 : 0,
                pointerEvents: isActive ? "auto" : "none",
              }}
            >
              <Component />
            </div>
          );
        })}
      </main>
    </div>
  );
};

export default App;
