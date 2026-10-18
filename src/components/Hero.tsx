import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
  type MotionValue,
} from 'framer-motion'
import { getTripMedia } from '../data/media'
import { tripsOldestFirst } from '../data/trips'
import { useAutoplay } from '../lib/useAutoplay'

const EASE = [0.16, 1, 0.3, 1] as const
const SEEN_KEY = 'archive-intro-seen'
// built by `yarn supercut` from src/data/supercut.json
// — a 16:9 cut, and a 9:16 one for portrait screens (a phone would otherwise see a quarter of the wide one)
interface Supercut {
  video: string
  poster: string
}
const SUPERCUT: Supercut = { video: '/media/home/supercut.mp4', poster: '/media/home/supercut-poster.webp' }
const SUPERCUT_PORTRAIT: Supercut = {
  video: '/media/home/supercut-portrait.mp4',
  poster: '/media/home/supercut-portrait-poster.webp',
}
/** picked once on load — a rotated phone keeps it, object-cover still fills */
function pickSupercut(): Supercut {
  return typeof window !== 'undefined' && window.matchMedia('(max-aspect-ratio: 1/1)').matches ? SUPERCUT_PORTRAIT : SUPERCUT
}

const NUMBER_WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten']

// ---- the opening title cards (typed, held, faded) --------------------------------

interface Line {
  text: string
  /** ms per character */
  typeMs: number
  /** ms the finished line stays up */
  hold: number
}
const FADE_MS = 500
const GAP_MS = 250

function useLines(): Line[] {
  return useMemo(() => {
    const frames = tripsOldestFirst.reduce((n, t) => n + getTripMedia(t.slug).length, 0)
    const countries = tripsOldestFirst.length
    return [
      { text: '...', typeMs: 380, hold: 450 },
      { text: 'Hi — these are some of my best memories.', typeMs: 46, hold: 1300 },
      { text: `${NUMBER_WORDS[countries] ?? countries} countries, ${frames} frames.`, typeMs: 55, hold: 1300 },
      { text: 'With the best companions.', typeMs: 52, hold: 1400 },
    ]
  }, [])
}

/** Types each line, holds it, fades it — then calls onDone. A blinking caret follows the text. */
function Typewriter({ lines, onDone }: { lines: Line[]; onDone: () => void }) {
  const [index, setIndex] = useState(0)
  const [chars, setChars] = useState(0)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    let cancelled = false
    const timers: ReturnType<typeof setTimeout>[] = []
    const at = (ms: number, fn: () => void) => timers.push(setTimeout(() => !cancelled && fn(), ms))
    let t = 350
    lines.forEach((line, i) => {
      at(t, () => {
        setIndex(i)
        setChars(0)
        setFading(false)
      })
      for (let c = 1; c <= line.text.length; c++) at(t + c * line.typeMs, () => setChars(c))
      t += line.text.length * line.typeMs + line.hold
      at(t, () => setFading(true))
      t += FADE_MS + GAP_MS
    })
    at(t - GAP_MS, onDone)
    return () => {
      cancelled = true
      timers.forEach(clearTimeout)
    }
  }, [lines, onDone])

  const line = lines[index]
  return (
    <motion.p
      className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-8 text-center font-display text-[clamp(1.25rem,3vw,2.3rem)] leading-snug font-medium tracking-tight text-(--color-text)"
      animate={{ opacity: fading ? 0 : 1, filter: fading ? 'blur(6px)' : 'blur(0px)' }}
      transition={{ duration: FADE_MS / 1000, ease: 'easeOut' }}
      aria-live="polite"
    >
      <span>
        {line.text.slice(0, chars)}
        <span className="ml-1 inline-block h-[1.05em] w-[0.08em] translate-y-[0.15em] animate-[caret_1s_steps(2)_infinite] bg-(--color-text)" />
      </span>
    </motion.p>
  )
}

