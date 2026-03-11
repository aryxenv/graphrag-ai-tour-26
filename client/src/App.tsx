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
