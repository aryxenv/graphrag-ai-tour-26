import type { GraphData } from "../types";

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
