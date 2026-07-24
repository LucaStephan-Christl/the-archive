import { useRef } from 'react'
import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion'

const MANIFESTO =
  "I don't travel to escape. I travel to notice — the light changing, the silence between places, the scale of things I'll never fully explain. This is where I keep what I saw."

function Word({ word, progress, range }: { word: string; progress: MotionValue<number>; range: [number, number] }) {
  const opacity = useTransform(progress, range, [0.18, 1])
  return (
    <motion.span style={{ opacity }} className="text-(--color-text)">
      {word}{' '}
    </motion.span>
  )
}

/**
 * A pinned manifesto: the section stays put while you scroll through it,
 * and scroll progress fills the text in word by word instead of moving it
 * off screen. Normal scrolling resumes once the last word has lit up.
 */
export default function Manifesto() {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: wrapperRef, offset: ['start start', 'end end'] })
  const words = MANIFESTO.split(' ')

  return (
    <div ref={wrapperRef} className="relative h-[280vh] bg-(--color-bg)">
      <div className="sticky top-0 flex h-screen items-center justify-center px-8 sm:px-16">
        <p className="max-w-4xl text-center font-display text-[clamp(1.9rem,4.4vw,3.6rem)] leading-[1.28] font-bold tracking-tight">
          {words.map((word, i) => (
            <Word key={i} word={word} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]} />
          ))}
        </p>
      </div>
    </div>
  )
}
