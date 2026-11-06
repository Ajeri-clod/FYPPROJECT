import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import dosmLabour from "@/data/dosm-labour.json";
import okuStats from "@/data/oku-stats.json";
import { requireUser } from "@/lib/require-user";
import type { DosmLabour } from "./compare";
import type { OkuAggregate, OkuStats } from "./types";

const stats = okuStats as OkuStats;

/**
 * Anonymised JKM registry aggregates. Today they come from the bundled JSON
 * built by `scripts/build_oku_stats.py`; swap this handler to query a database
 * or the agencies' API later — the pages only depend on the returned shape.
 */
export const getOkuOverview = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireUser();
    return {
      meta: stats.meta,
      districts: stats.districts,
      all: stats.all,
      districtSummary: stats.districtSummary,
      labour: dosmLabour as DosmLabour,
    };
  },
);

export const getOkuAggregate = createServerFn({ method: "GET" })
  .validator((district: string) => z.string().parse(district))
  .handler(async ({ data: district }): Promise<OkuAggregate> => {
    await requireUser();
    return (district && stats.byDistrict[district]) || stats.all;
  });
