export interface GraphNode {
  id: string;
  name: string;
  type: "person" | "organization" | "event" | "geo" | "project" | "concept";
  description?: string;
  community?: number;
}

export interface GraphLink {
  source: string;
  target: string;
  label?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
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

export type TabValue = "ask" | "explore" | "build";
