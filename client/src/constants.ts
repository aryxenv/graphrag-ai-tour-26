import type { TabValue } from "./types";

export const API_BASE =
  import.meta.env.VITE_API_BASE ?? "http://localhost:8000/api";

export const TABS: { value: TabValue; label: string }[] = [
  { value: "ask", label: "Ask" },
  { value: "explore", label: "Explore" },
  { value: "build", label: "Build" },
];
