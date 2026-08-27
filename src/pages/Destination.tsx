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
        <div className="sticky top-0 h-screen w-full overflow-hidden">
          <motion.div
            className="absolute inset-0"
            style={{ scale: heroScale, background: destination.heroBg }}
          />

          <Portal
            kind={destination.kind}
            scrollYProgress={scrollYProgress}
            reduceMotion={!!reduceMotion}
          />

          <motion.span
            className="vlabel absolute top-7 left-7 text-[0.78rem] font-medium tracking-[0.1em] uppercase"
            style={{ opacity: labelOpacity }}
          >
            {destination.vTop}
          </motion.span>
          <motion.span
            className="vlabel absolute bottom-7 left-7 text-[0.78rem] font-medium tracking-[0.1em] uppercase"
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
    </div>
  );
}
