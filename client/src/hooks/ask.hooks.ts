import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchAskQuestions, queryGraphRAG, queryVanillaRAG } from "../api";

export function useAskQuestions() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["askQuestions"],
    queryFn: fetchAskQuestions,
    refetchOnWindowFocus: false,
  });

  const refresh = () =>
    queryClient.refetchQueries({ queryKey: ["askQuestions"] });

  return { ...query, refresh };
}

export function useQueryGraphRAG() {
  return useMutation({
    mutationFn: (question: string) => queryGraphRAG(question),
  });
}

export function useQueryVanillaRAG() {
  return useMutation({
    mutationFn: (question: string) => queryVanillaRAG(question),
  });
}
