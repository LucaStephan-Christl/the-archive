import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { formatDay, formatTakenAt, localLabel, tripDay, type MediaItem } from "../data/media";
import Local from "./Local";

const EASE = [0.4, 0, 0.2, 1] as const;

interface Stop {
  key: string;
  name: string;
  /** local-script name, 伏見稲荷大社 */
  ja?: string;
  city?: string;
  lat: number;
  lon: number;
  items: MediaItem[];
}

/**
 * Group pinned items into one stop per place. A stop sits at the mean of its
 * photos' own GPS positions when any have one, else at the place's position.
 */
function buildStops(items: MediaItem[]): Stop[] {
  const stops = new Map<string, Stop>();
  for (const item of items) {
    if (item.lat === undefined || item.lon === undefined) continue;
    const name = item.place ?? item.city ?? "Unknown";
    const key = `${name}|${item.city ?? ""}`;
    const stop = stops.get(key) ?? { key, name, ja: localLabel(item), city: item.city, lat: 0, lon: 0, items: [] };
    stop.items.push(item);
    stops.set(key, stop);
  }
  for (const stop of stops.values()) {
    const exact = stop.items.filter((i) => i.exact);
    const basis = exact.length ? exact : stop.items;
    stop.lat = basis.reduce((s, i) => s + i.lat!, 0) / basis.length;
    stop.lon = basis.reduce((s, i) => s + i.lon!, 0) / basis.length;
  }
  return [...stops.values()];
}

/** The order stops were visited in (consecutive repeats collapsed) — the route line. */
function visitOrder(items: MediaItem[], stops: Stop[]) {
  const byItem = new Map(stops.flatMap((s) => s.items.map((i) => [i.id, s] as const)));
  const path: Stop[] = [];
  for (const item of items) {
    const stop = byItem.get(item.id);
    if (stop && path.at(-1) !== stop) path.push(stop);
  }
  return path;
}

function stopDates(stop: Stop) {
  return [...new Set(stop.items.map((i) => formatDay(tripDay(i.takenAt))))].join(", ");
}

interface TripMapProps {
  items: MediaItem[];
  accent: string;
  onOpen: (id: string) => void;
}

