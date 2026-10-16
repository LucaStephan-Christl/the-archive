import { Suspense, lazy, useCallback, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useInView } from "framer-motion";
import Local from "./Local";
import Reveal from "./Reveal";
import { Lightbox, MediaTile } from "./MediaGallery";
import { dayCities, dayPlaces, dayParts, getTripMedia, groupByDay, route, type Named } from "../data/media";
import type { Destination } from "../data/trips";

const TripMap = lazy(() => import("./TripMap"));

interface ExperienceProps {
  destination: Destination;
}

/** The post-portal view: a scroll-driven timeline whose days each unfold into a small grid. */
export default function Experience({ destination }: ExperienceProps) {
  const media = useMemo(() => getTripMedia(destination.slug), [destination.slug]);
  const mediaDays = useMemo(() => groupByDay(media), [media]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [openedId, setOpenedId] = useState<string | null>(null);

  function open(id: string) {
    setOpenedId(id);
    setLightboxIndex(media.findIndex((m) => m.id === id));
  }

  // No zoom-from-tile when opened from the map — the matching timeline tile
  // is usually far off-screen, so the lightbox just fades in instead.
  function openFromMap(id: string) {
    setOpenedId(null);
    setLightboxIndex(media.findIndex((m) => m.id === id));
  }

  const close = useCallback(() => setLightboxIndex(null), []);
  const stops = useMemo(() => route(media), [media]);
  const mapSectionRef = useRef<HTMLDivElement>(null);
  const mapInView = useInView(mapSectionRef, { once: true, margin: "600px 0px" });

  return (
    <section className="relative bg-(--color-bg) text-(--color-text)">
      <div className="sticky top-0 z-10 flex items-center justify-between bg-gradient-to-b from-(--color-bg) via-(--color-bg)/85 to-transparent px-5 py-5 sm:px-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 border-none bg-transparent p-0 text-[0.74rem] tracking-wide text-(--color-text-soft) hover:text-(--color-text)"
        >
          ← All destinations
        </Link>
        <span className="font-display text-base font-semibold tracking-tight">
          The Archive
        </span>
      </div>

      <div className="px-5 pt-4 pb-8 sm:px-8">
        <p className="mb-3 text-[0.72rem] tracking-[0.16em] uppercase text-(--color-accent)">
          {destination.eyebrow}
        </p>
        <h1 className="font-display text-[clamp(2rem,6.5vw,4.6rem)] leading-[0.92] font-semibold tracking-[-0.03em] uppercase">
          {destination.headline}
        </h1>
        {destination.local?.headline && (
          <p className="mt-3 text-[clamp(1rem,2.2vw,1.5rem)] text-(--color-text-soft)">
            <Local lang={destination.local.lang} className="tracking-[0.12em]">
              {destination.local.headline}
            </Local>
          </p>
        )}
        {stops.length > 1 && (
          <p className="mt-6 flex flex-wrap items-baseline gap-x-2.5 gap-y-2 text-[0.72rem] tracking-[0.14em] text-(--color-text-soft) uppercase">
            {stops.map((city, i) => (
              <span key={`${city.en}-${i}`} className="flex items-baseline gap-2.5">
                {i > 0 && <span className="text-(--color-accent)">→</span>}
                <span className="text-(--color-text)">{city.en}</span>
                {/* local names make a long route wrap into a tall ragged block on a phone */}
                <Local lang={city.lang} className="hidden text-[0.8rem] text-(--color-text-soft) sm:inline">{city.ja}</Local>
              </span>
            ))}
          </p>
        )}
      </div>

      {media.some((m) => m.lat !== undefined) && (
        <div ref={mapSectionRef} className="px-5 pb-6 sm:px-8">
          <Reveal className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
            <div className="flex items-baseline gap-2.5">
              <span className="text-[0.72rem] text-(--color-accent)">Map</span>
              <span className="text-[0.72rem] tracking-[0.14em] uppercase text-(--color-text-soft)">
                Where every frame was taken
              </span>
            </div>
          </Reveal>
          {/* Leaflet (and its tiles) only load once the map is near the viewport */}
          {mapInView ? (
            <Suspense fallback={<div className="h-[60vh] min-h-[380px] sm:h-[72vh] sm:min-h-[420px] rounded-(--radius) bg-(--color-text)/5" />}>
              <TripMap items={media} accent={destination.accent} onOpen={openFromMap} />
            </Suspense>
          ) : (
            <div className="h-[60vh] min-h-[380px] sm:h-[72vh] sm:min-h-[420px] rounded-(--radius) bg-(--color-text)/5" />
          )}
        </div>
      )}

      {media.length > 0 ? (
        <div className="relative px-5 pb-20 sm:px-8">
          <div className="pointer-events-none absolute top-0 bottom-8 left-[1.9rem] w-px sm:left-[2.65rem] bg-(--color-text)/15" />
          {mediaDays.map((day) => {
            // dayLabels (trips.ts) overrides the cities derived from the photos
            const override = destination.dayLabels?.[day.date];
            const cities: Named[] = override ? [{ en: override }] : dayCities(day.items);
            const places = dayPlaces(day.items);
            return (
            <div key={day.date} className="relative pt-9 pl-8 sm:pl-10">
              <span className="absolute top-9 left-[calc(0.65rem+0.5px)] h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-(--color-accent)" />
              <Reveal className="mb-4">
                {/* the day number stays put on the left; everything else wraps beside it
                    (with flex-wrap the number used to end up alone on its own line) */}
                <div className="flex items-baseline gap-3">
                  {/* day of the month, big — then the month in the softer tone */}
                  <span className="shrink-0 font-display text-lg font-semibold">{dayParts(day.date).day}</span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="text-[0.74rem] tracking-[0.08em] uppercase text-(--color-text-soft)">
                        {dayParts(day.date).month}
                        {cities.length > 0 && " — "}
                        {cities.map((city, i) => (
                          <span key={city.en}>
                            {i > 0 && " & "}
                            <span className="text-(--color-text)">{city.en}</span>
                            <Local lang={city.lang} className="ml-1.5 text-[0.8rem]">{city.ja}</Local>
                          </span>
                        ))}
                      </span>
                      <span className="text-[0.66rem] tracking-[0.08em] text-(--color-text-soft)/60 uppercase">
                        {day.items.length} {day.items.length === 1 ? "frame" : "frames"}
                      </span>
                    </div>
                    {places.length > 0 && (
                      <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[0.7rem] tracking-[0.06em] text-(--color-text-soft)">
                        {places.map((place) => (
                          <span key={place.en}>
                            {place.en}
                            <Local lang={place.lang} className="ml-1.5 text-(--color-text-soft)/70">{place.ja}</Local>
                          </span>
                        ))}
                      </p>
                    )}
                  </div>
                </div>
              </Reveal>
              {/* amount 0: a day can be several screens tall on a phone — reveal it as soon as it arrives */}
              <Reveal amount={0}>
                {/* --row: target row height for the justified layout (≈2 portrait shots per row on a phone) */}
                <div className="flex flex-wrap gap-2 sm:gap-3 [--row:clamp(190px,22vw,300px)]">
                  {day.items.map((item) => (
                    <MediaTile key={item.id} item={item} onOpen={() => open(item.id)} />
                  ))}
                  {/* soaks up the last row's slack so it isn't blown up to full width */}
                  <div className="grow-[999]" />
                </div>
              </Reveal>
            </div>
            );
          })}

          <Lightbox
            items={media}
            index={lightboxIndex}
            openedId={openedId}
            onIndex={setLightboxIndex}
            onClose={close}
          />
        </div>
      ) : (
      <div className="relative px-5 pb-20 sm:px-8">
        <div className="pointer-events-none absolute top-0 bottom-8 left-[1.9rem] w-px sm:left-[2.65rem] bg-(--color-text)/15" />
        {destination.days.map((day) => (
          <div key={day.n} className="relative pt-9 pl-8 sm:pl-10">
            <span className="absolute top-9 left-[calc(0.65rem+0.5px)] h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-(--color-accent)" />
            <Reveal className="mb-4 flex items-baseline gap-3">
              <span className="font-display text-lg font-semibold">
                {day.n}
              </span>
              <span className="text-[0.74rem] tracking-[0.08em] uppercase text-(--color-text-soft)">
                {day.label}
              </span>
            </Reveal>
            <div className="grid grid-cols-4 gap-3 max-[700px]:grid-cols-2">
              {day.tiles.map((tile, i) => (
                <Reveal
                  key={i}
                  delay={(i % 4) * 60}
                  className={`rounded-(--radius) grayscale-[0.4] aspect-[3/4] ${
                    tile.wide ? "col-span-2 aspect-[16/10]" : ""
                  }`}
                >
                  <div
                    className="h-full w-full rounded-(--radius)"
                    style={{ background: tile.bg }}
                  />
                </Reveal>
              ))}
            </div>
          </div>
        ))}
      </div>
      )}
    </section>
  );
}
