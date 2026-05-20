import { useQuery } from "@tanstack/react-query";
import { getOverview, getPriceDistribution, getTopMakes, getSavingsSummary } from "../api/stats";

export const useOverview     = () => useQuery({ queryKey: ["stats","overview"],     queryFn: getOverview,          staleTime: 10*60*1000 });
export const usePriceDist    = () => useQuery({ queryKey: ["stats","price-dist"],   queryFn: getPriceDistribution, staleTime: 10*60*1000 });
export const useTopMakes     = () => useQuery({ queryKey: ["stats","top-makes"],    queryFn: getTopMakes,          staleTime: 10*60*1000 });
export const useSavings      = () => useQuery({ queryKey: ["stats","savings"],      queryFn: getSavingsSummary,    staleTime: 30*60*1000 });
