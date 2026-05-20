import { useMutation, useQuery } from "@tanstack/react-query";
import { predictPrice, predictWithImport, getModelInfo } from "../api/ml";

// useMutation — triggered on user form submit, not on mount
export function usePredictPrice() {
  return useMutation({ mutationFn: predictPrice });
}

export function usePredictWithImport() {
  return useMutation({ mutationFn: predictWithImport });
}

export function useModelInfo() {
  return useQuery({ queryKey: ["model-info"], queryFn: getModelInfo, staleTime: 60*60*1000 });
}
