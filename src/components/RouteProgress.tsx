import { useRouterState } from "@tanstack/react-router";
import { useDelayedFlag } from "@/lib/motion";

/**
 * Doherty threshold: if a page takes longer than 150ms to load, a thin bar
 * appears at the top so the click always gets a response well within 400ms.
 * Pages preloaded on hover finish before it ever shows.
 */
export function RouteProgress() {
  const loading = useRouterState({
    select: (s) => s.status === "pending" || s.isLoading,
  });
  const show = useDelayedFlag(loading, 150);
  if (!show) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden"
    >
      <div data-route-progress className="h-full w-full bg-primary" />
    </div>
  );
}
