import { queryOptions } from "@tanstack/react-query";
import { getOkuAggregate, getOkuOverview } from "./server";

export const okuStatsKeys = {
  all: ["oku-stats"] as const,
  overview: () => [...okuStatsKeys.all, "overview"] as const,
  aggregate: (district: string) =>
    [...okuStatsKeys.all, "aggregate", district] as const,
};

export function okuOverviewQuery() {
  return queryOptions({
    queryKey: okuStatsKeys.overview(),
    queryFn: () => getOkuOverview(),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

/** Aggregate for one district; empty string = all of Selangor. */
export function okuAggregateQuery(district: string) {
  return queryOptions({
    queryKey: okuStatsKeys.aggregate(district),
    queryFn: () => getOkuAggregate({ data: district }),
    staleTime: Number.POSITIVE_INFINITY,
  });
}
