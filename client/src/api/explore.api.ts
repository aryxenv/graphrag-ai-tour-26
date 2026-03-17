import { API_BASE } from "../constants";
import type { GraphData } from "../types";

/** Fetch the full pre-built knowledge graph for 3D visualization. */
export async function fetchExploreGraph(): Promise<GraphData> {
  const res = await fetch(`${API_BASE}/graph/explore`);
  if (!res.ok) throw new Error(`Graph fetch failed (${res.status})`);
  return res.json();
}