export default function TripMap({ items, accent, onOpen }: TripMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const stops = useMemo(() => buildStops(items), [items]);
  const [selected, setSelected] = useState<Stop | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !stops.length) return;

    const map = L.map(el, {
      zoomControl: false,
      // Scroll-to-zoom only after a click, so scrolling the page past the
      // map doesn't get hijacked into zooming it.
      scrollWheelZoom: false,
      attributionControl: true,
    });
    mapRef.current = map;
    L.control.zoom({ position: "bottomright" }).addTo(map);
    map.attributionControl.setPrefix(false);

    // Esri's Dark Gray Canvas: keyless raster tiles (base + a transparent
    // labels layer on top). Attribution is required — keep it.
    const esri = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas";
    L.tileLayer(`${esri}/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`, {
      attribution: "Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors",
      maxZoom: 16,
    }).addTo(map);
    L.tileLayer(`${esri}/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`, {
      maxZoom: 16,
      pane: "overlayPane",
    }).addTo(map);

    const enableWheel = () => {
      map.scrollWheelZoom.enable();
      el.setAttribute("data-lenis-prevent", ""); // stop smooth-scroll fighting the zoom
    };
    const disableWheel = () => {
      map.scrollWheelZoom.disable();
      el.removeAttribute("data-lenis-prevent");
    };
    map.on("click", enableWheel);
    map.on("mouseout", disableWheel);

    // route between stops, in the order they were visited
    const path = visitOrder(items, stops);
    L.polyline(
      path.map((s) => [s.lat, s.lon] as L.LatLngTuple),
      { color: accent, weight: 1.5, opacity: 0.7, dashArray: "4 6" },
    ).addTo(map);

    // exact GPS positions of individual photos
    for (const item of items) {
      if (!item.exact || item.lat === undefined || item.lon === undefined) continue;
      L.circleMarker([item.lat, item.lon], {
        radius: 3,
        color: accent,
        weight: 0,
        fillColor: accent,
        fillOpacity: 0.9,
        interactive: false,
      }).addTo(map);
    }

    // one photo marker per stop
    for (const stop of stops) {
      const cover = stop.items.find((i) => i.type === "image") ?? stop.items[0];
      const icon = L.divIcon({
        className: "trip-pin",
        html: `<span class="trip-pin__img" style="background-image:url('${cover.thumb ?? cover.poster ?? cover.src}');border-color:${accent}"></span><span class="trip-pin__count">${stop.items.length}</span>`,
        iconSize: [46, 46],
        iconAnchor: [23, 23],
      });
      L.marker([stop.lat, stop.lon], { icon, title: stop.name, riseOnHover: true })
        .addTo(map)
        .bindTooltip(
          `${stop.name}${stop.ja ? ` <span lang="ja" class="trip-tooltip__ja">${stop.ja}</span>` : ""}` +
            `${stop.city && stop.city !== stop.name ? `, ${stop.city}` : ""} · ${stopDates(stop)}`,
          { direction: "top", offset: [0, -26], className: "trip-tooltip" },
        )
        .on("click", () => {
          setSelected(stop);
          map.flyTo([stop.lat, stop.lon], Math.max(map.getZoom(), 14), { duration: 0.8 });
        });
    }

    // Fit the whole route — and again whenever the box changes size (it can
    // be measured mid-layout on first mount), until the viewer takes over.
    const bounds = L.latLngBounds(stops.map((s) => [s.lat, s.lon] as L.LatLngTuple));
    let touched = false;
    map.on("mousedown touchstart zoomstart", (e) => {
      if ((e as L.LeafletEvent & { originalEvent?: Event }).originalEvent) touched = true;
    });
    const fit = () => {
      map.invalidateSize();
      if (!touched) map.fitBounds(bounds, { padding: [48, 48], maxZoom: 13 });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [items, stops, accent]);

  function showAll() {
    setSelected(null);
    mapRef.current?.flyToBounds(L.latLngBounds(stops.map((s) => [s.lat, s.lon] as L.LatLngTuple)), {
      padding: [48, 48],
      duration: 0.8,
    });
  }

  if (!stops.length) return null;

  return (
    <div className="relative isolate h-[72vh] min-h-[420px] overflow-hidden rounded-(--radius) border border-(--color-line)">
      <div ref={containerRef} className="h-full w-full bg-(--color-bg)" />

      <button
        type="button"
        onClick={showAll}
        className="absolute top-4 right-4 z-[1000] rounded-full border border-(--color-line) bg-(--color-bg)/75 px-3.5 py-1.5 text-[0.66rem] tracking-[0.12em] text-(--color-text-soft) uppercase backdrop-blur-md hover:text-(--color-text)"
      >
        Whole route
      </button>

      <AnimatePresence>
        {selected && (
          <motion.div
            key={selected.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.3, ease: EASE }}
            data-lenis-prevent
            className="absolute bottom-4 left-4 z-[1000] flex max-h-[calc(100%-2rem)] w-[min(340px,calc(100%-2rem))] flex-col overflow-hidden rounded-(--radius) border border-(--color-line) bg-(--color-bg)/85 backdrop-blur-md"
          >
            <div className="flex items-start justify-between gap-4 px-4 pt-4 pb-3">
              <div>
                <p className="font-display text-lg leading-tight font-semibold">{selected.name}</p>
                <Local className="mt-0.5 block text-[0.95rem] text-(--color-text-soft)">{selected.ja}</Local>
                <p className="mt-1 text-[0.66rem] tracking-[0.12em] text-(--color-text-soft) uppercase">
                  {[selected.city !== selected.name && selected.city, stopDates(selected), `${selected.items.length} frames`]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="text-[0.66rem] tracking-[0.12em] text-(--color-text-soft) uppercase hover:text-(--color-text)"
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1.5 overflow-y-auto px-4 pb-4">
              {selected.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onOpen(item.id)}
                  className="relative aspect-square cursor-zoom-in overflow-hidden rounded-md"
                  aria-label={`Open ${formatTakenAt(item)}`}
                >
                  <img
                    src={item.thumb ?? item.poster ?? item.src}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                  />
                  {item.type === "video" && (
                    <span className="absolute bottom-1 left-1 text-[0.55rem] text-white drop-shadow">▶</span>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
