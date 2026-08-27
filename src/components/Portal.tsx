import { motion, useTransform, type MotionValue } from "framer-motion";
import type { DestinationKind } from "../data/trips";

const ICELAND_BLUE = "#00308f";

// The sticky pin (see Destination.tsx) only lasts the first 2/3 of scroll
// progress — past that the wrapper starts sliding away regardless of what
// this animation is doing. The reveal must land exactly at that point with
// zero velocity, or it visibly snaps right as the slide-away begins.
const REVEAL_END = 0.667;

function easedProgress(p: number) {
  const t = Math.min(Math.max(p / REVEAL_END, 0), 1);
  return 1 - Math.pow(1 - t, 3); // cubic ease-out: reaches 1 with zero slope
}

interface PortalProps {
  kind: DestinationKind;
  scrollYProgress: MotionValue<number>;
  reduceMotion: boolean;
}

/**
 * The flag-homage portal: Japan gets the hinomaru circle, Iceland the
 * Nordic cross (offset toward the hoist, official 18:25 proportions).
 * Both render as a full-viewport field of flag colour with a shape-shaped
 * hole in it — a window onto the real page underneath. Scrolling grows that
 * hole (the mask radius for Japan, shrinking corner tiles for Iceland)
 * directly, rather than scaling the whole layer — a large `transform:
 * scale()` combined with `mask-image` is unreliable across browsers and can
 * drop the mask entirely, flashing the layer's own flat colour.
 */
export default function Portal({
  kind,
  scrollYProgress,
  reduceMotion,
}: PortalProps) {
  const holeVmin = useTransform(scrollYProgress, (p) =>
    reduceMotion ? 150 : 20 + easedProgress(p) * 130,
  );
  // Two explicit stops only — no trailing "white 100%" marker. Mixing that
  // with absolute vmin lengths that can exceed the box's own 100% (its
  // farthest-corner distance, which varies by aspect ratio) forces the
  // browser to reorder/clamp the stops, which can render as a torn or
  // partially-updated frame. A radial-gradient simply extends its last
  // colour outward past the final stop, so this isn't needed anyway.
  const circleMask = useTransform(
    holeVmin,
    (r) =>
      `radial-gradient(circle at 50% 50%, transparent 0, transparent ${r}vmin, white ${r + 0.6}vmin)`,
  );

  const cornerScale = useTransform(scrollYProgress, (p) =>
    reduceMotion ? 0 : 1 - easedProgress(p),
  );
  const tlWidth = useTransform(cornerScale, (s) => `${24 * s}%`);
  const tlHeight = useTransform(cornerScale, (s) => `${27.5 * s}%`);
  const trWidth = useTransform(cornerScale, (s) => `${52 * s}%`);
  const trHeight = useTransform(cornerScale, (s) => `${27.5 * s}%`);
  const blWidth = useTransform(cornerScale, (s) => `${24 * s}%`);
  const blHeight = useTransform(cornerScale, (s) => `${39 * s}%`);
  const brWidth = useTransform(cornerScale, (s) => `${52 * s}%`);
  const brHeight = useTransform(cornerScale, (s) => `${39 * s}%`);

  return (
    <div className="absolute inset-0" aria-hidden="true">
      {kind === "circle" ? (
        <motion.div
          className="absolute inset-0 bg-white"
          style={{ maskImage: circleMask, WebkitMaskImage: circleMask }}
        />
      ) : (
        <>
          <motion.div
            className="absolute top-0 left-0"
            style={{ width: tlWidth, height: tlHeight, background: ICELAND_BLUE }}
          />
          <motion.div
            className="absolute top-0 right-0"
            style={{ width: trWidth, height: trHeight, background: ICELAND_BLUE }}
          />
          <motion.div
            className="absolute bottom-0 left-0"
            style={{ width: blWidth, height: blHeight, background: ICELAND_BLUE }}
          />
          <motion.div
            className="absolute bottom-0 right-0"
            style={{ width: brWidth, height: brHeight, background: ICELAND_BLUE }}
          />
        </>
      )}
    </div>
  );
}
