import { useEffect, useState } from "react";
import { motion } from "framer-motion";

/**
 * A mix-blend-mode dot that follows the pointer, layered on top of the
 * normal OS cursor rather than replacing it. Stays invisible until the
 * first real mousemove so it never flashes at (0, 0) before we know
 * where the pointer actually is.
 */
export default function CustomCursor() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const updateMousePosition = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX - 16, y: e.clientY - 16 });
      setVisible(true);
    };

    window.addEventListener("mousemove", updateMousePosition);
    return () => window.removeEventListener("mousemove", updateMousePosition);
  }, []);

  return (
    <motion.div
      className="custom-cursor"
      animate={{ x: mousePosition.x, y: mousePosition.y, opacity: visible ? 1 : 0 }}
      transition={{ type: "tween", ease: "backOut", duration: 0.15 }}
    />
  );
}
