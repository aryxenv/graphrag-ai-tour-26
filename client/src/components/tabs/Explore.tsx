import {
  Body1,
  Caption1,
  DrawerBody,
  DrawerHeader,
  DrawerHeaderTitle,
  InlineDrawer,
  makeStyles,
  Spinner,
  Subtitle2,
  tokens,
} from "@fluentui/react-components";
import {
  ArrowUpRight12Regular,
  Dismiss24Regular,
} from "@fluentui/react-icons";
import { useCallback, useMemo, useRef, useState } from "react";
import ForceGraph3D, {
  type ForceGraphMethods,
  type NodeObject,
  type LinkObject,
} from "react-force-graph-3d";
import SpriteText from "three-spritetext";
import { BOOK_URL } from "../../constants";
import { useExploreGraph } from "../../hooks";
import type { Community, GraphLink, GraphNode } from "../../types";

/* ── colour palette per entity type ── */
const TYPE_COLORS: Record<string, string> = {
  person: "#6dcff6",
  organization: "#f6a623",
  event: "#e05dff",
  geo: "#7ed87e",
  project: "#ff6b6b",
  concept: "#c4a8ff",
};
const LINK_COLOR = "rgba(255,255,255,0.12)";
const LINK_HIGHLIGHT_COLOR = "#c4a8ff";
const LABEL_DEGREE_THRESHOLD = 12;

type SelectedItem =
  | { kind: "node"; data: GraphNode }
  | { kind: "link"; data: GraphLink };

const useStyles = makeStyles({
  root: {
    display: "flex",
    height: "calc(100vh - 48px)",
    position: "relative",
    overflow: "hidden",
  },
  graphContainer: {
    flex: 1,
    position: "relative",
  },
  drawer: {
    backgroundColor: "#1e1e1e",
    borderLeft: "1px solid rgba(255,255,255,0.08)",
    maxWidth: "380px",
  },
  drawerClose: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "28px",
    height: "28px",
    border: "none",
    backgroundColor: "transparent",
    color: tokens.colorNeutralForeground1,
    opacity: 0.5,
    cursor: "pointer",
    borderRadius: "6px",
    ":hover": {
      opacity: 0.85,
      backgroundColor: "rgba(255,255,255,0.06)",
    },
  },
  typeBadge: {
    display: "inline-block",
    fontSize: "11px",
    fontWeight: 600,
    textTransform: "uppercase",
    padding: "2px 8px",
    borderRadius: "10px",
    letterSpacing: "0.5px",
    marginBottom: "12px",
  },
  statRow: {
    display: "flex",
    gap: "16px",
    marginBottom: "12px",
  },
  stat: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  statLabel: {
    fontSize: "11px",
    color: "rgba(255,255,255,0.45)",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  statValue: {
    fontSize: "16px",
    fontWeight: 600,
  },
  sectionTitle: {
    fontSize: "11px",
    color: "rgba(255,255,255,0.45)",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginTop: "16px",
    marginBottom: "6px",
  },
  textUnit: {
    fontSize: "12px",
    lineHeight: "18px",
    color: "rgba(255,255,255,0.7)",
    padding: "8px",
    borderRadius: "6px",
    backgroundColor: "rgba(255,255,255,0.04)",
    marginBottom: "6px",
    maxHeight: "120px",
    overflowY: "auto",
  },
  centered: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    width: "100%",
  },
  legend: {
    position: "absolute",
    bottom: "16px",
    left: "16px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
    zIndex: 10,
  },
  bookLink: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "11px",
    padding: "4px 10px",
    borderRadius: "14px",
    border: "1px solid rgba(255, 255, 255, 0.12)",
    backgroundColor: "transparent",
    color: "rgba(255, 255, 255, 0.55)",
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "border-color 0.15s ease, background-color 0.15s ease",
    pointerEvents: "auto",
    ":hover": {
      border: "1px solid rgba(255, 255, 255, 0.3)",
      backgroundColor: "rgba(255, 255, 255, 0.04)",
    },
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    fontSize: "11px",
    color: "rgba(255,255,255,0.55)",
    textTransform: "capitalize",
    pointerEvents: "none",
  },
  legendDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
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
    maxWidth: "260px",
    whiteSpace: "nowrap",
  },
});

