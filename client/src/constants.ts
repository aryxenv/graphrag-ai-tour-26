import type { TabValue } from "./types";

export const API_BASE =
  import.meta.env.VITE_API_BASE ?? "http://localhost:8000/api";

export const TABS: { value: TabValue; label: string }[] = [
  { value: "ask", label: "Ask" },
  { value: "explore", label: "Explore" },
  { value: "build", label: "Build" },
];

export const STORAGE_KEY_QUESTIONS = "ask:questions";
export const STORAGE_KEY_RESULTS = "ask:results";
export const STORAGE_KEY_BUILD = "build:session";

export const BOOK_URL = "https://www.gutenberg.org/files/46/46-h/46-h.htm";
