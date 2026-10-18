import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import createGlobe from "cobe";
import { AnimatePresence, motion, useInView, useMotionValueEvent, useScroll } from "framer-motion";
import Local from "./Local";
import Reveal from "./Reveal";
import { useAutoplay } from "../lib/useAutoplay";
import { tripsOldestFirst, type Destination } from "../data/trips";

const EASE = [0.4, 0, 0.2, 1] as const;

// How much scrolling each stop gets, in screen heights ×100. Higher = slower tour.
const VH_PER_STOP = 180;

// Where the tour starts — home, Aargau.
const HOME = { name: "Aargau, Switzerland", lat: 47.39, lon: 8.05 };

// The point the globe turns to for each destination (roughly the trip's middle).
const FOCUS: Record<Destination["slug"], [number, number]> = {
  japan: [35.4, 137.0],
  iceland: [64.9, -19.0],
  budapest: [47.4979, 19.0402],
  france: [49.4, 1.9], // between Paris and Criel-sur-Mer
};

const DESTINATION_LIST = tripsOldestFirst;
const STOPS: { lat: number; lon: number; destination?: Destination }[] = [
  { lat: HOME.lat, lon: HOME.lon },
  ...DESTINATION_LIST.map((d) => ({ lat: FOCUS[d.slug][0], lon: FOCUS[d.slug][1], destination: d })),
];

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** cobe's camera angles that put [lat, lon] in the middle of the globe. */
function anglesFor(lat: number, lon: number): [number, number] {
  const phi = Math.PI - ((lon * Math.PI) / 180 - Math.PI / 2);
  // full tilt toward Iceland's latitude shows mostly the pole — cap it
  const theta = Math.min((lat * Math.PI) / 180, 0.85);
  return [phi, theta];
}

/** Shortest way round from one angle to another, so the globe never spins the long way. */
function shortest(from: number, to: number) {
  const tau = Math.PI * 2;
  let d = (to - from) % tau;
  if (d > Math.PI) d -= tau;
  if (d < -Math.PI) d += tau;
  return from + d;
}

const smoothstep = (x: number) => x * x * (3 - 2 * x);
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

// Zoom (× the resting size): pulled back mid-flight, leaning in on each destination.
const ZOOM = { home: 1, flight: 0.78, stop: 1.38, stopMobile: 1.2 };
// The canvas is this much bigger than the globe's box, so zooming in never clips the sphere or its glow.
const OVERSIZE = 1.7;
// Share of each leg's turn that's plain linear, so the globe never fully stops between scrolls.
const DRIFT = 0.3;

/**
 * A pinned section with a dotted 3D globe (cobe). Scrolling flies it from
 * home to each destination in turn — pulling back for each leg and zooming
 * in on arrival, never quite standing still — while that trip's card and
 * preview video slide in beside it.
 */
