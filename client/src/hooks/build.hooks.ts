import { useMutation } from "@tanstack/react-query";
import {
  generateBuildQuestions,
  generateMemos,
  indexMemos,
  queryBuildGraph,
} from "../api";
import type { DemoScenario, GraphData, Memo } from "../types";

export function useGenerateMemos() {
  return useMutation({
    mutationFn: (vars: { scenario: DemoScenario; count: number }) =>
      generateMemos(vars.scenario, vars.count),
  });
}

export function useIndexMemos() {
  return useMutation({
    mutationFn: (memos: Memo[]) => indexMemos(memos),
  });
}

export function useGenerateBuildQuestions() {
  return useMutation({
    mutationFn: (graph: GraphData) => generateBuildQuestions(graph),
  });
}

export function useQueryBuildGraph() {
  return useMutation({
    mutationFn: (question: string) => queryBuildGraph(question),
  });
}
