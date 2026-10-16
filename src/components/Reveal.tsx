import { motion } from "framer-motion";
import type { ReactNode } from "react";

const EASE = [0.2, 0.7, 0.3, 1] as const;

/** Fades + rises its children in once they scroll into view; fires once. */
export default function Reveal({
  children,
  className = "",
  delay = 0,
  amount = 0.15,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  /** share of the element that must be on screen to trigger — use 0 for very tall blocks */
  amount?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration: 0.7, ease: EASE, delay: delay / 1000 }}
    >
      {children}
    </motion.div>
  );
}
