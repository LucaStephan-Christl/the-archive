import { useRef } from 'react'
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion'
import landscape from '../assets/images/hero/hero_new.jpeg'

const EASE = [0.16, 1, 0.3, 1] as const
const CURTAIN_EASE = [0.87, 0, 0.13, 1] as const

// intro timeline (seconds) — curtain reveals the photo; only the text is
// timed to follow once it clears
const T = {
  lineStart: 0.9,
  curtainStart: 1.6,
  curtainDuration: 2.2,
  subtitleStart: 4.1,
  titleStart: 4.5,
  scrollHintStart: 5.3,
}

export default function Hero() {
  const shouldReduceMotion = useReducedMotion()
  const frameRef = useRef<HTMLDivElement>(null)

  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const springX = useSpring(mouseX, { stiffness: 55, damping: 20, mass: 0.6 })
  const springY = useSpring(mouseY, { stiffness: 55, damping: 20, mass: 0.6 })

  // subtle — the background is now the only layer doing parallax, so it stays gentle
  const bgX = useTransform(springX, [-0.5, 0.5], [-5, 5])
  const bgY = useTransform(springY, [-0.5, 0.5], [-4, 4])
  const textX = useTransform(springX, [-0.5, 0.5], [-10, 10])
  const textY = useTransform(springY, [-0.5, 0.5], [-7, 7])

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = frameRef.current?.getBoundingClientRect()
    if (!rect) return
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5)
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5)
  }

  function handleMouseLeave() {
    mouseX.set(0)
    mouseY.set(0)
  }

  const d = (seconds: number) => (shouldReduceMotion ? 0.3 : seconds)

  return (
    <section className="relative h-screen min-h-[640px] w-full bg-(--color-bg) p-3 sm:p-6">
      <div
        ref={frameRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative h-full w-full overflow-hidden rounded-(--radius) bg-(--color-bg)"
      >
        <motion.div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${landscape})`, x: shouldReduceMotion ? 0 : bgX, y: shouldReduceMotion ? 0 : bgY }}
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 10, ease: EASE }}
        />

        {/* text sits directly on the photo with mix-blend-mode: difference —
            no isolating stacking context in between, so it genuinely inverts
            against whatever it's over, not just a color choice */}
        <motion.div
          className="absolute inset-0 z-10 mix-blend-difference flex flex-col items-center justify-center px-6 text-center"
          style={{
            x: shouldReduceMotion ? 0 : textX,
            y: shouldReduceMotion ? 0 : textY,
          }}
        >
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: d(T.subtitleStart) }}
            className="mb-4 text-[0.78rem] tracking-[0.28em] text-(--color-text) uppercase md:text-sm"
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
          className="absolute bottom-9 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2.5 text-[0.65rem] tracking-[0.16em] text-(--color-text)/60 uppercase"
        >
          <span>Scroll</span>
          <span className="h-8 w-px animate-pulse bg-(--color-text)/40" />
        </motion.div>

        {!shouldReduceMotion && (
          <>
            <motion.div
              className="absolute inset-x-0 top-0 z-30 h-1/2 bg-(--color-bg)"
              initial={{ y: '0%' }}
              animate={{ y: '-100%' }}
              transition={{ duration: T.curtainDuration, ease: CURTAIN_EASE, delay: T.curtainStart }}
            />
            <motion.div
              className="absolute inset-x-0 bottom-0 z-30 h-1/2 bg-(--color-bg)"
              initial={{ y: '0%' }}
              animate={{ y: '100%' }}
              transition={{ duration: T.curtainDuration, ease: CURTAIN_EASE, delay: T.curtainStart }}
            />
            <motion.div
              className="absolute inset-x-0 top-1/2 z-40 h-px -translate-y-1/2 bg-(--color-text)"
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: [0, 1, 1], opacity: [0, 1, 0] }}
              transition={{ duration: 1.6, times: [0, 0.5, 1], ease: 'easeInOut', delay: T.lineStart }}
            />
          </>
        )}
      </div>
    </section>
  )
}
