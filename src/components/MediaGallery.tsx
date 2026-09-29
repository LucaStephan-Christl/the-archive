import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { formatDuration, formatTakenAt, localLabel, placeLabel, type MediaItem } from "../data/media";
import Local from "./Local";

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
          ? { flex: `${ratio} 1 calc(${ratio} * var(--row))`, aspectRatio: String(ratio) }
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
          className="pointer-events-none absolute bottom-2.5 left-2.5 flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 text-[0.66rem] tracking-wide text-white backdrop-blur-md transition-opacity duration-300"
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            <div className="absolute inset-0 bg-(--color-bg)/95 backdrop-blur-md" />

            <div className="absolute inset-x-0 top-0 flex items-center justify-between px-6 py-5 text-[0.7rem] tracking-[0.12em] text-(--color-text-soft) uppercase sm:px-8">
              <span>
                {String(index + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
                <span className="ml-4 text-(--color-text)">{formatTakenAt(item)}</span>
                {placeLabel(item) && <span className="ml-4 text-(--color-text)">{placeLabel(item)}</span>}
                <Local className="ml-2.5 text-[0.8rem] text-(--color-text-soft)">{localLabel(item)}</Local>
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
              style={{
                borderRadius: RADIUS,
                aspectRatio: String(ratio),
                width: `min(92vw, calc(84vh * ${ratio}))`,
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
                <video
                  src={item.src}
                  poster={item.poster}
                  autoPlay
                  controls
                  playsInline
                  className="absolute inset-0 h-full w-full bg-black object-cover"
                />
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