const Explore = () => {
  const styles = useStyles();
  const { data, isLoading, isError } = useExploreGraph();
  const fgRef = useRef<ForceGraphMethods<NodeObject> | undefined>(undefined);
  const [selected, setSelected] = useState<SelectedItem | null>(null);
  const [hoverTooltip, setHoverTooltip] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);

  // Community lookup
  const communityMap = useMemo(() => {
    const map = new Map<number, Community>();
    data?.communities.forEach((c) => map.set(c.id, c));
    return map;
  }, [data]);

  // Node lookup for link click
  const nodeMap = useMemo(() => {
    const map = new Map<string, GraphNode>();
    data?.nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [data]);

  // Max degree for node sizing
  const maxDegree = useMemo(() => {
    if (!data) return 1;
    return Math.max(...data.nodes.map((n) => n.degree), 1);
  }, [data]);

  const handleNodeClick = useCallback(
    (node: NodeObject) => {
      const gn = nodeMap.get(node.id as string);
      if (gn) setSelected({ kind: "node", data: gn });
    },
    [nodeMap],
  );

  const handleLinkClick = useCallback((link: LinkObject) => {
    const sourceId =
      typeof link.source === "object"
        ? (link.source as NodeObject).id
        : link.source;
    const targetId =
      typeof link.target === "object"
        ? (link.target as NodeObject).id
        : link.target;
    setSelected({
      kind: "link",
      data: {
        source: sourceId as string,
        target: targetId as string,
        description: (link as LinkObject & { description?: string })
          .description,
        weight: (link as LinkObject & { weight: number }).weight,
      },
    });
  }, []);

  const handleNodeHover = useCallback(
    (node: NodeObject | null, prevNode: NodeObject | null) => {
      // Update cursor
      const el = fgRef.current?.renderer()?.domElement;
      if (el) el.style.cursor = node ? "pointer" : "default";

      if (prevNode && !node) {
        setHoverTooltip(null);
        return;
      }
      if (node) {
        const gn = nodeMap.get(node.id as string);
        if (gn) {
          const screen = fgRef.current?.graph2ScreenCoords(
            node.x ?? 0,
            node.y ?? 0,
            node.z ?? 0,
          );
          if (screen) {
            setHoverTooltip({
              text: `${gn.name} (${gn.type})`,
              x: screen.x,
              y: screen.y,
            });
          }
        }
      }
    },
    [nodeMap],
  );

  const handleLinkHover = useCallback(
    (link: LinkObject | null) => {
      const el = fgRef.current?.renderer()?.domElement;
      if (el) el.style.cursor = link ? "pointer" : "default";

      if (!link) {
        setHoverTooltip(null);
        return;
      }
      const desc = (link as LinkObject & { description?: string }).description;
      if (desc) {
        const sourceNode =
          typeof link.source === "object" ? (link.source as NodeObject) : null;
        const targetNode =
          typeof link.target === "object" ? (link.target as NodeObject) : null;
        if (sourceNode && targetNode) {
          const mx = ((sourceNode.x ?? 0) + (targetNode.x ?? 0)) / 2;
          const my = ((sourceNode.y ?? 0) + (targetNode.y ?? 0)) / 2;
          const mz = ((sourceNode.z ?? 0) + (targetNode.z ?? 0)) / 2;
          const screen = fgRef.current?.graph2ScreenCoords(mx, my, mz);
          if (screen) {
            setHoverTooltip({
              text: desc.length > 80 ? desc.slice(0, 80) + "…" : desc,
              x: screen.x,
              y: screen.y,
            });
          }
        }
      }
    },
    [],
  );

  const nodeThreeObject = useCallback(
    (node: NodeObject) => {
      const gn = nodeMap.get(node.id as string);
      if (!gn || gn.degree < LABEL_DEGREE_THRESHOLD) return undefined!;

      const sprite = new SpriteText(gn.name);
      sprite.color = "rgba(255,255,255,0.85)";
      sprite.textHeight = 3;
      sprite.fontFace = "Segoe UI, sans-serif";
      sprite.backgroundColor = "rgba(0,0,0,0.5)";
      sprite.padding = 1.5;
      sprite.borderRadius = 2;
      return sprite;
    },
    [nodeMap],
  );

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
      // Scale between 2 and 12 based on degree
      return 2 + (gn.degree / maxDegree) * 10;
    },
    [nodeMap, maxDegree],
  );

  const linkColor = useCallback(
    (link: LinkObject) => {
      if (!selected || selected.kind !== "node") return LINK_COLOR;
      const sourceId =
        typeof link.source === "object"
          ? (link.source as NodeObject).id
          : link.source;
      const targetId =
        typeof link.target === "object"
          ? (link.target as NodeObject).id
          : link.target;
      if (sourceId === selected.data.id || targetId === selected.data.id)
        return LINK_HIGHLIGHT_COLOR;
      return LINK_COLOR;
    },
    [selected],
  );

  const linkWidth = useCallback(
    (link: LinkObject) => {
      if (!selected || selected.kind !== "node") return 0.3;
      const sourceId =
        typeof link.source === "object"
          ? (link.source as NodeObject).id
          : link.source;
      const targetId =
        typeof link.target === "object"
          ? (link.target as NodeObject).id
          : link.target;
      if (sourceId === selected.data.id || targetId === selected.data.id)
        return 1.5;
      return 0.3;
    },
    [selected],
  );

  if (isLoading) {
    return (
      <div className={styles.centered} style={{ height: "calc(100vh - 48px)" }}>
        <Spinner size="large" label="Loading knowledge graph…" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className={styles.centered} style={{ height: "calc(100vh - 48px)" }}>
        <Body1 style={{ color: "rgba(255,255,255,0.5)" }}>
          Failed to load graph data.
        </Body1>
      </div>
    );
  }

  const drawerOpen = selected !== null;

  return (
    <div className={styles.root}>
      {/* Graph */}
      <div className={styles.graphContainer}>
        <ForceGraph3D
          ref={fgRef}
          graphData={data}
          backgroundColor="#151515"
          nodeColor={nodeColor}
          nodeVal={nodeSize}
          nodeLabel=""
          nodeThreeObject={nodeThreeObject}
          nodeThreeObjectExtend={true}
          linkColor={linkColor}
          linkWidth={linkWidth}
          linkDirectionalParticles={0}
          linkOpacity={0.6}
          onNodeClick={handleNodeClick}
          onLinkClick={handleLinkClick}
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
              controls.dampingFactor = 0.12;
            }
          }}
        />

        {/* Hover tooltip */}
        {hoverTooltip && (
          <div
            className={styles.tooltip}
            style={{
              left: hoverTooltip.x + 12,
              top: hoverTooltip.y - 20,
            }}
          >
            {hoverTooltip.text}
          </div>
        )}

        {/* Legend */}
        <div className={styles.legend}>
          {Object.entries(TYPE_COLORS).map(([type, color]) => (
            <div key={type} className={styles.legendItem}>
              <div
                className={styles.legendDot}
                style={{ backgroundColor: color }}
              />
              {type}
            </div>
          ))}
          <button
            className={styles.bookLink}
            onClick={() => window.open(BOOK_URL, "_blank")}
          >
            Show book
            <ArrowUpRight12Regular />
          </button>
        </div>
      </div>

      {/* Detail panel */}
      <InlineDrawer
        open={drawerOpen}
        position="end"
        className={styles.drawer}
        separator
      >
        <DrawerHeader>
          <DrawerHeaderTitle
            action={
              <button
                className={styles.drawerClose}
                onClick={() => setSelected(null)}
                aria-label="Close"
              >
                <Dismiss24Regular />
              </button>
            }
          >
            {selected?.kind === "node"
              ? selected.data.name
              : "Relationship"}
          </DrawerHeaderTitle>
        </DrawerHeader>
        <DrawerBody>
          {selected?.kind === "node" && (
            <NodeDetail
              node={selected.data}
              community={
                selected.data.community != null
                  ? communityMap.get(selected.data.community)
                  : undefined
              }
              styles={styles}
            />
          )}
          {selected?.kind === "link" && (
            <LinkDetail
              link={selected.data}
              nodeMap={nodeMap}
              styles={styles}
            />
          )}
        </DrawerBody>
      </InlineDrawer>
    </div>
  );
};

