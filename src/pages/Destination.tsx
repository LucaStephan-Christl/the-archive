import { useEffect, useRef } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import Portal from "../components/Portal";
import { useAutoplay } from "../lib/useAutoplay";
import Experience from "../components/Experience";
import Footer from "../components/Footer";
import { destinations, type Destination as Trip } from "../data/trips";

export default function Destination() {
  const { slug } = useParams<{ slug: string }>();
  const destination =
    slug && Object.hasOwn(destinations, slug) ? destinations[slug as Trip["slug"]] : undefined;

  const portalWrapperRef = useRef<HTMLDivElement>(null);
  // iOS: guarantee muted autoplay (see useAutoplay)
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  useAutoplay(heroVideoRef, [slug]);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: portalWrapperRef,
    offset: ["start start", "end start"],
  });
  const labelOpacity = useTransform(
    scrollYProgress,
    [0, 0.15],
    reduceMotion ? [0, 0] : [1, 0],
  );
  const heroScale = useTransform(
    scrollYProgress,
    [0, 1],
    reduceMotion ? [1, 1] : [1.15, 1],
  );

  useEffect(() => {
    if (!destination) return;
    document.documentElement.dataset.dest = destination.slug;
    return () => {
      delete document.documentElement.dataset.dest;
    };
  }, [destination]);

  if (!destination) return <Navigate to="/" replace />;

  return (
    <div>
      <div
        ref={portalWrapperRef}
        className={`relative w-full ${reduceMotion ? "h-screen" : "h-[300vh]"}`}
      >
        <div className="sticky top-0 h-screen w-full overflow-hidden bg-(--color-bg)">
          {destination.heroVideo ? (
            // Framed like the homepage hero (inset padding + rounded corners)
            // rather than full-bleed, so the portal's circular hole — always
            // centred on the viewport — opens onto a deliberately-composed
            // shot instead of a raw edge-to-edge crop. Uses heroFit ("contain"
            // for a portrait clip) rather than cover — cropping a portrait
            // video to fill a landscape frame blows it up far past its
            // native framing. The cursor preview (CustomCursor.tsx) stays
            // on cover independently — a small circle reads better filled.
            <motion.div className="absolute inset-0 p-3 sm:p-6" style={{ scale: heroScale }}>
              <div className="relative h-full w-full overflow-hidden rounded-(--radius) bg-(--color-bg)">
                {/* soft glow in the letterbox around a portrait clip — a plain
                    gradient (smooth at any size, no per-frame cost) */}
                {destination.heroFit === "contain" && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 hidden opacity-25 landscape:block"
                    style={{
                      background: `radial-gradient(ellipse 60% 90% at 50% 50%, ${destination.accent} 0%, transparent 100%)`,
                    }}
                  />
                )}
                {/* heroBg (the poster frame) sits behind the video with the
                    same fit, so it shows instead of black until playback starts.
                    "contain" (portrait clip, letterboxed on wide screens) turns
                    into cover on portrait screens — a portrait clip on a phone
                    fills it naturally instead of leaving bands top and bottom. */}
                <video
                  ref={heroVideoRef}
                  className={`absolute inset-0 h-full w-full bg-center bg-no-repeat object-center ${
                    destination.heroFit === "contain"
                      ? "bg-contain object-contain portrait:bg-cover portrait:object-cover"
                      : "bg-cover object-cover"
                  }`}
                  style={{ backgroundImage: destination.heroBg }}
                  src={destination.heroVideo}
                  preload="auto"
                  autoPlay
                  muted
                  loop
                  playsInline
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              className="absolute inset-0 bg-(--color-bg) bg-center bg-no-repeat"
              style={{
                scale: heroScale,
                backgroundImage: destination.heroBg,
                backgroundSize: destination.heroFit,
              }}
            />
          )}

          <Portal
            kind={destination.kind}
            scrollYProgress={scrollYProgress}
            reduceMotion={!!reduceMotion}
          />

          <motion.span
            className="vlabel absolute top-7 left-7 text-[0.78rem] font-medium tracking-[0.1em] text-(--color-landing-ink) uppercase"
            style={{ opacity: labelOpacity }}
          >
            {destination.vTop}
          </motion.span>
          <motion.span
            className="vlabel absolute bottom-7 left-7 text-[0.78rem] font-medium tracking-[0.1em] text-(--color-landing-ink) uppercase"
            style={{ opacity: labelOpacity }}
          >
            {destination.vBottom}
          </motion.span>
          <motion.div
            className="absolute top-7 right-7"
            style={{ opacity: labelOpacity }}
          >
            <Link
              to="/"
              className="text-[0.74rem] tracking-wide text-(--color-landing-soft) hover:text-(--color-landing-ink)"
            >
              ← The Archive
            </Link>
          </motion.div>

          <motion.div
            className="absolute bottom-9 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2.5 text-[0.65rem] tracking-[0.16em] text-(--color-landing-soft) uppercase"
            style={{ opacity: labelOpacity }}
          >
            <span>Scroll</span>
            <span className="h-8 w-px animate-pulse bg-(--color-landing-soft)" />
          </motion.div>
        </div>
      </div>

      <Experience destination={destination} />
      <Footer />
    </div>
  );
}
