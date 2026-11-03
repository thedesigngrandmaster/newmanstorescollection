import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSimpleStats, type SimpleStats } from "@/lib/simple-admin/simple.functions";
import { readCache, STATS_CACHE_KEY, writeCache } from "@/lib/simple-admin/localCache";

/**
 * Revenue / order / product snapshot shared by Overview, Accounts and the
 * subscription reminder. Falls back to the last value saved on this device so
 * the simplified dashboard still shows numbers while offline.
 */
export function useSimpleStats() {
  const query = useQuery({
    queryKey: ["simple-stats"],
    queryFn: () => getSimpleStats(),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    retry: false,
    placeholderData: () => readCache<SimpleStats>(STATS_CACHE_KEY),
  });

  useEffect(() => {
    if (query.data) writeCache(STATS_CACHE_KEY, query.data);
  }, [query.data]);

  return query;
}
