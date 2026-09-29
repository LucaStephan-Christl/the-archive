import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion'
import { destinations } from '../data/trips'
import Local from './Local'
import { CURSOR_ZONE_ATTR, setCursorState } from '../lib/cursorStore'

const DESTINATION_LIST = Object.values(destinations)
const EASE = [0.4, 0, 0.2, 1] as const

/** Stays hidden over the cinematic hero; slides in once you've scrolled past it. */
export default function Nav() {
  const { scrollY } = useScroll()
  const [visible, setVisible] = useState(false)
  const [open, setOpen] = useState(false)

  useMotionValueEvent(scrollY, 'change', (y) => {
    const threshold = window.innerHeight * 0.55
    setVisible(y > threshold)
  })

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  function close() {
    setOpen(false)
    setCursorState(null)
  }

  return (
    <>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: EASE }}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={close}
        />
      )}

      <motion.div
        initial={{ y: -8, opacity: 0 }}
        animate={visible ? { y: 0, opacity: 1 } : { y: -8, opacity: 0 }}
        transition={{ duration: 0.4, ease: EASE }}
        style={{ pointerEvents: visible ? 'auto' : 'none' }}
        className="fixed inset-x-4 top-4 z-50 mx-auto flex max-w-3xl flex-col sm:inset-x-8 sm:top-6"
      >
        <div className="flex items-center justify-between rounded-full border border-(--color-line) bg-(--color-bg)/80 px-6 py-3 shadow-lg backdrop-blur-md">
          <Link to="/" className="font-display text-[0.82rem] font-medium tracking-tight text-(--color-text)">
            The Archive
          </Link>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-2.5 text-[0.68rem] tracking-[0.1em] text-(--color-text-soft) uppercase transition-colors hover:text-(--color-text)"
          >
            {open ? 'Close' : 'Menu'}
            <span className="relative flex h-3 w-4 flex-col items-center justify-center">
              <motion.span
                className="absolute h-px w-full bg-current"
                animate={{ rotate: open ? 45 : 0, y: open ? 0 : -3 }}
                transition={{ duration: 0.25, ease: EASE }}
              />
              <motion.span
                className="absolute h-px w-full bg-current"
                animate={{ rotate: open ? -45 : 0, y: open ? 0 : 3 }}
                transition={{ duration: 0.25, ease: EASE }}
              />
            </span>
          </button>
        </div>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="mt-3 overflow-hidden rounded-(--radius) border border-(--color-line) bg-(--color-bg) shadow-2xl"
              onMouseLeave={() => setCursorState(null)}
              {...{ [CURSOR_ZONE_ATTR]: '' }}
            >
              <div className="flex flex-col px-6 py-4 sm:px-10">
                {DESTINATION_LIST.map((destination, i) => (
                  <Link
                    key={destination.slug}
                    to={`/${destination.slug}`}
                    onClick={close}
                    onMouseEnter={() =>
                      setCursorState({
                        label: 'Enter',
                        color: destination.accent,
                        image: destination.heroBg,
                        video: destination.heroVideo,
                      })
                    }
                    className="group flex items-baseline justify-between gap-6 border-b border-(--color-line) py-5 transition-opacity duration-300 last:border-b-0"
                  >
                    <div className="flex items-baseline gap-5">
                      <span className="text-[0.72rem] text-(--color-text-soft)">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span
                        className="font-display text-[clamp(2rem,6vw,3.6rem)] leading-none font-semibold tracking-tight uppercase text-(--color-text) transition-colors duration-300"
                        style={{ ['--hover-color' as string]: destination.accent }}
                      >
                        <span className="transition-colors duration-300 group-hover:text-(--hover-color)">
                          {destination.slug}
                        </span>
                      </span>
                      {destination.local && (
                        <Local lang={destination.local.lang} className="text-[1.1rem] text-(--color-text-soft)">
                          {destination.local.name}
                        </Local>
                      )}
                    </div>
                    <span className="hidden text-[0.68rem] tracking-[0.14em] text-(--color-text-soft) uppercase sm:block">
                      {destination.eyebrow}
                    </span>
                  </Link>
                ))}
              </div>

              <div className="flex justify-between border-t border-(--color-line) px-6 py-4 text-[0.64rem] tracking-[0.08em] text-(--color-text-soft) uppercase sm:px-10">
                <span>The Archive — est. 2026</span>
                <span>2 trips · 256 frames</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  )
}
