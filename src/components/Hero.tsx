import { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import landscape from "../assets/images/hero/landscape.webp";
import figureCutout from "../assets/images/hero/figure-cutout.webp";

const EASE = [0.16, 1, 0.3, 1] as const;
const CURTAIN_EASE = [0.87, 0, 0.13, 1] as const;

// intro timeline (seconds) — curtain reveals the photo (landscape + figure
// together, nothing slides in separately); only the text is timed to follow
const T = {
  lineStart: 0.9,
  curtainStart: 1.6,
  curtainDuration: 2.2,
  subtitleStart: 4.1,
  titleStart: 4.5,
  scrollHintStart: 5.3,
};

// native landscape.webp dimensions and the figure-cutout's exact bounding box
// within that same image — lets us position the cutout with the same
// left/top/width/height math the browser uses for `background-size: cover`,
// so it always lands on the same patch of the photo regardless of frame size.
const IMAGE_SIZE = { w: 1086, h: 724 };
const FIGURE_BBOX = { x: 53, y: 427, w: 854 - 53, h: 724 - 427 };

function useCoverRect(containerRef: React.RefObject<HTMLElement | null>) {
  const [rect, setRect] = useState({ left: 0, top: 0, width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function update() {
      const { width: cw, height: ch } = el!.getBoundingClientRect();
      if (!cw || !ch) return;
      const scale = Math.max(cw / IMAGE_SIZE.w, ch / IMAGE_SIZE.h);
      const displayW = IMAGE_SIZE.w * scale;
      const displayH = IMAGE_SIZE.h * scale;
      const offsetX = (cw - displayW) / 2;
      const offsetY = (ch - displayH) / 2;
      setRect({
        left: offsetX + FIGURE_BBOX.x * scale,
        top: offsetY + FIGURE_BBOX.y * scale,
        width: FIGURE_BBOX.w * scale,
        height: FIGURE_BBOX.h * scale,
      });
    }

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef]);

  return rect;
}

export default function Hero() {
  const shouldReduceMotion = useReducedMotion();
  const frameRef = useRef<HTMLDivElement>(null);
  const figureRect = useCoverRect(frameRef);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 55, damping: 20, mass: 0.6 });
  const springY = useSpring(mouseY, { stiffness: 55, damping: 20, mass: 0.6 });

  const bgX = useTransform(springX, [-0.5, 0.5], [-8, 8]);
  const bgY = useTransform(springY, [-0.5, 0.5], [-6, 6]);
  const textX = useTransform(springX, [-0.5, 0.5], [-18, 18]);
  const textY = useTransform(springY, [-0.5, 0.5], [-12, 12]);
  const figureX = useTransform(springX, [-0.5, 0.5], [-14, 14]);
  const figureY = useTransform(springY, [-0.5, 0.5], [-10, 10]);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  }

  function handleMouseLeave() {
    mouseX.set(0);
    mouseY.set(0);
  }

  const d = (seconds: number) => (shouldReduceMotion ? 0.3 : seconds);

  return (
    <section className="relative h-screen min-h-[640px] w-full bg-(--color-bg) p-3 sm:p-6">
      <div
        ref={frameRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative h-full w-full overflow-hidden rounded-[28px] bg-(--color-bg)"
      >
        {/* shared "stage" — background and figure both live here so the same
            slow Ken Burns zoom scales them in lockstep and they never drift
            apart from each other */}
        <motion.div
          className="absolute inset-0"
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 10, ease: EASE }}
        >
          {/* the background plate has the figure removed (a separate photo
              from the same spot), so the parallax never reveals a duplicate
              of the sharp foreground cutout underneath it */}
          <motion.div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${landscape})`,
              x: shouldReduceMotion ? 0 : bgX,
              y: shouldReduceMotion ? 0 : bgY,
            }}
          />

          {/* figure — closest depth layer, occludes the title where they overlap.
              Positioned with the exact same cover-fit math as the background
              above, so it always sits on the same patch of the photo. Present
              from the very first frame — revealed by the curtain, never
              animates in on its own. */}
          {figureRect.width > 0 && (
            <motion.img
              src={figureCutout}
              alt=""
              aria-hidden="true"
              className="absolute z-20 object-contain drop-shadow-[0_25px_50px_rgba(0,0,0,0.5)]"
              style={{
                left: figureRect.left,
                top: figureRect.top,
                width: figureRect.width,
                height: figureRect.height,
                x: shouldReduceMotion ? 0 : figureX,
                y: shouldReduceMotion ? 0 : figureY,
              }}
            />
          )}
        </motion.div>

        {/* title — middle depth layer, sits behind the figure; only this fades in late */}
        <motion.div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center"
          style={{
            x: shouldReduceMotion ? 0 : textX,
            y: shouldReduceMotion ? 0 : textY,
          }}
        >
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.8,
              ease: EASE,
              delay: d(T.subtitleStart),
            }}
            className="mb-4 text-[0.78rem] tracking-[0.28em] text-(--color-text)/70 uppercase md:text-sm"
          >
            Personal travel archive — Luca Christl
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.1, ease: EASE, delay: d(T.titleStart) }}
            className="font-display text-[clamp(3.6rem,15vw,11.5rem)] leading-[0.88] font-bold tracking-tight text-(--color-text) uppercase"
          >
            The Archive
          </motion.h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: d(T.scrollHintStart) }}
          className="absolute z-50 bottom-9 left-1/2  flex -translate-x-1/2 flex-col items-center gap-2.5 text-[0.65rem] tracking-[0.16em] text-(--color-text)/60 uppercase"
        >
          <span>Scroll</span>
          <span className="h-8 w-px animate-pulse bg-(--color-text)/40" />
        </motion.div>

        {!shouldReduceMotion && (
          <>
            <motion.div
              className="absolute inset-x-0 top-0 z-30 h-1/2 bg-(--color-bg)"
              initial={{ y: "0%" }}
              animate={{ y: "-100%" }}
              transition={{
                duration: T.curtainDuration,
                ease: CURTAIN_EASE,
                delay: T.curtainStart,
              }}
            />
            <motion.div
              className="absolute inset-x-0 bottom-0 z-30 h-1/2 bg-(--color-bg)"
              initial={{ y: "0%" }}
              animate={{ y: "100%" }}
              transition={{
                duration: T.curtainDuration,
                ease: CURTAIN_EASE,
                delay: T.curtainStart,
              }}
            />
            <motion.div
              className="absolute inset-x-0 top-1/2 z-40 h-px -translate-y-1/2 bg-(--color-text)"
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: [0, 1, 1], opacity: [0, 1, 0] }}
              transition={{
                duration: 1.6,
                times: [0, 0.5, 1],
                ease: "easeInOut",
                delay: T.lineStart,
              }}
            />
          </>
        )}
      </div>
    </section>
  );
}
