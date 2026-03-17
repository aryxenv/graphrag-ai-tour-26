import { Caption1, makeStyles } from "@fluentui/react-components";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ForceGraph3D, {
  type ForceGraphMethods,
  type NodeObject,
  type LinkObject,
} from "react-force-graph-3d";
import type { GraphData, GraphNode } from "../../types";

const TYPE_COLORS: Record<string, string> = {
  person: "#6dcff6",
  organization: "#f6a623",
  event: "#e05dff",
  geo: "#7ed87e",
  project: "#ff6b6b",
  concept: "#c4a8ff",
};

const LINK_COLOR = "rgba(255,255,255,0.12)";

const useStyles = makeStyles({
  root: {
    position: "relative",
    width: "100%",
    height: "100%",
    overflow: "hidden",
  },
  stats: {
    position: "absolute",
    bottom: "8px",
    left: "10px",
    display: "flex",
    gap: "12px",
    zIndex: 10,
    pointerEvents: "none",
  },
  tooltip: {
    position: "absolute",
    pointerEvents: "none",
    zIndex: 20,
    padding: "6px 10px",
    borderRadius: "6px",
    backgroundColor: "rgba(30,30,30,0.92)",
    border: "1px solid rgba(255,255,255,0.1)",
    fontSize: "12px",
    color: "#fff",
    maxWidth: "300px",
    whiteSpace: "normal",
    wordBreak: "break-word",
    lineHeight: "1.4",
  },
  empty: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    width: "100%",
  },
});

interface Props {
  data: GraphData | null;
}

const BuildGraph = ({ data }: Props) => {
  const styles = useStyles();
  const fgRef = useRef<ForceGraphMethods<NodeObject> | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverTooltip, setHoverTooltip] = useState<string | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const mousePos = useRef({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Track container size and re-fit graph when it changes
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        setDimensions({ width, height });
        // Re-fit when container becomes visible (tab switch)
        setTimeout(() => fgRef.current?.zoomToFit(400, 40), 100);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const nodeMap = useMemo(() => {
    const map = new Map<string, GraphNode>();
    data?.nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [data]);

  const maxDegree = useMemo(() => {
    if (!data) return 1;
    return Math.max(...data.nodes.map((n) => n.degree), 1);
  }, [data]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mousePos.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    if (tooltipRef.current) {
      tooltipRef.current.style.left = `${mousePos.current.x + 14}px`;
      tooltipRef.current.style.top = `${mousePos.current.y + 14}px`;
    }
  }, []);

  useEffect(() => {
    if (hoverTooltip && tooltipRef.current) {
      tooltipRef.current.style.left = `${mousePos.current.x + 14}px`;
      tooltipRef.current.style.top = `${mousePos.current.y + 14}px`;
    }
  }, [hoverTooltip]);

  const handleNodeHover = useCallback(
    (node: NodeObject | null, prevNode: NodeObject | null) => {
      const el = fgRef.current?.renderer()?.domElement;
      if (el) el.style.cursor = node ? "pointer" : "default";
      if (prevNode && !node) {
        setHoverTooltip(null);
        return;
      }
      if (node) {
        const gn = nodeMap.get(node.id as string);
        if (gn) setHoverTooltip(`${gn.name} (${gn.type})`);
      }
    },
    [nodeMap],
  );

  const handleLinkHover = useCallback((link: LinkObject | null) => {
    const el = fgRef.current?.renderer()?.domElement;
    if (el) el.style.cursor = link ? "pointer" : "default";
    if (!link) {
      setHoverTooltip(null);
      return;
    }
    const desc = (link as LinkObject & { description?: string }).description;
    if (desc) setHoverTooltip(desc);
  }, []);

  const nodeColor = useCallback(
    (node: NodeObject) => {
      const gn = nodeMap.get(node.id as string);
      return TYPE_COLORS[gn?.type ?? "concept"] ?? TYPE_COLORS.concept;
    },
    [nodeMap],
  );

  const nodeSize = useCallback(
    (node: NodeObject) => {
      const gn = nodeMap.get(node.id as string);
      if (!gn) return 2;
      return 2 + (gn.degree / maxDegree) * 10;
    },
    [nodeMap, maxDegree],
  );

  if (!data) {
    return (
      <div className={styles.empty}>
        <Caption1 style={{ color: "rgba(255,255,255,0.35)" }}>
          Knowledge graph will appear here after indexing
        </Caption1>
      </div>
    );
  }

  return (
    <div className={styles.root} ref={containerRef} onMouseMove={handleMouseMove}>
      <ForceGraph3D
        ref={fgRef}
        graphData={data}
        width={dimensions.width || undefined}
        height={dimensions.height || undefined}
        backgroundColor="#151515"
        nodeColor={nodeColor}
        nodeVal={nodeSize}
        nodeLabel=""
        linkColor={() => LINK_COLOR}
        linkWidth={0.3}
        linkOpacity={0.6}
        onNodeHover={handleNodeHover}
        onLinkHover={handleLinkHover}
        warmupTicks={80}
        cooldownTime={3000}
        onEngineStop={() => {
          const controls = fgRef.current?.controls() as
            | { enableDamping: boolean; dampingFactor: number }
            | undefined;
          if (controls) {
            controls.enableDamping = true;
            controls.dampingFactor = 0.06;
          }
          // Zoom out to fit all nodes in view
          fgRef.current?.zoomToFit(400, 40);
        }}
      />

      {hoverTooltip && (
        <div ref={tooltipRef} className={styles.tooltip}>
          {hoverTooltip}
        </div>
      )}

      <div className={styles.stats}>
        <Caption1 style={{ color: "rgba(255,255,255,0.45)" }}>
          {data.nodes.length} entities · {data.links.length} relationships
        </Caption1>
      </div>
    </div>
  );
};

export default BuildGraph;
