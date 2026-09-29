import { useSyncExternalStore } from "react";

export interface CursorState {
  label: string;
  color: string;
  /** Optional CSS background (e.g. a gradient) shown as a photo preview instead of a plain colour dot. */
  image?: string;
  /** Optional video src shown instead of `image` — takes priority when both are set. */
  video?: string;
}

let state: CursorState | null = null;
const listeners = new Set<() => void>();

/** Imperatively switch the sitewide custom cursor into a labelled/coloured "active" mode, or back to idle with `null`. */
export function setCursorState(next: CursorState | null) {
  state = next;
  listeners.forEach((listener) => listener());
}

export function getCursorState() {
  return state;
}

/**
 * Attribute marking an element as a "preview zone". The cursor clears
 * itself whenever the pointer isn't over one, because `mouseleave` doesn't
 * fire if the hovered element unmounts (click-through navigation, the menu
 * closing on Escape) or scrolls out from under a still pointer.
 */
export const CURSOR_ZONE_ATTR = "data-cursor-zone";

export function useCursorState() {
  return useSyncExternalStore(
    (onStoreChange) => {
      listeners.add(onStoreChange);
      return () => listeners.delete(onStoreChange);
    },
    () => state,
  );
}
