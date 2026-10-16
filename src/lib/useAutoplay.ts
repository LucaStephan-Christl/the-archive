import { useEffect, type RefObject } from "react";

/**
 * Makes a muted background video actually autoplay on iOS Safari.
 *
 * - React sets `muted` only as a DOM property, never as the HTML attribute,
 *   and iOS decides autoplay eligibility from the attribute/defaultMuted at
 *   load — so it can treat the video as unmuted and refuse to start it.
 *   Set all three explicitly before calling play().
 * - Low Power Mode (and some data-saver settings) reject play() until the
 *   page gets a user gesture. Only in that case do we wait for the first
 *   touch/click and retry — listening unconditionally would also undo a
 *   deliberate tap-to-pause.
 */
export function useAutoplay(ref: RefObject<HTMLVideoElement | null>, deps: unknown[] = []) {
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.muted = true;
    video.defaultMuted = true;
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");

    let started = false;
    const onGesture = () => {
      if (!started) video.play().catch(() => {});
    };
    const stopWaiting = () => {
      window.removeEventListener("touchstart", onGesture);
      window.removeEventListener("click", onGesture);
    };
    const onPlaying = () => {
      started = true;
      stopWaiting();
    };
    const tryPlay = () => {
      if (started || !video.paused) return;
      video.play().catch(() => {
        // blocked (e.g. Low Power Mode) — start on the first gesture instead
        window.addEventListener("touchstart", onGesture, { once: true, passive: true });
        window.addEventListener("click", onGesture, { once: true });
      });
    };

    video.addEventListener("playing", onPlaying);
    video.addEventListener("loadeddata", tryPlay);
    tryPlay();
    return () => {
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("loadeddata", tryPlay);
      stopWaiting();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