// intro timeline after the title cards (seconds)
const T = {
  stripIn: 0.1,
  roll: 3.6, // the camera racing along the strip, slowing, catching
  faceAt: 0.68, // share of the roll after which the camera swings round to face the caught frame…
  face: 1.25, // …taking this long
  project: 1.3, // that frame growing to fill the screen
}
const PROJECT_AT = T.stripIn + T.roll * T.faceAt + T.face
const LANDED_AT = PROJECT_AT + T.project

// ---- the reel ---------------------------------------------------------------------

const VIDEO_FRAMES = 14
const PHOTO_FRAMES = 3
const AFTER_TARGET = 6 // frames past the caught one, trailing off into the distance
const START_PITCHES = 9 // how many frames the camera races past before catching

// The strip in 3D: turned so its right end recedes into the screen, the camera
// panning along it. [start of the roll, end of the roll]; facing the caught
// frame brings everything to 0. Flip the sign of rotateY to swap which end recedes.
const CAMERA = {
  perspective: 2, // × the frame width, so the depth reads the same on a phone as on a desktop
  rotateY: [54, 34], // deg
  rotateX: [10, 5],
  rotateZ: [-6, -3],
  shiftX: [-8, -4], // vw — the near end sits left of centre
}
// share of the reel per trip (relative) — Japan and Iceland lead
const TRIP_WEIGHT: Record<string, number> = { japan: 2.5, iceland: 2.5, budapest: 1, france: 1 }

interface Frame {
  src: string
  video: boolean
  /** the frame the strip catches on — the hero supercut */
  target?: boolean
}

/** tiny seeded PRNG so the reel is the same on every visit */
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
}

/** mostly video loops (weighted to Japan & Iceland), a few stills, then the hero supercut and a short tail */
function useReel(supercut: Supercut): { frames: Frame[]; targetIndex: number } {
  return useMemo(() => {
    const random = rng(23)
    const totalWeight = tripsOldestFirst.reduce((n, t) => n + (TRIP_WEIGHT[t.slug] ?? 1), 0)
    const share = (slug: string, total: number) =>
      Math.max(1, Math.round((total * (TRIP_WEIGHT[slug] ?? 1)) / totalWeight))
    const evenly = <V,>(list: V[], count: number) => {
      const step = list.length / count
      return Array.from({ length: Math.min(count, list.length) }, (_, i) => list[Math.floor(i * step)])
    }
    const shuffle = <V,>(list: V[]) =>
      list
        .map((v) => ({ v, k: random() }))
        .sort((a, b) => a.k - b.k)
        .map((p) => p.v)

    const videos = tripsOldestFirst.flatMap((trip) =>
      evenly(
        getTripMedia(trip.slug).filter((m) => m.type === 'video' && m.mini),
        share(trip.slug, VIDEO_FRAMES),
      ).map((m): Frame => ({ src: m.mini!, video: true })),
    )
    const photos = tripsOldestFirst.flatMap((trip) =>
      evenly(
        getTripMedia(trip.slug).filter((m) => m.type === 'image' && m.thumb && m.width > m.height),
        1,
      ).map((m): Frame => ({ src: m.thumb!, video: false })),
    )
    const reel = shuffle([...shuffle(videos).slice(0, VIDEO_FRAMES), ...shuffle(photos).slice(0, PHOTO_FRAMES)])
    const tail = reel.splice(reel.length - AFTER_TARGET, AFTER_TARGET)
    // the caught frame plays the same file as the hero, so the handoff between them is seamless
    return { frames: [...reel, { src: supercut.video, video: true, target: true }, ...tail], targetIndex: reel.length }
  }, [supercut])
}

