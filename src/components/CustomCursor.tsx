import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  CURSOR_ZONE_ATTR,
  getCursorState,
  setCursorState,
  useCursorState,
} from "../lib/cursorStore";

/**
 * A mix-blend-mode dot that follows the pointer, layered on top of the
 * normal OS cursor rather than replacing it. Stays invisible until the
 * first real mousemove so it never flashes at (0, 0) before we know
 * where the pointer actually is.
 *
 * Any component can call `setCursorState` (from `lib/cursorStore`) to grow
 * this into a coloured, labelled "active" pill instead — used by the
 * homepage's hover destination list.
 */
export default function CustomCursor() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);
  const active = useCursorState();

  useEffect(() => {
    const pointer = { x: -1, y: -1 };

    // Drop a stale preview once the pointer is no longer over a zone that
    // set it — see CURSOR_ZONE_ATTR for why mouseleave alone isn't enough.
    const clearIfOutsideZone = () => {
      if (!getCursorState() || pointer.x < 0) return;
      const el = document.elementFromPoint(pointer.x, pointer.y);
      if (!el?.closest(`[${CURSOR_ZONE_ATTR}]`)) setCursorState(null);
    };

    const updateMousePosition = (e: MouseEvent) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      setMousePosition({ x: e.clientX, y: e.clientY });
      setVisible(true);
      clearIfOutsideZone();
    };

    window.addEventListener("mousemove", updateMousePosition);
    window.addEventListener("scroll", clearIfOutsideZone, { passive: true });
    return () => {
      window.removeEventListener("mousemove", updateMousePosition);
      window.removeEventListener("scroll", clearIfOutsideZone);
    };
  }, []);

  const hasVideo = !!active?.video;
  const hasImage = !hasVideo && !!active?.image;
  const showPreview = hasVideo || hasImage;
  const size = showPreview ? 140 : active ? 88 : 32;
  // Always fills the circle (never "contain") regardless of the source
  // media's own orientation/fit elsewhere — a small preview reads better
  // cropped-to-fill than letterboxed.

  return (
    <motion.div
      className="custom-cursor flex items-center justify-center overflow-hidden whitespace-nowrap bg-center bg-no-repeat"
      style={{
        mixBlendMode: active ? "normal" : "difference",
        // Set directly rather than through `animate` — a background image
        // swap can't meaningfully interpolate frame-to-frame anyway, and
        // framer-motion only recognises a specific set of style keys for
        // its animate object (backgroundColor is one; backgroundImage/
        // backgroundSize aren't, and get silently dropped if passed there).
        // Also shown under a video preview, as its poster while it loads.
        backgroundImage: showPreview && active.image ? active.image : "none",
        backgroundSize: showPreview ? "cover" : undefined,
      }}
      // Prepend a constant -50%/-50% centring offset to framer's own
      // generated x/y transform, so the dot stays centred on the pointer
      // no matter its current (possibly mid-transition) size — the
      // browser recomputes that percentage against the live rendered box
      // every frame. (`left`/`top` aren't in framer's recognised animate
      // value types and get silently dropped, and a plain static
      // `translateX/Y` in `style` would fight framer's own x/y channel —
      // `transformTemplate` is the supported way to compose the two.)
      transformTemplate={(_latest, generated) => `translate(-50%, -50%) ${generated}`}
      animate={{
        x: mousePosition.x,
        y: mousePosition.y,
        width: size,
        height: size,
        borderRadius: 999,
        backgroundColor: showPreview ? "#0d0d0f" : active ? active.color : "#ffffff",
        opacity: visible ? 1 : 0,
      }}
      transition={{ type: "tween", ease: "backOut", duration: 0.25 }}
    >
      {hasVideo && (
        // key={active.video} forces a fresh <video> per source so it
        // restarts cleanly switching between destinations mid-hover.
        <video
          key={active.video}
          className="absolute inset-0 h-full w-full"
          style={{ objectFit: "cover", objectPosition: "center" }}
          src={active.video}
          autoPlay
          muted
          loop
          playsInline
        />
      )}
      {active && !showPreview && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.08, duration: 0.15 }}
          className="text-[0.68rem] font-semibold tracking-[0.08em] text-white uppercase"
        >
          {active.label}
        </motion.span>
      )}
    </motion.div>
  );
}
