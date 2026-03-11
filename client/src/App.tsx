import { makeStyles } from "@fluentui/react-components";
import { useEffect, useRef, useState } from "react";
import Header from "./components/Header";
import Ask from "./components/tabs/Ask";
import Build from "./components/tabs/Build";
import Explore from "./components/tabs/Explore";
import type { TabValue } from "./types";

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
    height: "300px",
    background:
      "linear-gradient(to bottom, rgba(123, 83, 230, 0) 0%, rgba(123, 83, 230, 0.20) 100%)",
    pointerEvents: "none",
    zIndex: 0,
  },
  content: {
    margin: "0 auto",
    padding: "1.5rem",
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

const TABS: Record<TabValue, React.ComponentType> = {
  ask: Ask,
  explore: Explore,
  build: Build,
};

const App = () => {
  const [activeTab, setActiveTab] = useState<TabValue>("ask");
  const [displayedTab, setDisplayedTab] = useState<TabValue>("ask");
  const [visible, setVisible] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const styles = useStyles();

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

  const ActiveComponent = TABS[displayedTab];

  return (
    <div className={styles.root}>
      <div className={styles.glow} />
      <Header activeTab={activeTab} onTabChange={setActiveTab} />

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
