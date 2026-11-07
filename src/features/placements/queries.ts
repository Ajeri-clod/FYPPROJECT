import { queryOptions } from "@tanstack/react-query";
import { getPlacements } from "./server";

export function placementsQuery() {
  return queryOptions({
    queryKey: ["perkeso-placements"],
    queryFn: () => getPlacements(),
    staleTime: Number.POSITIVE_INFINITY,
  });
}
