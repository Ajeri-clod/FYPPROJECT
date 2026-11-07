import { createServerFn } from "@tanstack/react-start";
import placements from "@/data/perkeso-placements.json";
import { requireUser } from "@/lib/require-user";
import type { PerkesoPlacements } from "./types";

/** PERKESO OKU placement statistics (aggregate counts, bundled JSON). */
export const getPlacements = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireUser();
    return placements as unknown as PerkesoPlacements;
  },
);
