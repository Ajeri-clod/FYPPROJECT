import { useEffect, useLayoutEffect, useState } from "react";

/**
 * Motion helpers (see the "Motion system" block in styles/app.css).
 *
 * - Pointer origin: every pointerdown records where it happened, so button
 *   ripples grow from the touch point and dialogs grow from the clicked spot.
 * - First-visit entrances: a page cascades in only the first time it is
 *   opened in a session; frequently revisited screens stay instant.
 */

const useIsoLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

/** True once the app has hydrated (never animate content the server already painted). */
let hydrated = false;

export function usePointerOrigin() {
  useEffect(() => {
    hydrated = true;
    const onDown = (e: PointerEvent) => {
      const root = document.documentElement;
      root.style.setProperty("--last-x", `${e.clientX}px`);
      root.style.setProperty("--last-y", `${e.clientY}px`);
      const target = e.target as Element | null;
      const button = target?.closest<HTMLElement>('[data-slot="button"]');
      if (button) {
        const r = button.getBoundingClientRect();
        button.style.setProperty("--px", `${e.clientX - r.left}px`);
        button.style.setProperty("--py", `${e.clientY - r.top}px`);
      }
    };
    window.addEventListener("pointerdown", onDown, {
      capture: true,
      passive: true,
    });
    return () =>
      window.removeEventListener("pointerdown", onDown, { capture: true });
  }, []);
}

const SEEN_KEY = "motion:seen-pages";

function seenPages(): Set<string> {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(SEEN_KEY) ?? "[]"));
  } catch {
    return new Set();
  }
}

/**
 * Plays the staggered page entrance on `container` the first time `pageKey`
 * is shown in this session. Returns nothing; it toggles `data-enter` directly
 * so there is no extra render and no flash.
 */
export function useFirstVisitEntrance(
  getContainer: () => HTMLElement | null | undefined,
  pageKey: string,
) {
  useIsoLayoutEffect(() => {
    const el = getContainer();
    if (!el || !hydrated) return;
    const seen = seenPages();
    if (seen.has(pageKey)) return;
    seen.add(pageKey);
    try {
      sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
    } catch {
      // storage blocked: the page still animates this once, which is fine
    }
    el.setAttribute("data-enter", "");
    const done = window.setTimeout(() => el.removeAttribute("data-enter"), 900);
    return () => window.clearTimeout(done);
  }, [pageKey]);
}

/** Show a loading indicator only if waiting has lasted longer than `delayMs`. */
export function useDelayedFlag(active: boolean, delayMs = 150) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!active) {
      setShown(false);
      return;
    }
    const t = window.setTimeout(() => setShown(true), delayMs);
    return () => window.clearTimeout(t);
  }, [active, delayMs]);
  return shown;
}