/* ── Detail sub-components ── */

function NodeDetail({
  node,
  community,
  styles,
}: {
  node: GraphNode;
  community?: Community;
  styles: ReturnType<typeof useStyles>;
}) {
  const color = TYPE_COLORS[node.type] ?? TYPE_COLORS.concept;
  return (
    <>
      <span
        className={styles.typeBadge}
        style={{ backgroundColor: color + "22", color }}
      >
        {node.type}
      </span>

      {node.description && (
        <Body1
          style={{
            color: "rgba(255,255,255,0.8)",
            marginBottom: "12px",
            display: "block",
          }}
        >
          {node.description}
        </Body1>
      )}

      <div className={styles.statRow}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Degree</span>
          <span className={styles.statValue}>{node.degree}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Frequency</span>
          <span className={styles.statValue}>{node.frequency}</span>
        </div>
      </div>

      {community && (
        <>
          <div className={styles.sectionTitle}>Community</div>
          <Subtitle2 style={{ display: "block", marginBottom: "4px" }}>
            {community.title}
          </Subtitle2>
          <Caption1 style={{ color: "rgba(255,255,255,0.6)" }}>
            {community.summary}
          </Caption1>
        </>
      )}

      {node.textUnits.length > 0 && (
        <>
          <div className={styles.sectionTitle}>
            Source text ({node.textUnits.length})
          </div>
          {node.textUnits.slice(0, 5).map((text, i) => (
            <div key={i} className={styles.textUnit}>
              {text.length > 300 ? text.slice(0, 300) + "…" : text}
            </div>
          ))}
        </>
      )}
    </>
  );
}

function LinkDetail({
  link,
  nodeMap,
  styles,
}: {
  link: GraphLink;
  nodeMap: Map<string, GraphNode>;
  styles: ReturnType<typeof useStyles>;
}) {
  const sourceName = nodeMap.get(link.source)?.name ?? link.source;
  const targetName = nodeMap.get(link.target)?.name ?? link.target;

  return (
    <>
      <Subtitle2 style={{ display: "block", marginBottom: "8px" }}>
        {sourceName} → {targetName}
      </Subtitle2>

      {link.description && (
        <Body1 style={{ color: "rgba(255,255,255,0.8)", display: "block" }}>
          {link.description}
        </Body1>
      )}

      <div className={styles.statRow} style={{ marginTop: "12px" }}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Weight</span>
          <span className={styles.statValue}>{link.weight.toFixed(1)}</span>
        </div>
      </div>
    </>
  );
}

export default Explore;
