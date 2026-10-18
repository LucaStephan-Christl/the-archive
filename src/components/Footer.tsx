import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Local from "./Local";
import { dayPlaces, getTripMedia, type MediaItem } from "../data/media";
import { tripsOldestFirst } from "../data/trips";

const EMAIL = "luca.christl4221@gmail.com";
const SOCIALS = [
  { label: "LinkedIn", href: "https://www.linkedin.com/in/luca-christl-36a783308/" },
  { label: "GitHub", href: "https://github.com/LucaStephan-Christl" },
  { label: "Instagram", href: "https://www.instagram.com/luca.christl01/" },
];

// EXIF model → the name you'd actually say
const CAMERA_NAMES: Record<string, string> = {
  "DC-S9": "Panasonic Lumix S9",
  "Canon EOS 200D": "Canon EOS 200D",
  "DSC-P100": "Sony Cyber-shot P100",
  X10: "Fujifilm X10",
  "COOLPIX A10": "Nikon Coolpix A10",
};

const monthYear = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}Z`));

/** Everything the credits list, derived from the trips and their media — new trips appear on their own. */
function useCredits() {
  return useMemo(() => {
    const trips = tripsOldestFirst.map((trip) => {
      const items = getTripMedia(trip.slug);
      return {
        trip,
        when: items.length ? monthYear(items[0].takenAt) : trip.eyebrow,
        places: dayPlaces(items),
        count: items.length,
      };
    });
    const all: MediaItem[] = tripsOldestFirst.flatMap((t) => getTripMedia(t.slug));
    const counts = new Map<string, number>();
    for (const item of all) if (item.camera) counts.set(item.camera, (counts.get(item.camera) ?? 0) + 1);
    const cameras = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([model]) => CAMERA_NAMES[model] ?? model);
    return {
      trips,
      cameras,
      photos: all.filter((i) => i.type === "image").length,
      videos: all.filter((i) => i.type === "video").length,
    };
  }, []);
}

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/** One credit: a small role line over a larger name, centred like film credits. */
function Credit({ role, children }: { role: string; children: ReactNode }) {
  return (
    <div className="mb-16 text-center sm:mb-20">
      <p className="mb-3 text-[0.66rem] tracking-[0.28em] text-(--color-text-soft) uppercase">{role}</p>
      <div className="font-display text-[clamp(1.35rem,3vw,2.1rem)] leading-tight font-medium tracking-tight">{children}</div>
    </div>
  );
}

/**
 * The footer as closing credits: a pinned screen the credits roll up
 * through at a steady, scroll-driven pace (fading in at the bottom, out at
 * the top), ending on a held final card — "Talk to me".
 */
export default function Footer() {
  const credits = useCredits();
  const wrapperRef = useRef<HTMLElement>(null);
  const rollRef = useRef<HTMLDivElement>(null);
  const [rollHeight, setRollHeight] = useState(0);
  const [vh, setVh] = useState(() => (typeof window === "undefined" ? 800 : window.innerHeight));

  // the scroll distance is the credits' own height, so the roll moves 1:1 with scrolling
  useLayoutEffect(() => {
    const roll = rollRef.current;
    if (!roll) return;
    const measure = () => {
      setRollHeight(roll.offsetHeight);
      setVh(window.innerHeight);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(roll);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  // credits start just below the middle of the screen and end with the final
  // card (the roll's last screen-height) exactly filling the viewport
  const start = vh * 0.55;
  const travel = Math.max(0, rollHeight - vh + start);
  const { scrollYProgress } = useScroll({ target: wrapperRef, offset: ["start start", "end end"] });
  const y = useTransform(scrollYProgress, (p) => start - p * travel);

  const now = useNow();
  const [copied, setCopied] = useState(false);
  async function copyEmail() {
    try {
      await Promise.race([
        navigator.clipboard.writeText(EMAIL),
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 400)),
      ]);
    } catch {
      /* the address is still visible and selectable */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  // "Europe/Zurich" is the time zone for all of Switzerland, Aargau included
  const localTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Zurich",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(now);

  return (
    <footer ref={wrapperRef} className="relative bg-(--color-bg) text-(--color-text)" style={{ height: travel + vh }}>
      <div
        className="sticky top-0 h-screen overflow-hidden"
        // credits fade in at the bottom and out at the top, like a real roll
        style={{
          maskImage: "linear-gradient(transparent 0%, #000 16%, #000 84%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(transparent 0%, #000 16%, #000 84%, transparent 100%)",
        }}
      >
        <motion.div ref={rollRef} style={{ y }} className="px-6">
          {/* the credits keep to a reading column; the final card below uses the full width */}
          <div className="mx-auto max-w-3xl">
          <div className="mb-24 text-center">
            <p className="font-display text-[clamp(2.4rem,7vw,5rem)] leading-none font-semibold tracking-tight uppercase">
              The Archive
            </p>
            <p className="mt-4 text-[0.72rem] tracking-[0.28em] text-(--color-text-soft) uppercase">A travel archive</p>
          </div>

          <Credit role="Photographed & filmed by">Luca Christl</Credit>

          <Credit role="On location in">
            {tripsOldestFirst.map((t, i) => (
              <span key={t.slug}>
                {i > 0 && <span className="text-(--color-text-soft)"> · </span>}
                <span className="capitalize">{t.slug}</span>
              </span>
            ))}
          </Credit>

          {credits.trips.map(({ trip, when, places, count }) => (
            <div key={trip.slug} className="mb-20 text-center sm:mb-24">
              <p className="mb-2 text-[0.66rem] tracking-[0.28em] uppercase" style={{ color: trip.accent }}>
                {when}
              </p>
              <p className="mb-6 font-display text-[clamp(1.8rem,4.5vw,3rem)] leading-none font-semibold tracking-tight uppercase">
                {trip.slug}
                {trip.local && (
                  <Local lang={trip.local.lang} className="ml-3 align-middle text-[0.42em] font-normal text-(--color-text-soft)">
                    {trip.local.name}
                  </Local>
                )}
              </p>
              <ul className="mx-auto grid max-w-xl grid-cols-1 gap-x-10 gap-y-2 text-[0.95rem] sm:grid-cols-2">
                {places.map((place) => (
                  <li key={place.en} className="text-(--color-text)/90">
                    {place.en}
                    <Local lang={place.lang} className="ml-2 text-[0.8rem] text-(--color-text-soft)">
                      {place.ja}
                    </Local>
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-[0.66rem] tracking-[0.2em] text-(--color-text-soft) uppercase">{count} frames</p>
            </div>
          ))}

          <Credit role="Cameras">
            <ul className="space-y-1">
              {credits.cameras.map((camera) => (
                <li key={camera}>{camera}</li>
              ))}
            </ul>
          </Credit>

          <Credit role="In this archive">
            {credits.photos} photographs · {credits.videos} films
          </Credit>

          <Credit role="Starring">Everyone in these photos</Credit>

          <Credit role="Designed & built by">
            Luca Christl
            <p className="mt-2 text-[0.8rem] font-normal tracking-normal text-(--color-text-soft)">
              Frontend Developer · Aargau, Switzerland
            </p>
          </Credit>

          </div>

          {/* the final card — the roll's last screen, held in place at the end */}
          <div className="flex h-screen flex-col items-center justify-center text-center">
            <p className="mb-5 text-[0.66rem] tracking-[0.28em] text-(--color-text-soft) uppercase">Next destination</p>
            <a
              href={`mailto:${EMAIL}`}
              className="group inline-flex items-center gap-3 font-display text-[clamp(2.6rem,10vw,7.5rem)] leading-[0.9] font-bold tracking-tight whitespace-nowrap uppercase"
            >
              Talk to me
              <svg
                width="0.55em"
                height="0.55em"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1"
                aria-hidden="true"
              >
                <path d="M7 17 17 7M8 7h9v9" />
              </svg>
            </a>
            <button
              type="button"
              onClick={copyEmail}
              className="mt-6 cursor-pointer text-[0.95rem] text-(--color-text)/85 hover:text-(--color-text)"
              aria-label={`Copy email address ${EMAIL}`}
            >
              {copied ? "Copied to clipboard ✓" : EMAIL}
            </button>
            <nav className="mt-8 flex gap-8 text-[0.72rem] tracking-[0.16em] text-(--color-text-soft) uppercase">
              {SOCIALS.map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noreferrer" className="hover:text-(--color-text)">
                  {s.label}
                </a>
              ))}
            </nav>
            <p className="mt-14 text-[0.68rem] tracking-[0.14em] text-(--color-text-soft)/80 uppercase [font-variant-numeric:tabular-nums]">
              Aargau {localTime} · © {new Date().getFullYear()} Luca Christl
            </p>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
