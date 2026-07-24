import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useMotionValueEvent, useScroll } from 'framer-motion'

/** Stays hidden over the cinematic hero; slides in once you've scrolled past it. */
export default function Nav() {
  const { scrollY } = useScroll()
  const [visible, setVisible] = useState(false)

  useMotionValueEvent(scrollY, 'change', (y) => {
    const threshold = window.innerHeight * 0.55
    setVisible(y > threshold)
  })

  return (
    <motion.header
      initial={{ y: -8, opacity: 0 }}
      animate={visible ? { y: 0, opacity: 1 } : { y: -8, opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.2, 0.7, 0.3, 1] }}
      style={{ pointerEvents: visible ? 'auto' : 'none' }}
      className="fixed inset-x-0 top-0 z-50 border-b border-(--color-line) bg-(--color-bg)/70 backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <span className="font-display text-[0.82rem] font-medium tracking-tight text-(--color-text)">The Archive</span>
        <nav className="flex items-center gap-5 text-[0.68rem] tracking-wide">
          <span className="text-(--color-text)">All trips</span>
          <Link to="/japan" className="text-(--color-text-soft) hover:text-(--color-text)">
            Japan
          </Link>
          <Link to="/iceland" className="text-(--color-text-soft) hover:text-(--color-text)">
            Iceland
          </Link>
        </nav>
        <span className="hidden text-[0.6rem] tracking-[0.08em] text-(--color-text-soft)/80 uppercase sm:block">Vol. 01</span>
      </div>
    </motion.header>
  )
}
