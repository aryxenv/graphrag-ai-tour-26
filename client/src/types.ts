export interface GraphNode {
  id: string;
  name: string;
  type: "person" | "organization" | "event" | "geo" | "project" | "concept";
  description?: string;
  community?: number;
  degree: number;
  frequency: number;
  textUnits: string[];
}

export interface GraphLink {
  source: string;
  target: string;
  description?: string;
  weight: number;
}

export interface Community {
  id: number;
  title: string;
  summary: string;
  level: number;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
  communities: Community[];
}

export interface QueryResult {
  answer: string;
  citations?: string[];
}

export interface GeneratedQuestion {
  question: string;
  type: "cross-document" | "global" | "hidden" | "timeline";
}

export interface Memo {
  id: number;
  title: string;
  content: string;
  date: string;
}

export type DemoScenario = "tech-startup" | "hospital" | "law-firm";

export type BuildStep =
  | "configure"
  | "generating"
  | "memos"
  | "indexing"
  | "graph"
  | "ready";

export interface BuildSession {
  sessionId: string;
  scenario: DemoScenario;
  memos: Memo[];
  graph: GraphData | null;
  step: BuildStep;
}

export type SearchMethod = "local" | "global";

export interface DemoPrompt {
  text: string;
  searchMethod: SearchMethod;
}

export type TabValue = "ask" | "explore" | "build";
