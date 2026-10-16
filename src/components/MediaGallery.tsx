import { useEffect, useRef, useState, type MouseEvent, type TouchEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { formatDuration, formatTakenAt, localLabel, placeLabel, type MediaItem } from "../data/media";
import Local from "./Local";
import { useAutoplay } from "../lib/useAutoplay";

const EASE = [0.4, 0, 0.2, 1] as const;
const RADIUS = 16; // matches --radius; set inline so framer corrects it during the zoom

interface TileProps {
  item: MediaItem;
  onOpen: () => void;
  /** "fill": cover whatever box the parent gives it (e.g. a fixed-aspect grid cell) */
  layout?: "justified" | "fill";
}

/**
 * One photo/video tile. In the default "justified" layout `flex-grow` and
 * `flex-basis` are both proportional to the aspect ratio, so every item in a
 * row ends up the same height with no cropping, while rows still fill the
 * full width.
 */
export function MediaTile({ item, onOpen, layout = "justified" }: TileProps) {
  const ratio = item.width / item.height;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  function play() {
    const video = videoRef.current;
    if (!video) return;
    video.play().then(() => setPlaying(true), () => {});
  }

  function stop() {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = 0;
    setPlaying(false);
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      onMouseEnter={item.type === "video" ? play : undefined}
      onMouseLeave={item.type === "video" ? stop : undefined}
      className={`group relative block cursor-zoom-in border-none bg-transparent p-0 ${layout === "fill" ? "h-full w-full" : ""}`}
      style={
        layout === "justified"
          ? {
              flex: `${ratio} 1 calc(${ratio} * var(--row))`,
              aspectRatio: String(ratio),
              // a tile left alone on a row (e.g. a portrait before a landscape on a
              // phone) mustn't balloon to the full width — at most 1.5× its size
              maxWidth: `calc(${ratio} * var(--row) * 1.5)`,
            }
          : undefined
      }
      aria-label={[item.type === "video" ? "Play video" : "Open photo", formatTakenAt(item), placeLabel(item)]
        .filter(Boolean)
        .join(", ")}
    >
      <motion.div
        layoutId={`media-${item.id}`}
        className="absolute inset-0 overflow-hidden bg-(--color-text)/5"
        style={{ borderRadius: RADIUS }}
      >
        {item.type === "image" ? (
          <img
            src={item.src}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <video
            ref={videoRef}
            src={item.src}
            poster={item.poster}
            muted
            loop
            playsInline
            preload="none"
            className="h-full w-full object-cover"
          />
        )}
      </motion.div>

      {item.type === "video" && (
        <span
          // top-left in "fill" tiles (homepage), where a caption pill sits centred at the bottom
          className={`pointer-events-none absolute left-2.5 flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 text-[0.66rem] tracking-wide text-white backdrop-blur-md transition-opacity duration-300 ${
            layout === "fill" ? "top-2.5" : "bottom-2.5"
          }`}
          style={{ opacity: playing ? 0 : 1 }}
        >
          <svg width="8" height="9" viewBox="0 0 8 9" fill="currentColor" aria-hidden="true">
            <path d="M0 0.5v8l8-4z" />
          </svg>
          {formatDuration(item.duration)}
        </span>
      )}
    </button>
  );
}

interface LightboxProps {
  items: MediaItem[];
  index: number | null;
  /** the item the lightbox was opened from — only it zooms out of/into its tile */
  openedId: string | null;
  onIndex: (index: number) => void;
  onClose: () => void;
}

export function Lightbox({ items, index, openedId, onIndex, onClose }: LightboxProps) {
  const item = index === null ? null : items[index];

  // swipe left/right to move through photos — the arrow buttons only show on wider screens
  const touchStartX = useRef<number | null>(null);
  const swipe = {
    onTouchStart: (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
    },
    onTouchEnd: (e: TouchEvent) => {
      const start = touchStartX.current;
      touchStartX.current = null;
      if (start === null || index === null || items.length < 2) return;
      const dx = e.changedTouches[0].clientX - start;
      if (Math.abs(dx) < 50) return;
      onIndex(dx < 0 ? (index + 1) % items.length : (index - 1 + items.length) % items.length);
    },
  };
  const [fullLoaded, setFullLoaded] = useState<string | null>(null);

  useEffect(() => {
    if (index === null) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onIndex((index + 1) % items.length);
      if (e.key === "ArrowLeft") onIndex((index - 1 + items.length) % items.length);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [index, items.length, onIndex, onClose]);

  const ratio = item ? item.width / item.height : 1;
  const zooms = item?.id === openedId;

  // Backdrop/chrome and the media sit in separate AnimatePresences so the
  // media can zoom straight back into its tile while the backdrop fades —
  // a nested presence wouldn't run its exit when the outer one closes.
  return (
    <>
      <AnimatePresence>
        {item && index !== null && (
          <motion.div
            key="lightbox-backdrop"
            // data-lenis-prevent: stop the smooth-scroll library from scrolling the page underneath
            data-lenis-prevent
            className="fixed inset-0 z-[100]"
            onClick={onClose}
            {...swipe}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            <div className="absolute inset-0 bg-(--color-bg)/95 backdrop-blur-md" />

            <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-4 px-5 py-5 text-[0.7rem] tracking-[0.12em] text-(--color-text-soft) uppercase sm:px-8">
              {/* wraps onto a second line on a phone instead of overflowing */}
              <span className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <span>
                  {String(index + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
                </span>
                <span className="text-(--color-text)">{formatTakenAt(item)}</span>
                {placeLabel(item) && (
                  <span className="text-(--color-text)">
                    {placeLabel(item)}
                    <Local lang={item.lang} className="ml-2.5 text-[0.8rem] text-(--color-text-soft)">
                      {localLabel(item)}
                    </Local>
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={onClose}
                className="border-none bg-transparent p-0 text-[0.7rem] tracking-[0.12em] text-(--color-text-soft) uppercase hover:text-(--color-text)"
              >
                Close
              </button>
            </div>

            {items.length > 1 && (
              <>
                <NavButton side="left" onClick={() => onIndex((index - 1 + items.length) % items.length)} />
                <NavButton side="right" onClick={() => onIndex((index + 1) % items.length)} />
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div data-lenis-prevent className="pointer-events-none fixed inset-0 z-[101] flex items-center justify-center">
        <AnimatePresence mode="popLayout">
          {item && (
            <motion.div
              key={item.id}
              layoutId={zooms ? `media-${item.id}` : undefined}
              // items navigated to with the arrows (not zoomed out of a tile) cross-fade instead
              initial={zooms ? undefined : { opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={zooms ? undefined : { opacity: 0 }}
              transition={{ duration: 0.45, ease: EASE }}
              className="pointer-events-auto relative overflow-hidden"
              {...swipe}
              style={{
                borderRadius: RADIUS,
                aspectRatio: String(ratio),
                // leave room for the top bar (date / place / Close) — on a phone a
                // portrait video at 84vh slid up underneath it
                width: `min(92vw, calc((100dvh - 190px) * ${ratio}), calc(84vh * ${ratio}))`,
              }}
            >
              {item.type === "image" ? (
                <>
                  <img src={item.src} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  {/* sharper full-size version fades in over the grid-sized one once loaded */}
                  <img
                    src={item.full}
                    alt=""
                    onLoad={() => setFullLoaded(item.id)}
                    className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300"
                    style={{ opacity: fullLoaded === item.id ? 1 : 0 }}
                  />
                </>
              ) : (
                <LightboxVideo key={item.id} item={item} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

function NavButton({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={side === "left" ? "Previous" : "Next"}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`absolute top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-(--color-line) bg-(--color-bg)/60 text-(--color-text) backdrop-blur-md transition-colors hover:bg-(--color-text) hover:text-(--color-bg) sm:flex ${
        side === "left" ? "left-6" : "right-6"
      }`}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
        <path d={side === "left" ? "M9 2 4 7l5 5" : "M5 2l5 5-5 5"} />
      </svg>
    </button>
  );
}

/**
 * The viewer's video: our own minimal controls instead of the browser's —
 * on an iPhone the native player UI covered the date, place and Close.
 * Starts muted and looping (so it can autoplay); tap to pause / play,
 * the speaker button turns sound on.
 */
function LightboxVideo({ item }: { item: MediaItem }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  useAutoplay(ref, [item.src]);

  function togglePlay() {
    const video = ref.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  }

  function toggleSound(e: MouseEvent) {
    e.stopPropagation();
    const video = ref.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
    if (video.paused) video.play().catch(() => {});
  }

  return (
    <>
      <video
        ref={ref}
        src={item.src}
        poster={item.poster}
        autoPlay
        muted
        loop
        playsInline
        onClick={togglePlay}
        onPlay={() => setPaused(false)}
        onPause={() => setPaused(true)}
        className="absolute inset-0 h-full w-full cursor-pointer bg-black object-cover"
      />
      {paused && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md">
            <svg width="18" height="20" viewBox="0 0 8 9" fill="currentColor" aria-hidden="true">
              <path d="M0 0.5v8l8-4z" />
            </svg>
          </span>
        </span>
      )}
      <button
        type="button"
        onClick={toggleSound}
        aria-label={muted ? "Turn sound on" : "Mute"}
        className="absolute right-3 bottom-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md transition-colors hover:bg-black/65"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M11 5 6 9H2v6h4l5 4z" fill="currentColor" stroke="none" />
          {muted ? (
            <path d="m22 9-6 6m0-6 6 6" />
          ) : (
            <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" />
          )}
        </svg>
      </button>
    </>
  );
}
