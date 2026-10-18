import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import Footer from "../components/Footer";
import GlobeSection from "../components/GlobeSection";
import Hero from "../components/Hero";
import Local from "../components/Local";
import Manifesto from "../components/Manifesto";
import { Lightbox, MediaTile } from "../components/MediaGallery";
import { getTripMedia, type MediaItem } from "../data/media";
import Nav from "../components/Nav";
import Reveal from "../components/Reveal";
import { tripsNewestFirst, homeGrid, type Destination } from "../data/trips";
import { CURSOR_ZONE_ATTR, setCursorState, useCursorState } from "../lib/cursorStore";

const DESTINATION_LIST = tripsNewestFirst;
const TOTAL_FRAMES = DESTINATION_LIST.reduce((n, d) => n + getTripMedia(d.slug).length, 0);

// Resolve each pick to its media item; ids that no longer exist (file
// removed from media/) are just skipped rather than breaking the page.
const shuffle = <T,>(list: T[]) => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/**
 * Selected frames, shuffled fresh on every visit: the same number from each
 * trip (the smallest trip's count), dealt round-robin from the trips in a
 * random order — so it's mixed, and two frames from one trip never sit side
 * by side. Picks whose media no longer exists are skipped.
 */
function shuffledFrames() {
  const byTrip = new Map<string, { tile: (typeof homeGrid)[number]; item: MediaItem }[]>();
  for (const tile of homeGrid) {
    const item = getTripMedia(tile.trip).find((m) => m.id === tile.id);
    if (!item) continue;
    byTrip.set(tile.trip, [...(byTrip.get(tile.trip) ?? []), { tile, item }]);
  }
  const perTrip = Math.min(...[...byTrip.values()].map((frames) => frames.length));
  const decks = shuffle([...byTrip.values()]).map((frames) => shuffle(frames).slice(0, perTrip));
  return Array.from({ length: perTrip }, (_, round) => decks.map((deck) => deck[round])).flat();
}

const FRAMES = shuffledFrames();
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
      image: destination.preview ? `url(${destination.preview.poster})` : destination.heroBg,
      video: destination.preview?.video ?? destination.heroVideo,
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
                  {/* local name under the title on a phone, beside it from sm up */}
                  <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-baseline sm:gap-5">
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
            {/* place (+ local name) on one line, the date small beneath — "Kamakura — Jan 2026"
                used to break mid-phrase on a phone */}
            {/* centred: right-aligned pills looked off whenever their text wrapped */}
            <span className="pointer-events-none absolute bottom-2 left-1/2 z-10 w-max max-w-[calc(100%-1rem)] -translate-x-1/2 rounded-[10px] bg-black/35 px-2.5 py-1.5 text-center text-white backdrop-blur-md backdrop-saturate-150 sm:bottom-2.5 sm:rounded-(--radius)">
              <span className="block truncate text-[0.68rem] leading-tight font-medium sm:text-[0.72rem]">
                {tile.caption.split(" — ")[0]}
                <Local lang={item.lang} className="ml-1.5 font-normal text-white/70">
                  {item.cityJa}
                </Local>
              </span>
              {tile.caption.includes(" — ") && (
                <span className="mt-0.5 block text-[0.58rem] leading-tight tracking-[0.08em] text-white/65 uppercase sm:text-[0.62rem]">
                  {tile.caption.split(" — ")[1]}
                </span>
              )}
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

      <GlobeSection />

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
