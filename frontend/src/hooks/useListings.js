import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { fetchListings, fetchListing, fetchMakes, fetchModels } from "../api/listings";

// Paginated listings with filters
export function useListings(filters = {}) {
  return useQuery({
    queryKey:    ["listings", filters],
    queryFn:     () => fetchListings(filters),
    placeholderData: keepPreviousData,  // keeps previous page visible while next loads
    staleTime:   5 * 60 * 1000,        // 5 min — matches server cache TTL
  });
}

export function useListing(id) {
  return useQuery({
    queryKey: ["listing", id],
    queryFn:  () => fetchListing(id),
    enabled:  !!id,
    staleTime: 10 * 60 * 1000,
  });
}

export function useMakes() {
  return useQuery({
    queryKey: ["makes"],
    queryFn:  fetchMakes,
    staleTime: 30 * 60 * 1000,   // makes rarely change
  });
}

export function useModels(make) {
  return useQuery({
    queryKey: ["models", make],
    queryFn:  () => fetchModels(make),
    enabled:  !!make,
    staleTime: 30 * 60 * 1000,
  });
}
