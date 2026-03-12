import { useQuery } from "@tanstack/react-query";
import { fetchExploreGraph } from "../api";

export function useExploreGraph() {
  return useQuery({
    queryKey: ["exploreGraph"],
    queryFn: fetchExploreGraph,
  });
}
