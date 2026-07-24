import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import Portal from "../components/Portal";
import Experience from "../components/Experience";
import { destinations } from "../data/trips";

const EASE_OUT = [0.2, 0.7, 0.3, 1] as const;

export default function Destination() {
  const { slug } = useParams<{ slug: string }>();
  const destination = slug === "japan" || slug === "iceland" ? destinations[slug] : undefined;

  const [zooming, setZooming] = useState(false);
  const [landingLeaving, setLandingLeaving] = useState(false);
  const [experienceActive, setExperienceActive] = useState(false);

  useEffect(() => {
    if (!destination) return;
    document.documentElement.dataset.dest = destination.slug;
    return () => {
      delete document.documentElement.dataset.dest;
    };
  }, [destination]);

  if (!destination) return <Navigate to="/" replace />;

  function handleEnter() {
    setZooming(true);
    setTimeout(() => setLandingLeaving(true), 550);
    setTimeout(() => setExperienceActive(true), 750);
  }

  function handleBack() {
    setExperienceActive(false);
    setZooming(false);
    setLandingLeaving(false);
  }

  return (
    <div className="relative h-screen min-h-[640px] overflow-hidden">
      <motion.section
        className={`flex h-full items-center justify-center bg-(--color-landing-bg) text-(--color-landing-ink) ${zooming ? "pointer-events-none" : ""}`}
        animate={{ opacity: landingLeaving ? 0 : 1 }}
        transition={{ duration: 0.4, ease: EASE_OUT, delay: landingLeaving ? 0.55 : 0 }}
      >
        <motion.span
          className="vlabel absolute top-7 left-7 text-[0.78rem] font-medium tracking-[0.1em] uppercase"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: zooming ? 0 : 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.05 }}
        >
          {destination.vTop}
        </motion.span>
        <motion.span
          className="vlabel absolute bottom-7 left-7 text-[0.78rem] font-medium tracking-[0.1em] uppercase"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: zooming ? 0 : 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.15 }}
        >
          {destination.vBottom}
        </motion.span>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: zooming ? 0 : 1 }}
          transition={{ duration: 0.6 }}
          className="absolute top-7 right-7"
        >
          <Link
            to="/"
            className="text-[0.74rem] tracking-wide text-(--color-landing-soft) hover:text-(--color-landing-ink)"
          >
            ← The Archive
          </Link>
        </motion.div>

        <Portal kind={destination.kind} background={destination.portalBg} zooming={zooming} onEnter={handleEnter} />
      </motion.section>

      <Experience destination={destination} active={experienceActive} onBack={handleBack} />
    </div>
  );
}
