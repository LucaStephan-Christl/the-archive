import { motion } from "framer-motion";
import type { DestinationKind } from "../data/trips";

const EASE_IN = [0.6, 0, 0.2, 1] as const;
const EASE_OUT = [0.2, 0.7, 0.3, 1] as const;

interface PortalProps {
  kind: DestinationKind;
  background: string;
  zooming: boolean;
  onEnter: () => void;
}

/**
 * The flag-homage portal: Japan gets the hinomaru circle, Iceland the
 * Nordic cross (offset toward the hoist, official 18:25 proportions).
 * The shape is a mask over a photo/video — clicking zooms it fullscreen.
 */
export default function Portal({
  kind,
  background,
  zooming,
  onEnter,
}: PortalProps) {
  const shapeClass = kind === "circle" ? "portal-circle" : "portal-cross-inner";

  return (
    <motion.div
      className="relative h-[min(38vw,460px)] w-[min(38vw,460px)]"
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: EASE_OUT, delay: 0.25 }}
    >
      <motion.button
        type="button"
        onClick={onEnter}
        aria-label={`Enter the ${kind === "circle" ? "Japan" : "Iceland"} archive`}
        className="absolute inset-0 cursor-pointer overflow-hidden border-none bg-transparent p-0"
        whileHover={{ scale: 1.025 }}
        transition={{ duration: 0.5, ease: EASE_OUT }}
      >
        {kind === "cross" && (
          <span className="portal-cross-white absolute inset-0 bg-white" />
        )}
        <motion.span
          className={`absolute inset-0 bg-cover bg-center ${shapeClass}`}
          style={{ background }}
          animate={
            zooming
              ? { scale: 26, filter: "brightness(1.12) saturate(1.1)" }
              : { scale: 1, filter: "brightness(1) saturate(1)" }
          }
          transition={{ duration: 1.15, ease: EASE_IN }}
        />
      </motion.button>
      <motion.span
        className="absolute -bottom-9 left-1/2 -translate-x-1/2 text-[0.68rem] tracking-[0.14em] whitespace-nowrap text-(--color-landing-soft) uppercase"
        animate={{ opacity: zooming ? 0 : 1 }}
        transition={{ duration: 0.3 }}
      >
        click to enter
      </motion.span>
    </motion.div>
  );
}