export default function GlobeSection() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inView = useInView(wrapperRef, { margin: "200px 0px" });
  const { scrollYProgress } = useScroll({ target: wrapperRef, offset: ["start start", "end end"] });

  // camera target [phi, theta, zoom] (set from scroll) and current state (eased toward it each frame)
  const target = useRef<[number, number, number]>([...anglesFor(HOME.lat, HOME.lon), ZOOM.home]);
  const current = useRef([...target.current] as [number, number, number]);
  const [stop, setStop] = useState(0);

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    // x runs 0 → STOPS.length - 1. Every bit of scroll moves the globe: the turn eases
    // in and out of each stop without ever holding still, and the zoom pulls back for
    // the flight and leans in on arrival.
    const x = clamp01(p) * (STOPS.length - 1);
    const i = Math.min(Math.floor(x), STOPS.length - 2);
    const t = x - i;
    const turn = DRIFT * t + (1 - DRIFT) * smoothstep(t);
    const [phiA, thetaA] = anglesFor(STOPS[i].lat, STOPS[i].lon);
    const [phiB, thetaB] = anglesFor(STOPS[i + 1].lat, STOPS[i + 1].lon);
    const phiTo = shortest(phiA, phiB);
    const stopZoom = window.matchMedia("(min-width: 768px)").matches ? ZOOM.stop : ZOOM.stopMobile;
    const zoomA = i === 0 ? ZOOM.home : stopZoom;
    const zoomB = stopZoom;
    // a dip to flight zoom halfway through the leg
    const settle = zoomA + (zoomB - zoomA) * turn;
    const zoom = settle + (ZOOM.flight - settle) * Math.sin(Math.PI * t);
    target.current = [phiA + (phiTo - phiA) * turn, thetaA + (thetaB - thetaA) * turn, zoom];
    setStop(Math.round(x));
  });

  // the globe itself — only alive (and animating) while near the viewport
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !inView) return;

    const size = canvas.offsetWidth;
    const [phi0, theta0, zoom0] = current.current;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const globe = createGlobe(canvas, {
      devicePixelRatio: dpr,
      // CSS pixels — cobe multiplies by devicePixelRatio itself
      width: size,
      height: size,
      phi: phi0,
      theta: theta0,
      scale: zoom0 / OVERSIZE,
      dark: 1,
      diffuse: 1.4,
      mapSamples: 16000,
      mapBrightness: 6,
      baseColor: [0.26, 0.26, 0.28],
      markerColor: [0.95, 0.94, 0.91],
      glowColor: [0.12, 0.12, 0.14],
      markers: [
        { location: [HOME.lat, HOME.lon], size: 0.04 },
        ...DESTINATION_LIST.map((d) => ({
          location: FOCUS[d.slug],
          size: 0.08,
          color: hexToRgb(d.accent),
        })),
      ],
      arcs: DESTINATION_LIST.map((d) => ({
        from: [HOME.lat, HOME.lon] as [number, number],
        to: FOCUS[d.slug],
        color: hexToRgb(d.accent),
      })),
      arcWidth: 0.6,
      arcHeight: 0.12,
      // markers sit on the surface (raised ones float off the outline near the edge)
      markerElevation: 0,
    });

    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const [phi, theta, zoom] = current.current;
      const [phiT, thetaT, zoomT] = target.current;
      // ease toward the scroll target — keeps it smooth even with jumpy wheel input
      current.current = [phi + (phiT - phi) * 0.07, theta + (thetaT - theta) * 0.07, zoom + (zoomT - zoom) * 0.06];
      globe.update({ phi: current.current[0], theta: current.current[1], scale: current.current[2] / OVERSIZE });
    };
    raf = requestAnimationFrame(tick);
    canvas.style.opacity = "1";

    return () => {
      cancelAnimationFrame(raf);
      globe.destroy();
    };
  }, [inView]);

  const active = STOPS[stop]?.destination;

  return (
    <>
      <Reveal className="relative z-10 mb-5 flex items-baseline gap-2.5 px-8">
        <span className="text-[0.72rem] text-(--color-accent)">04</span>
        <span className="text-[0.72rem] tracking-[0.14em] uppercase text-(--color-text-soft)">Where I've been</span>
      </Reveal>

      {/* scroll length per stop (vh), so each one gets the same time however many trips there are */}
      <div ref={wrapperRef} className="relative z-10" style={{ height: `${STOPS.length * VH_PER_STOP + 20}vh` }}>
        <div className="sticky top-0 flex h-screen flex-col items-center justify-center gap-6 overflow-hidden px-6 md:flex-row md:gap-16 md:px-16">
          <div className="relative aspect-square w-[min(78vw,46vh)] shrink-0 md:w-[min(46vw,72vh)]">
            {/* oversized and centred on the box (see OVERSIZE) */}
            <canvas
              ref={canvasRef}
              className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 transition-opacity duration-1000"
              style={{ width: `${OVERSIZE * 100}%`, height: `${OVERSIZE * 100}%` }}
              aria-label="Globe turning to each destination"
            />
          </div>

          {/* above the globe, which can grow into this column when it zooms in */}
          <div className="relative z-10 flex min-h-[9.5rem] w-full max-w-sm items-center md:min-h-[30rem]">
            <AnimatePresence mode="wait">
              {active ? (
                <motion.div
                  key={active.slug}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.45, ease: EASE }}
                  className="w-full"
                >
                  <Link to={`/${active.slug}`} className="group flex gap-4 md:block">
                    <div
                      className="relative aspect-[4/5] w-28 shrink-0 overflow-hidden rounded-(--radius) bg-cover bg-center md:mb-5 md:w-full"
                      style={{ backgroundImage: active.preview ? `url(${active.preview.poster})` : active.heroBg }}
                    >
                      {/* the portrait preview cut — cropping the wide hero here showed a triptych's side panels */}
                      {(active.preview?.video ?? active.heroVideo) && (
                        <CardVideo key={active.preview?.video ?? active.heroVideo} src={(active.preview?.video ?? active.heroVideo)!} />
                      )}
                    </div>
                    <div className="flex flex-col justify-center">
                      <p className="mb-1 text-[0.68rem] tracking-[0.14em] text-(--color-text-soft) uppercase">
                        {active.eyebrow}
                      </p>
                      <p className="font-display text-[clamp(2rem,5vw,3.4rem)] leading-none font-semibold tracking-tight uppercase">
                        <span className="transition-colors duration-300 group-hover:text-(--hover)" style={{ ["--hover" as string]: active.accent }}>
                          {active.slug}
                        </span>
                        {active.local && (
                          <Local lang={active.local.lang} className="ml-3 align-middle text-[0.45em] font-normal text-(--color-text-soft)">
                            {active.local.name}
                          </Local>
                        )}
                      </p>
                      <p className="mt-2 text-[0.68rem] tracking-[0.14em] text-(--color-text-soft) uppercase">
                        {active.vBottom}
                      </p>
                      <span className="mt-4 text-[0.72rem] tracking-[0.12em] uppercase" style={{ color: active.accent }}>
                        Open the trip →
                      </span>
                    </div>
                  </Link>
                </motion.div>
              ) : (
                <motion.div
                  key="home"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.45, ease: EASE }}
                  // w-full: as a flex item it would otherwise shrink to its text and sit at the left
                  className="w-full text-center md:text-left"
                >
                  <p className="mb-2 text-[0.68rem] tracking-[0.14em] text-(--color-text-soft) uppercase">Starting from</p>
                  <p className="font-display text-[clamp(1.8rem,4vw,2.8rem)] leading-tight font-semibold tracking-tight">
                    {HOME.name}
                  </p>
                  <p className="mt-3 text-[0.72rem] tracking-[0.12em] text-(--color-text-soft) uppercase">
                    Scroll to travel ↓
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  );
}

/** The trip card's looping preview — muted autoplay that also works on iOS. */
function CardVideo({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useAutoplay(ref, [src]);
  return (
    <video
      ref={ref}
      src={src}
      autoPlay
      muted
      loop
      playsInline
      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
    />
  );
}
