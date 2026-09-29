import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import Footer from "../components/Footer";
import Hero from "../components/Hero";
import Local from "../components/Local";
import Manifesto from "../components/Manifesto";
import { Lightbox, MediaTile } from "../components/MediaGallery";
import { getTripMedia } from "../data/media";
import Nav from "../components/Nav";
import Reveal from "../components/Reveal";
import { destinations, homeGrid, type Destination } from "../data/trips";
import { CURSOR_ZONE_ATTR, setCursorState, useCursorState } from "../lib/cursorStore";

const DESTINATION_LIST = Object.values(destinations);
const TOTAL_FRAMES = DESTINATION_LIST.reduce((n, d) => n + getTripMedia(d.slug).length, 0);

// Resolve each pick to its media item; ids that no longer exist (file
// removed from media/) are just skipped rather than breaking the page.
const FRAMES = homeGrid.flatMap((tile) => {
  const item = getTripMedia(tile.trip).find((m) => m.id === tile.id);
  return item ? [{ tile, item }] : [];
});
const FRAME_ITEMS = FRAMES.map((f) => f.item);

export default function ArchiveHome() {
  const [hovered, setHovered] = useState<string | null>(null);
  // Follow the cursor store too, so the highlight drops when the cursor
  // clears itself (e.g. scrolling the row out from under a still pointer).
  const activeSlug = useCursorState() ? hovered : null;
  const [frameIndex, setFrameIndex] = useState<number | null>(null);
  const [openedFrame, setOpenedFrame] = useState<string | null>(null);
  const closeFrame = useCallback(() => setFrameIndex(null), []);

  function openFrame(id: string) {
    setOpenedFrame(id);
    setFrameIndex(FRAME_ITEMS.findIndex((m) => m.id === id));
  }

  function handleEnter(destination: Destination) {
    setHovered(destination.slug);
    setCursorState({
      label: "Enter",
      color: destination.accent,
      image: destination.heroBg,
      video: destination.heroVideo,
    });
  }

  function handleLeave() {
    setHovered(null);
    setCursorState(null);
  }

  return (
    <div className="relative min-h-screen bg-(--color-bg) text-(--color-text)">
      <Nav />
      <Hero />
      <Manifesto />

      <Reveal className="relative z-10 mb-5 flex items-baseline gap-2.5 px-8">
        <span className="text-[0.72rem] text-(--color-accent)">02</span>
        <span className="text-[0.72rem] tracking-[0.14em] uppercase text-(--color-text-soft)">
          Destinations
        </span>
      </Reveal>
      <div
        className="relative z-10 border-t border-(--color-line) px-8 pb-16"
        onMouseLeave={handleLeave}
        {...{ [CURSOR_ZONE_ATTR]: "" }}
      >
        {DESTINATION_LIST.map((destination, i) => {
          const isHovered = activeSlug === destination.slug;
          const isDimmed = activeSlug !== null && !isHovered;
          return (
            <Reveal key={destination.slug} delay={i * 90}>
              <Link
                to={`/${destination.slug}`}
                onMouseEnter={() => handleEnter(destination)}
                className="flex items-center justify-between gap-6 border-b border-(--color-line) py-7 transition-opacity duration-300"
                style={{ opacity: isDimmed ? 0.35 : 1 }}
              >
                <div className="flex items-baseline gap-5">
                  <span className="text-[0.72rem] text-(--color-text-soft)">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    className="font-display text-[clamp(2.4rem,7vw,5.5rem)] leading-none font-semibold tracking-tight uppercase transition-colors duration-300"
                    style={{ color: isHovered ? destination.accent : undefined }}
                  >
                    {destination.slug}
                  </span>
                  {destination.local && (
                    <Local
                      lang={destination.local.lang}
                      className="text-[clamp(1rem,2.4vw,1.7rem)] text-(--color-text-soft) transition-colors duration-300"
                    >
                      {destination.local.name}
                    </Local>
                  )}
                </div>
                <div className="hidden text-right sm:block">
                  <p className="mb-1 text-[0.68rem] tracking-[0.14em] text-(--color-text-soft) uppercase">
                    {destination.eyebrow}
                  </p>
                  <p className="text-[0.72rem] tracking-[0.14em] text-(--color-text-soft) uppercase">
                    {destination.vBottom}
                  </p>
                </div>
              </Link>
            </Reveal>
          );
        })}
      </div>

      <Reveal className="relative z-10 mb-5 flex items-baseline gap-2.5 px-8">
        <span className="text-[0.72rem] text-(--color-accent)">03</span>
        <span className="text-[0.72rem] tracking-[0.14em] uppercase text-(--color-text-soft)">
          Selected frames
        </span>
      </Reveal>
      <div className="relative z-10 grid grid-cols-4 gap-3.5 px-8 pb-16 max-[760px]:grid-cols-2">
        {FRAMES.map(({ tile, item }, i) => (
          <Reveal key={item.id} delay={(i % 4) * 70} className="relative aspect-[2/3]">
            <MediaTile item={item} layout="fill" onOpen={() => openFrame(item.id)} />
            <span className="pointer-events-none absolute right-2.5 bottom-2.5 z-10 rounded-(--radius) bg-black/32 px-2.5 py-1.5 text-[0.72rem] text-white backdrop-blur-md backdrop-saturate-150">
              {tile.caption}
              <Local className="ml-1.5 text-white/75">{item.cityJa}</Local>
            </span>
          </Reveal>
        ))}
      </div>
      <Lightbox
        items={FRAME_ITEMS}
        index={frameIndex}
        openedId={openedFrame}
        onIndex={setFrameIndex}
        onClose={closeFrame}
      />

      <Reveal className="relative z-10 flex justify-between border-t border-(--color-line) px-8 py-6 text-[0.68rem] tracking-[0.08em] uppercase text-(--color-text-soft)">
        <span>The Archive — est. 2026</span>
        <span>
          {DESTINATION_LIST.length} trips · {TOTAL_FRAMES} frames
        </span>
      </Reveal>

      <Footer />
    </div>
  );
}
