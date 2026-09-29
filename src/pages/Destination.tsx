import { useEffect, useRef } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import Portal from "../components/Portal";
import Experience from "../components/Experience";
import { destinations } from "../data/trips";

export default function Destination() {
  const { slug } = useParams<{ slug: string }>();
  const destination = slug === "japan" || slug === "iceland" ? destinations[slug] : undefined;

  const portalWrapperRef = useRef<HTMLDivElement>(null);
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
                {/* heroBg (the poster frame) sits behind the video with the
                    same fit, so it shows instead of black until playback starts */}
                <video
                  className="absolute inset-0 h-full w-full bg-center bg-no-repeat"
                  style={{
                    objectFit: destination.heroFit,
                    objectPosition: "center",
                    backgroundImage: destination.heroBg,
                    backgroundSize: destination.heroFit,
                  }}
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
          {destination.local?.hero && (
            <motion.span
              lang={destination.local.lang}
              className="tategaki absolute top-1/2 right-7 -translate-y-1/2 font-jp text-[1.05rem] tracking-[0.35em] text-(--color-landing-ink)"
              style={{ opacity: labelOpacity }}
            >
              {destination.local.hero}
            </motion.span>
          )}
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
    </div>
  );
}