function ReelVideo({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  useAutoplay(ref, [src])
  return <video ref={ref} src={src} autoPlay muted loop playsInline preload="auto" className="h-full w-full object-cover" />
}

/**
 * One frame on the strip. Frames that have swept past the camera (far left —
 * in 3D they'd balloon across the screen) fade out; far-off ones dim into the dark.
 */
function StripFrame({
  index,
  stripX,
  pitch,
  ref,
  style,
  children,
}: {
  index: number
  stripX: MotionValue<number>
  pitch: number
  ref?: React.Ref<HTMLDivElement>
  style: CSSProperties
  children: React.ReactNode
}) {
  const opacity = useTransform(stripX, (x) => {
    const pos = (x + index * pitch) / pitch // frames from the centre; negative = nearer the camera
    const near = Math.min(1, Math.max(0, (pos + 1.7) / 0.7))
    const far = Math.min(1, Math.max(0.35, 1 - (pos - 3) / 4))
    return near * far
  })
  return (
    <motion.div ref={ref} className="relative shrink-0 rounded-[3px] bg-black" style={{ ...style, opacity }}>
      {children}
    </motion.div>
  )
}

/** the hero at rest; left on its poster for reduced motion */
function SupercutVideo({
  supercut,
  videoRef,
  play,
}: {
  supercut: Supercut
  videoRef: React.RefObject<HTMLVideoElement | null>
  play: boolean
}) {
  useAutoplay(play ? videoRef : { current: null }, [play])
  return (
    <video
      ref={videoRef}
      src={supercut.video}
      poster={supercut.poster}
      autoPlay={play}
      muted
      loop
      playsInline
      preload="auto"
      className="h-full w-full object-cover"
    />
  )
}

// where each trip's glow starts, and how long its slow drift takes (s)
const GLOWS = [
  { x: 18, y: 28, duration: 23 },
  { x: 78, y: 22, duration: 29 },
  { x: 70, y: 78, duration: 26 },
  { x: 24, y: 74, duration: 31 },
]

/**
 * Ambience behind the intro: each trip's accent colour as a large, soft glow
 * drifting slowly about the dark, and a warm light in the middle that
 * breathes — brighter once the reel is running, like a lamp behind it.
 */
function AmbientLight({ bright }: { bright: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {tripsOldestFirst.map((trip, i) => {
        const glow = GLOWS[i % GLOWS.length]
        return (
          <div
            key={trip.slug}
            className="ambient-glow absolute aspect-square w-[70vmax] rounded-full"
            style={{
              left: `${glow.x}%`,
              top: `${glow.y}%`,
              background: `radial-gradient(circle, ${trip.accent} 0%, transparent 62%)`,
              animationDuration: `${glow.duration}s`,
              animationDelay: `${-i * 4}s`,
            }}
          />
        )
      })}
      <div
        className="ambient-core absolute top-1/2 left-1/2 aspect-[16/10] w-[85vmax] -translate-x-1/2 -translate-y-1/2 rounded-full transition-opacity duration-[1500ms]"
        style={{
          background: 'radial-gradient(ellipse, rgba(255, 226, 180, 0.22) 0%, transparent 60%)',
          opacity: bright ? 1 : 0.55,
        }}
      />
    </div>
  )
}

/**
 * The opening sequence: typed title cards on the dark ("Hi — these are
 * some of my best memories…"), then a 35mm strip of the archive — mostly
 * moving clips — receding into the screen as the camera pans along it,
 * slowing and catching on the hero supercut, which is then projected up to
 * fill the screen as the title settles. Plays once per session; any click,
 * key, scroll or tap skips it.
 */
export default function Hero() {
  const reduceMotion = useReducedMotion()
  const sectionRef = useRef<HTMLElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const targetRef = useRef<HTMLDivElement>(null)
  const heroVideoRef = useRef<HTMLVideoElement>(null)
  const [supercut] = useState(pickSupercut)
  const { frames, targetIndex } = useReel(supercut)

  const [skipIntro] = useState(() => {
    if (reduceMotion) return true
    try {
      return sessionStorage.getItem(SEEN_KEY) === '1'
    } catch {
      return false
    }
  })

  type Phase = 'typing' | 'strip' | 'project' | 'done'
  const [phase, setPhase] = useState<Phase>(skipIntro ? 'done' : 'typing')
  const lines = useLines()
  // the reel's timeline starts once the last title card has faded
  const [rolling, setRolling] = useState(false)
  const skippedRef = useRef(false)
  const startReel = useCallback(() => {
    if (skippedRef.current) return
    setRolling(true)
  }, [])

  // strip position along its length (px), the camera's pan through the roll (0–1),
  // it swinging round to face the caught frame (0–1), and the projection's progress
  const stripX = useMotionValue(0)
  const pan = useMotionValue(0)
  const face = useMotionValue(0)
  const project = useMotionValue(skipIntro ? 1 : 0)
  const velocity = useVelocity(stripX)
  const blur = useTransform(velocity, (v) => `blur(${Math.min(4, Math.abs(v) / 1100).toFixed(2)}px)`)
  const camera = useTransform([pan, face], ([p, f]: number[]) => {
    const at = ([a, b]: number[]) => (a + (b - a) * p) * (1 - f)
    return `translateX(${at(CAMERA.shiftX)}vw) rotateX(${at(CAMERA.rotateX)}deg) rotateY(${at(CAMERA.rotateY)}deg) rotateZ(${at(CAMERA.rotateZ)}deg)`
  })

  // strip geometry follows the viewport
  const [frameW, setFrameW] = useState(560)
  const frameH = Math.round(frameW * 0.62)
  const gap = Math.round(frameW * 0.06)
  const pitch = frameW + gap
  const pitchRef = useRef(pitch)
  pitchRef.current = pitch
  useLayoutEffect(() => {
    const measure = () => {
      const el = frameRef.current
      if (!el) return
      // a bit more of the width on a portrait screen, where the strip has room to spare vertically
      const share = el.clientWidth < el.clientHeight ? 0.74 : 0.6
      setFrameW(Math.round(Math.min(680, el.clientWidth * share, el.clientHeight * 0.8)))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  // where the projection starts: the caught frame's box, as % of the screen
  const fromRect = useRef<Rect | null>(null)

  // the reel's timers and animations, so a skip can stop them whichever stage it's at
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const anims = useRef<{ stop: () => void }[]>([])
  const stopListening = useRef(() => {})

  // any click, key, scroll or tap skips — from the first title card to the landing
  useEffect(() => {
    if (skipIntro) return
    try {
      sessionStorage.setItem(SEEN_KEY, '1')
    } catch {
      /* private mode */
    }
    const events = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const
    const stop = () => events.forEach((e) => window.removeEventListener(e, skip))
    function skip() {
      skippedRef.current = true
      timers.current.forEach(clearTimeout)
      anims.current.forEach((a) => a.stop())
      project.set(1)
      setPhase('done')
      stop()
    }
    events.forEach((e) => window.addEventListener(e, skip, { passive: true }))
    stopListening.current = stop
    return stop
  }, [skipIntro, project])

  useEffect(() => {
    if (!rolling) return
    const pending = timers.current
    const running = anims.current
    const at = (s: number, fn: () => void) => pending.push(setTimeout(fn, s * 1000))

    at(T.stripIn, () => {
      setPhase('strip')
      // frames stream in out of the distance; the slight overshoot in the curve is the jolt as it catches
      const target = -targetIndex * pitchRef.current
      stripX.set(target + pitchRef.current * START_PITCHES)
      running.push(animate(stripX, target, { duration: T.roll, ease: [0.15, 0.7, 0.3, 1.04] }))
      running.push(animate(pan, 1, { duration: T.roll, ease: [0.3, 0, 0.3, 1] }))
    })
    at(T.stripIn + T.roll * T.faceAt, () => {
      running.push(animate(face, 1, { duration: T.face, ease: [0.55, 0, 0.2, 1] }))
    })
    at(PROJECT_AT, () => {
      // facing the camera now, so the frame's on-screen box is a plain rectangle
      const box = targetRef.current?.getBoundingClientRect()
      const screen = frameRef.current?.getBoundingClientRect()
      if (box && screen) {
        fromRect.current = {
          x: ((box.left - screen.left) / screen.width) * 100,
          y: ((box.top - screen.top) / screen.height) * 100,
          w: (box.width / screen.width) * 100,
          h: (box.height / screen.height) * 100,
        }
      }
      // pick the supercut up exactly where the strip's copy of it is, so the cut is invisible
      const onStrip = targetRef.current?.querySelector('video')
      if (onStrip && heroVideoRef.current) heroVideoRef.current.currentTime = onStrip.currentTime
      project.set(0.001) // re-derive the box from the measured frame before it's shown
      setPhase('project')
      running.push(animate(project, 1, { duration: T.project, ease: [0.4, 0, 0.15, 1] }))
    })
    at(LANDED_AT, () => {
      setPhase('done')
      stopListening.current()
    })
    return () => {
      pending.forEach(clearTimeout)
      running.forEach((a) => a.stop())
    }
  }, [rolling, targetIndex, stripX, pan, face, project])

  const projStyle = useProjection(project, fromRect)

  // at rest: gentle mouse parallax; scroll pushes the photo in
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const springX = useSpring(mouseX, { stiffness: 55, damping: 20, mass: 0.6 })
  const springY = useSpring(mouseY, { stiffness: 55, damping: 20, mass: 0.6 })
  const textX = useTransform(springX, [-0.5, 0.5], [-14, 14])
  const textY = useTransform(springY, [-0.5, 0.5], [-9, 9])
  const bgX = useTransform(springX, [-0.5, 0.5], [6, -6])
  const bgY = useTransform(springY, [-0.5, 0.5], [4, -4])
  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (phase !== 'done' || reduceMotion) return
    const rect = frameRef.current?.getBoundingClientRect()
    if (!rect) return
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5)
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5)
  }
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end start'] })
  const scrollScale = useTransform(scrollYProgress, (p) => 1.04 + p * 0.14)
  const titleLift = useTransform(scrollYProgress, (p) => p * -140)
  const titleFade = useTransform(scrollYProgress, (p) => 1 - Math.min(1, p * 1.6))

  const showTitle = phase === 'done'
  const landedNow = phase === 'done' && !skipIntro
  const hole = Math.round(frameW * 0.045)

  return (
    <section ref={sectionRef} className="relative h-svh min-h-[560px] w-full bg-(--color-bg) p-3 sm:p-6">
      <div
        ref={frameRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => {
          mouseX.set(0)
          mouseY.set(0)
        }}
        className="relative h-full w-full overflow-hidden rounded-(--radius) bg-[#0c0b0a]"
      >
        <div className="absolute inset-0">
          {/* ambience behind the title cards and the reel; the supercut covers it once projected */}
          {phase !== 'done' && <AmbientLight bright={phase !== 'typing'} />}

          {/* the film strip — mounted from the start so the clips are loaded by the time it runs.
              A zero-size pivot at the centre carries the camera angle; the strip slides along its length. */}
          {phase !== 'done' && (
            <div
              className="absolute inset-0"
              style={{ perspective: CAMERA.perspective * frameW, opacity: phase === 'strip' ? 1 : 0, transition: 'opacity 0.6s' }}
            >
              <motion.div className="absolute top-1/2 left-1/2 h-0 w-0" style={{ transform: camera }}>
                <motion.div
                  className="absolute top-0 left-0 w-max"
                  style={{ x: stripX, y: '-50%', marginLeft: -(gap + frameW / 2), filter: blur }}
                >
                  <div
                    className="film-strip flex items-center"
                    style={{ height: frameH + hole * 8, gap, paddingInline: gap, '--hole': `${hole}px` } as CSSProperties}
                  >
                    {frames.map((f, i) => (
                      <StripFrame
                        key={i}
                        index={i}
                        stripX={stripX}
                        pitch={pitch}
                        ref={f.target ? targetRef : undefined}
                        style={{ width: frameW, height: frameH }}
                      >
                        <div className="h-full w-full overflow-hidden rounded-[3px]">
                          {f.video ? (
                            <ReelVideo src={f.src} />
                          ) : (
                            <img src={f.src} alt="" className="h-full w-full object-cover" draggable={false} />
                          )}
                        </div>
                        {/* edge codes printed in the margins, like real stock */}
                        <span
                          className="absolute left-[6%] text-[0.55rem] leading-none font-semibold tracking-[0.3em] whitespace-nowrap text-[#e7b34a]/75"
                          style={{ bottom: `calc(100% + ${Math.round(hole * 0.45)}px)` }}
                        >
                          ▸ {String(i + 1).padStart(2, '0')}A
                        </span>
                        {i % 2 === 0 && (
                          <span
                            className="absolute right-[6%] text-[0.55rem] leading-none font-semibold tracking-[0.3em] whitespace-nowrap text-[#e7b34a]/55"
                            style={{ top: `calc(100% + ${Math.round(hole * 0.45)}px)` }}
                          >
                            ARCHIVE 400
                          </span>
                        )}
                      </StripFrame>
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            </div>
          )}

          {/* the hero supercut — mounted (hidden) from the start so it's loaded, projected out
              of the caught frame, then at rest */}
          <motion.div
            className="absolute overflow-hidden"
            style={{ ...projStyle, opacity: phase === 'project' || phase === 'done' ? 1 : 0 }}
          >
            <motion.div
              className="absolute -inset-4"
              style={{ scale: scrollScale, x: reduceMotion ? 0 : bgX, y: reduceMotion ? 0 : bgY }}
            >
              <SupercutVideo supercut={supercut} videoRef={heroVideoRef} play={!reduceMotion} />
            </motion.div>
          </motion.div>
        </div>

        {/* opening title cards, on the dark before the reel */}
        {phase === 'typing' && <Typewriter lines={lines} onDone={startReel} />}

        {/* title: directly on the video with mix-blend-mode: difference */}
        <motion.div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center mix-blend-difference"
          style={{ x: reduceMotion ? 0 : textX, y: reduceMotion ? 0 : textY }}
        >
          <motion.div style={{ y: titleLift, opacity: titleFade }}>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={showTitle ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
              transition={{ duration: 1, ease: EASE, delay: landedNow ? 0.1 : 0 }}
              className="mb-4 text-[0.78rem] tracking-[0.28em] text-(--color-text) uppercase md:text-sm"
            >
              Personal travel archive<span className="hidden sm:inline"> — </span>
              <br className="sm:hidden" />
              Luca Christl
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 30, letterSpacing: '0.06em' }}
              animate={
                showTitle ? { opacity: 1, y: 0, letterSpacing: '-0.025em' } : { opacity: 0, y: 30, letterSpacing: '0.06em' }
              }
              transition={{ duration: 1.6, ease: EASE, delay: landedNow ? 0.3 : 0 }}
              className="font-display text-[clamp(3.6rem,15vw,11.5rem)] leading-[0.88] font-bold text-(--color-text) uppercase"
            >
              The Archive
            </motion.h1>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: showTitle ? 1 : 0 }}
          transition={{ duration: 0.8, delay: landedNow ? 1 : 0 }}
          className="absolute bottom-9 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2.5 text-[0.65rem] tracking-[0.16em] text-(--color-text)/60 uppercase"
        >
          <span>Scroll</span>
          <span className="h-8 w-px animate-pulse bg-(--color-text)/40" />
        </motion.div>

        {phase !== 'done' && (
          <span className="pointer-events-none absolute right-6 bottom-6 z-50 text-[0.6rem] tracking-[0.2em] text-(--color-text)/40 uppercase">
            <span className="pointer-coarse:hidden">Click</span>
            <span className="hidden pointer-coarse:inline">Tap</span> to skip
          </span>
        )}
      </div>
    </section>
  )
}

interface Rect {
  x: number
  y: number
  w: number
  h: number
}
const FULL: Rect = { x: 0, y: 0, w: 100, h: 100 }

/** left/top/width/height (in % of the screen) tweening from the caught frame's box to full screen */
function useProjection(project: MotionValue<number>, from: React.RefObject<Rect | null>) {
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t
  const f = () => from.current ?? FULL
  const left = useTransform(project, (p) => `${lerp(f().x, 0, p)}%`)
  const top = useTransform(project, (p) => `${lerp(f().y, 0, p)}%`)
  const width = useTransform(project, (p) => `${lerp(f().w, 100, p)}%`)
  const height = useTransform(project, (p) => `${lerp(f().h, 100, p)}%`)
  const borderRadius = useTransform(project, (p) => `${lerp(3, 0, p)}px`)
  return { left, top, width, height, borderRadius }
}
