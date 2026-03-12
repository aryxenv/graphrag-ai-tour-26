import type {
  DemoScenario,
  GeneratedQuestion,
  GraphData,
  Memo,
  QueryResult,
} from "./types";

const API_BASE = "http://localhost:8000/api";

// ── Ask Tab ─────────────────────────────────────────────────────────

/** Query the pre-built graph with GraphRAG (local/global search). */
export async function queryGraphRAG(question: string): Promise<QueryResult> {
  // TODO: POST ${API_BASE}/query/graphrag { question }
  console.log("[api] queryGraphRAG placeholder:", question);
  return {
    answer:
      "GraphRAG answer placeholder — will be replaced by actual GraphRAG local/global search response.",
    citations: ["Entities (12, 34)", "Reports (2)"],
  };
}

/** Query the same corpus with plain vector-search RAG for comparison. */
export async function queryVanillaRAG(question: string): Promise<QueryResult> {
  // TODO: POST ${API_BASE}/query/vanilla { question }
  console.log("[api] queryVanillaRAG placeholder:", question);
  return {
    answer:
      "Vanilla RAG answer placeholder — will be replaced by basic vector search response.",
  };
}

/** Fetch AI-generated questions from the backend (random global/local mode). */
export async function fetchAskQuestions(): Promise<{
  questions: GeneratedQuestion[];
  mode: "global" | "local";
}> {
  const mode = Math.random() < 0.5 ? "global" : "local";
  const res = await fetch(`${API_BASE}/questions/ask?mode=${mode}&count=3`);
  const data: GeneratedQuestion[] = await res.json();
  return { questions: data, mode };
}

// ── Explore Tab ─────────────────────────────────────────────────────

/** Fetch the full pre-built knowledge graph for 3D visualization. */
export async function fetchExploreGraph(): Promise<GraphData> {
  // TODO: GET ${API_BASE}/graph/explore
  console.log("[api] fetchExploreGraph placeholder");
  return {
    nodes: [
      {
        id: "1",
        name: "Ebenezer Scrooge",
        type: "person",
        description: "A miserly old man",
        community: 0,
      },
      {
        id: "2",
        name: "Bob Cratchit",
        type: "person",
        description: "Scrooge's clerk",
        community: 0,
      },
      {
        id: "3",
        name: "Jacob Marley",
        type: "person",
        description: "Scrooge's deceased partner",
        community: 1,
      },
      {
        id: "4",
        name: "Ghost of Christmas Past",
        type: "concept",
        description: "First spirit",
        community: 1,
      },
      {
        id: "5",
        name: "Ghost of Christmas Present",
        type: "concept",
        description: "Second spirit",
        community: 1,
      },
      {
        id: "6",
        name: "Ghost of Christmas Yet to Come",
        type: "concept",
        description: "Third spirit",
        community: 1,
      },
      {
        id: "7",
        name: "Tiny Tim",
        type: "person",
        description: "Bob Cratchit's ill son",
        community: 0,
      },
      {
        id: "8",
        name: "Fred",
        type: "person",
        description: "Scrooge's nephew",
        community: 2,
      },
      {
        id: "9",
        name: "Fezziwig",
        type: "person",
        description: "Scrooge's former employer",
        community: 2,
      },
      {
        id: "10",
        name: "London",
        type: "geo",
        description: "Setting of the story",
        community: 3,
      },
      {
        id: "11",
        name: "Scrooge & Marley",
        type: "organization",
        description: "Counting house",
        community: 3,
      },
      {
        id: "12",
        name: "Christmas Eve",
        type: "event",
        description: "Night of visitation",
        community: 1,
      },
    ],
    links: [
      { source: "1", target: "2", label: "employs" },
      { source: "1", target: "3", label: "former partner" },
      { source: "3", target: "4", label: "sends" },
      { source: "4", target: "5", label: "precedes" },
      { source: "5", target: "6", label: "precedes" },
      { source: "2", target: "7", label: "father of" },
      { source: "1", target: "8", label: "uncle of" },
      { source: "1", target: "9", label: "worked for" },
      { source: "1", target: "11", label: "owns" },
      { source: "11", target: "10", label: "located in" },
      { source: "12", target: "4", label: "triggers" },
      { source: "12", target: "5", label: "triggers" },
      { source: "12", target: "6", label: "triggers" },
      { source: "1", target: "12", label: "experiences" },
    ],
  };
}

// ── Build Tab ───────────────────────────────────────────────────────

/** Call Foundry agent to generate interconnected memos for a scenario. */
export async function generateMemos(
  scenario: DemoScenario,
  count: number,
): Promise<Memo[]> {
  // TODO: POST ${API_BASE}/build/generate { scenario, count }
  console.log("[api] generateMemos placeholder:", scenario, count);
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    title: `Memo ${i + 1}`,
    content: `[Placeholder] This memo will be generated by a Foundry agent for the "${scenario}" scenario.`,
    date: new Date(2025, 0, 1 + i).toISOString().slice(0, 10),
  }));
}

/** Trigger GraphRAG indexing on the generated memos. */
export async function indexMemos(memos: Memo[]): Promise<GraphData> {
  // TODO: POST ${API_BASE}/build/index { memos }
  console.log("[api] indexMemos placeholder:", memos.length, "memos");
  return {
    nodes: memos.map((m) => ({
      id: `memo-${m.id}`,
      name: m.title,
      type: "concept" as const,
      description: m.content.slice(0, 60),
    })),
    links: memos.slice(1).map((m, i) => ({
      source: `memo-${memos[i].id}`,
      target: `memo-${m.id}`,
      label: "related to",
    })),
  };
}

/** Generate curated questions from the newly-built graph. */
export async function generateBuildQuestions(
  graph: GraphData,
): Promise<GeneratedQuestion[]> {
  // TODO: POST ${API_BASE}/build/questions { graph summary / community reports }
  console.log(
    "[api] generateBuildQuestions placeholder:",
    graph.nodes.length,
    "nodes",
  );
  return [
    { question: "What are the key themes across all memos?", type: "global" },
    {
      question: "Which people appear in multiple memos and why?",
      type: "cross-document",
    },
    {
      question: "What hidden connection exists between the memos?",
      type: "hidden",
    },
    { question: "How did the situation evolve over time?", type: "timeline" },
  ];
}

/** Query the build-tab graph with GraphRAG. */
export async function queryBuildGraph(question: string): Promise<QueryResult> {
  // TODO: POST ${API_BASE}/build/query { question }
  console.log("[api] queryBuildGraph placeholder:", question);
  return {
    answer:
      "Build-graph query placeholder — will show GraphRAG answer over the freshly-indexed memos.",
    citations: ["Entities (1, 2, 3)", "Reports (1)"],
  };
}
