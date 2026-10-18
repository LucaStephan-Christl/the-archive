import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
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
const SUPERCUT = '/media/home/supercut.mp4'
const SUPERCUT_POSTER = '/media/home/supercut-poster.webp'

// intro timeline (seconds)
const T = {
  count: 1.1, // per number: 3 · 2 · 1
  flash: 3.3, // the projector fires
  stripIn: 3.42,
  roll: 3.4, // the strip racing up, slowing, catching
  hold: 0.05, // barely a beat on the caught frame
  project: 1.3, // that frame growing to fill the screen
}
const LANDED_AT = T.stripIn + T.roll + T.hold + T.project

// ---- the reel ---------------------------------------------------------------------

const VIDEO_FRAMES = 11
const PHOTO_FRAMES = 3
const AFTER_TARGET = 3 // frames below the caught one, so the strip doesn't just end
const START_PITCHES = 8 // how many frames the strip races through before catching
const ANGLE = -7 // the strip runs across the screen at a slight tilt (deg)
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
function useReel(): { frames: Frame[]; targetIndex: number } {
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
    return { frames: [...reel, { src: SUPERCUT, video: true, target: true }, ...tail], targetIndex: reel.length }
  }, [])
}

function ReelVideo({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  useAutoplay(ref, [src])
  return <video ref={ref} src={src} autoPlay muted loop playsInline preload="auto" className="h-full w-full object-cover" />
}

/** the hero at rest; left on its poster for reduced motion */
function SupercutVideo({ videoRef, play }: { videoRef: React.RefObject<HTMLVideoElement | null>; play: boolean }) {
  useAutoplay(play ? videoRef : { current: null }, [play])
  return (
    <video
      ref={videoRef}
      src={SUPERCUT}
      poster={SUPERCUT_POSTER}
      autoPlay={play}
      muted
      loop
      playsInline
      preload="auto"
      className="h-full w-full object-cover"
    />
  )
}

// ---- the leader countdown ----------------------------------------------------------

/** Academy-leader style countdown: a sweeping wedge over crosshairs and rings, 3 · 2 · 1. */
function Leader({ number }: { number: number }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-[#1b1a18]">
      <div
        key={number}
        className="absolute aspect-square w-[max(150vw,150vh)] rounded-full"
        style={{
          background:
            'conic-gradient(from 0deg, rgba(255,250,235,0.13) 0deg, rgba(255,250,235,0.13) var(--sweep), transparent var(--sweep))',
          animation: `leader-sweep ${T.count}s linear forwards`,
        }}
      />
      <div className="absolute inset-x-0 top-1/2 h-px bg-[#d9d2c3]/45" />
      <div className="absolute inset-y-0 left-1/2 w-px bg-[#d9d2c3]/45" />
      <div className="absolute aspect-square w-[min(64vw,64vh)] rounded-full border-2 border-[#d9d2c3]/60" />
      <div className="absolute aspect-square w-[min(54vw,54vh)] rounded-full border border-[#d9d2c3]/40" />
      <span className="relative font-display text-[min(34vw,34vh)] leading-none font-bold text-[#ebe4d4]">{number}</span>
    </div>
  )
}

// ---- film look: grain, flicker, scratches, vignette ---------------------------------

function FilmTexture({ strong }: { strong: boolean }) {
  return (
    <div className={`pointer-events-none absolute inset-0 z-40 overflow-hidden ${strong ? '' : 'film-calm'}`} aria-hidden="true">
      <div className="film-grain" />
      <div className="film-flicker" />
      <div className="film-scratch" style={{ left: '23%', animationDuration: '1.7s' }} />
      <div className="film-scratch" style={{ left: '71%', animationDuration: '2.3s', animationDelay: '-0.8s' }} />
      <div className="film-scratch film-scratch--dark" style={{ left: '48%', animationDuration: '3.1s', animationDelay: '-1.4s' }} />
      <div className="film-vignette" />
    </div>
  )
}

/**
 * The opening sequence as a projected film: an academy-leader countdown
 * (3 · 2 · 1), the projector firing, then a 35mm strip of the archive —
 * mostly moving clips — rattling through the gate, slowing and catching on
 * the hero photo, which is then projected up to fill the screen as the title
 * settles. Grain, flicker, scratches and gate weave throughout; after the
 * landing they calm to a texture. Plays once per session; any click, key,
 * scroll or tap skips it.
 */
export default function Hero() {
  const reduceMotion = useReducedMotion()
  const sectionRef = useRef<HTMLElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const targetRef = useRef<HTMLDivElement>(null)
  const heroVideoRef = useRef<HTMLVideoElement>(null)
  const { frames, targetIndex } = useReel()

  const [skipIntro] = useState(() => {
    if (reduceMotion) return true
    try {
      return sessionStorage.getItem(SEEN_KEY) === '1'
    } catch {
      return false
    }
  })

  type Phase = 'leader' | 'strip' | 'project' | 'done'
  const [phase, setPhase] = useState<Phase>(skipIntro ? 'done' : 'leader')
  const [count, setCount] = useState(3)
  const [flash, setFlash] = useState(false)

  // strip position (px; negative = up) and the projection's progress
  const stripX = useMotionValue(0)
  const project = useMotionValue(skipIntro ? 1 : 0)
  const velocity = useVelocity(stripX)
  const blur = useTransform(velocity, (v) => `blur(${Math.min(5, Math.abs(v) / 900).toFixed(2)}px)`)

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
      setFrameW(Math.round(Math.min(640, el.clientWidth * 0.62, el.clientHeight * 0.85)))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  // where the projection starts: the caught frame's box, as % of the screen
  const fromRect = useRef<Rect | null>(null)

  useEffect(() => {
    if (skipIntro) return
    try {
      sessionStorage.setItem(SEEN_KEY, '1')
    } catch {
      /* private mode */
    }
    const timers: ReturnType<typeof setTimeout>[] = []
    const anims: { stop: () => void }[] = []
    const at = (s: number, fn: () => void) => timers.push(setTimeout(fn, s * 1000))

    at(T.count, () => setCount(2))
    at(T.count * 2, () => setCount(1))
    at(T.flash, () => setFlash(true))
    at(T.flash + 0.1, () => setFlash(false))
    at(T.stripIn, () => {
      setPhase('strip')
      // race in from the right; the slight overshoot in the curve is the jolt as it catches
      const target = -targetIndex * pitchRef.current
      stripX.set(target + pitchRef.current * START_PITCHES)
      anims.push(animate(stripX, target, { duration: T.roll, ease: [0.15, 0.7, 0.3, 1.04] }))
    })
    at(T.stripIn + T.roll + T.hold, () => {
      const el = targetRef.current
      const screen = frameRef.current?.getBoundingClientRect()
      if (el && screen) {
        // the frame is tilted, so take its centre from the bounding box and its size untransformed
        const box = el.getBoundingClientRect()
        const cx = box.left + box.width / 2 - screen.left
        const cy = box.top + box.height / 2 - screen.top
        fromRect.current = {
          x: ((cx - el.offsetWidth / 2) / screen.width) * 100,
          y: ((cy - el.offsetHeight / 2) / screen.height) * 100,
          w: (el.offsetWidth / screen.width) * 100,
          h: (el.offsetHeight / screen.height) * 100,
          r: ANGLE,
        }
      }
      // pick the supercut up exactly where the strip's copy of it is, so the cut is invisible
      const onStrip = targetRef.current?.querySelector('video')
      if (onStrip && heroVideoRef.current) heroVideoRef.current.currentTime = onStrip.currentTime
      project.set(0.001) // re-derive the box from the measured frame before it's shown
      setPhase('project')
      anims.push(animate(project, 1, { duration: T.project, ease: [0.4, 0, 0.15, 1] }))
    })
    at(LANDED_AT, () => setPhase('done'))

    const events = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const
    const stopListening = () => events.forEach((e) => window.removeEventListener(e, skip))
    function skip() {
      timers.forEach(clearTimeout)
      anims.forEach((a) => a.stop())
      setFlash(false)
      project.set(1)
      setPhase('done')
      stopListening()
    }
    events.forEach((e) => window.addEventListener(e, skip, { passive: true }))
    at(LANDED_AT, stopListening)
    return () => {
      timers.forEach(clearTimeout)
      anims.forEach((a) => a.stop())
      stopListening()
    }
  }, [skipIntro, targetIndex, stripX, project])

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
    <section ref={sectionRef} className="relative h-screen min-h-[640px] w-full bg-(--color-bg) p-3 sm:p-6">
      <div
        ref={frameRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => {
          mouseX.set(0)
          mouseY.set(0)
        }}
        className="relative h-full w-full overflow-hidden rounded-(--radius) bg-[#0c0b0a]"
      >
        {/* everything projected sits in the "gate": warm grade + the weave of film in a projector */}
        <div className={`absolute inset-0 film-grade ${phase === 'done' ? '' : 'film-weave'}`}>
          {/* projector light on the screen behind the strip */}
          {phase === 'strip' && (
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,236,200,0.1),transparent_65%)]" />
          )}

          {/* the film strip — mounted from the start so the clips are loaded by the time it runs.
              A zero-size pivot at the centre tilts it; the strip slides along its own length. */}
          {phase !== 'done' && (
            <div
              className="absolute top-1/2 left-1/2 h-0 w-0"
              style={{ rotate: `${ANGLE}deg`, opacity: phase === 'strip' ? 1 : 0, transition: 'opacity 0.6s' }}
            >
              <motion.div
                className="absolute top-0 left-0 w-max"
                style={{ x: stripX, y: '-50%', marginLeft: -(gap + frameW / 2), filter: blur }}
              >
                <div
                  className="film-strip film-strip--h flex items-center"
                  style={{ height: frameH + hole * 8, gap, paddingInline: gap, '--hole': `${hole}px` } as CSSProperties}
                >
                  {frames.map((f, i) => (
                    <div
                      key={i}
                      ref={f.target ? targetRef : undefined}
                      className="relative shrink-0 rounded-[3px] bg-black"
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
                    </div>
                  ))}
                </div>
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
              <SupercutVideo videoRef={heroVideoRef} play={!reduceMotion} />
            </motion.div>
          </motion.div>

          {phase === 'leader' && <Leader number={count} />}
        </div>

        {/* the projector firing */}
        {flash && <div className="absolute inset-0 z-30 bg-[#fff6e0]" />}

        <FilmTexture strong={phase !== 'done'} />

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
          <span className="pointer-events-none absolute right-6 bottom-6 z-50 text-[0.6rem] tracking-[0.2em] text-[#ebe4d4]/40 uppercase">
            Click to skip
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
  /** rotation (deg) */
  r: number
}
const FULL: Rect = { x: 0, y: 0, w: 100, h: 100, r: 0 }

/** left/top/width/height (in % of the screen) and tilt tweening from the caught frame's box to full screen */
function useProjection(project: MotionValue<number>, from: React.RefObject<Rect | null>) {
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t
  const f = () => from.current ?? FULL
  const left = useTransform(project, (p) => `${lerp(f().x, 0, p)}%`)
  const top = useTransform(project, (p) => `${lerp(f().y, 0, p)}%`)
  const width = useTransform(project, (p) => `${lerp(f().w, 100, p)}%`)
  const height = useTransform(project, (p) => `${lerp(f().h, 100, p)}%`)
  const borderRadius = useTransform(project, (p) => `${lerp(3, 0, p)}px`)
  const rotate = useTransform(project, (p) => lerp(f().r, 0, p))
  return { left, top, width, height, borderRadius, rotate }
}
