import { useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'
import Lenis from 'lenis'
import CustomCursor from './components/CustomCursor'
import ArchiveHome from './pages/ArchiveHome'
import Destination from './pages/Destination'

export default function App() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    })

    let rafId = requestAnimationFrame(function raf(time) {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    })

    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
    }
  }, [])

  return (
    <>
      <CustomCursor />
      <Routes>
        <Route path="/" element={<ArchiveHome />} />
        <Route path="/:slug" element={<Destination />} />
      </Routes>
    </>
  )
}
