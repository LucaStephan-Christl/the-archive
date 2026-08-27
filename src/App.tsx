import { useEffect, useRef, useState } from 'react'
import { animate, motion, useMotionValue } from 'framer-motion'
import { Route, Routes, useLocation } from 'react-router-dom'
import Lenis from 'lenis'
import CustomCursor from './components/CustomCursor'
import ArchiveHome from './pages/ArchiveHome'
import Destination from './pages/Destination'

// same curtain mechanic and easing as the Hero intro reveal (Hero.tsx) —
// two panels meet at the centre, hide the page swap, then part again.
const CURTAIN_EASE = [0.87, 0, 0.13, 1] as const
const CURTAIN_DURATION = 0.5

export default function App() {
  const lenisRef = useRef<Lenis | null>(null)
  const location = useLocation()
  const [displayLocation, setDisplayLocationState] = useState(location)
  const displayLocationRef = useRef(location)
  const topY = useMotionValue('-100%')
  const bottomY = useMotionValue('100%')
  const lineOpacity = useMotionValue(0)

  function setDisplayLocation(loc: typeof location) {
    displayLocationRef.current = loc
    setDisplayLocationState(loc)
  }

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    })
    lenisRef.current = lenis

    let rafId = requestAnimationFrame(function raf(time) {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    })

    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
      lenisRef.current = null
    }
  }, [])

  // Closes the curtain, swaps the actual page content and resets scroll
  // while the screen is fully covered, then opens the curtain again — the
  // route change itself (and the URL) happens immediately via react-router;
  // only what's *displayed* is held back until the curtain hides the swap.
  useEffect(() => {
    if (location.pathname === displayLocationRef.current.pathname) return
    let cancelled = false

    async function transition() {
      await Promise.all([
        animate(topY, '0%', { duration: CURTAIN_DURATION, ease: CURTAIN_EASE }),
        animate(bottomY, '0%', { duration: CURTAIN_DURATION, ease: CURTAIN_EASE }),
      ])
      if (cancelled) return

      lineOpacity.set(1)
      lenisRef.current?.scrollTo(0, { immediate: true })
      window.scrollTo(0, 0)
      setDisplayLocation(location)

      await new Promise((resolve) => setTimeout(resolve, 90))
      if (cancelled) return
      lineOpacity.set(0)

      await Promise.all([
        animate(topY, '-100%', { duration: CURTAIN_DURATION, ease: CURTAIN_EASE }),
        animate(bottomY, '100%', { duration: CURTAIN_DURATION, ease: CURTAIN_EASE }),
      ])
    }

    transition()
    return () => {
      cancelled = true
    }
  }, [location, topY, bottomY, lineOpacity])

  return (
    <>
      <CustomCursor />
      <Routes location={displayLocation}>
        <Route path="/" element={<ArchiveHome />} />
        <Route path="/:slug" element={<Destination />} />
      </Routes>

      <motion.div
        className="pointer-events-none fixed inset-x-0 top-0 z-[9000] h-1/2 bg-(--color-bg)"
        style={{ y: topY }}
      />
      <motion.div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[9000] h-1/2 bg-(--color-bg)"
        style={{ y: bottomY }}
      />
      <motion.div
        className="pointer-events-none fixed inset-x-0 top-1/2 z-[9001] h-px -translate-y-1/2 bg-(--color-text)"
        style={{ opacity: lineOpacity }}
      />
    </>
  )
}
