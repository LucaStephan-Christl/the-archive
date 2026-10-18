import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from 'framer-motion'
import landscape from '../assets/images/hero/hero_new.jpeg'
import { getTripMedia } from '../data/media'
import { tripsOldestFirst } from '../data/trips'
import { useAutoplay } from '../lib/useAutoplay'

const EASE = [0.16, 1, 0.3, 1] as const
const SEEN_KEY = 'archive-intro-seen'
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

// ---- the tunnel ---------------------------------------------------------------------

const PERSPECTIVE = 1000 // px
const TRAVEL = 10600 // how far the camera flies (px of z)
const FINAL_Z = -12000 // the hero photo waits at the end of the tunnel
const CARD_COUNT = 56
const FLIGHT_S = 11 // the flight itself
const VIDEO_COUNT = 10 // moving cards sprinkled among the photos
const PULL_S = 2.8 // the hero photo pulling in to fill the frame
const PULL_OVERLAP = 1.4 // the landing starts this long before the flight ends — no stop in between

// ---- the flight's speed: calm → rush → drift → bigger rush → into the landing ---------
//
// speed(s) over the flight's own clock s ∈ [0, 1]: a gentle base with two
// gaussian bursts, eased in at the start and never dropping to zero (so the
// camera never stops). Distance travelled is its running integral,
// normalised — sampled once into a lookup table.
const gauss = (s: number, at: number, width: number) => Math.exp(-0.5 * ((s - at) / width) ** 2)
const speedAt = (s: number) => {
  const easeIn = Math.min(1, s / 0.14) ** 2
  return easeIn * (0.42 + 2.4 * gauss(s, 0.28, 0.055) + 3.4 * gauss(s, 0.66, 0.06))
}
const SAMPLES = 400
const DISTANCE: number[] = (() => {
  const out = [0]
  for (let i = 1; i <= SAMPLES; i++) out.push(out[i - 1] + speedAt(i / SAMPLES))
  return out.map((d) => d / out[SAMPLES])
})()
const MAX_SPEED = Math.max(...Array.from({ length: SAMPLES + 1 }, (_, i) => speedAt(i / SAMPLES)))
/** clock (0–1) → distance travelled (0–1) */
const distanceAt = (s: number) => {
  const x = Math.min(1, Math.max(0, s)) * SAMPLES
  const i = Math.floor(x)
  return i >= SAMPLES ? 1 : DISTANCE[i] + (DISTANCE[i + 1] - DISTANCE[i]) * (x - i)
}

/** tiny seeded PRNG so the tunnel is the same on every visit */
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
}

type Surface = 'left' | 'right' | 'top' | 'bottom'
interface WallPhoto {
  src: string
  /** a tiny looping clip instead of a still */
  video?: boolean
  x: number // vw from centre
  y: number // vh from centre
  z: number // starting depth, px
  rotateX: number
  rotateY: number
  size: number // vw
}

// share of the tunnel per trip (relative) — Japan and Iceland lead
const TRIP_WEIGHT: Record<string, number> = { japan: 2.5, iceland: 2.5, budapest: 1, france: 1 }

// mostly walls, some ceiling and floor — a corridor lined with pictures
const SURFACES: Surface[] = ['left', 'right', 'left', 'right', 'top', 'left', 'right', 'bottom']

/** photos taken evenly from every trip, hung along the walls, ceiling and floor of a corridor */
function useTunnel(): WallPhoto[] {
  return useMemo(() => {
    const random = rng(11)
    const totalWeight = tripsOldestFirst.reduce((n, t) => n + (TRIP_WEIGHT[t.slug] ?? 1), 0)
    const share = (slug: string, total: number) => Math.round((total * (TRIP_WEIGHT[slug] ?? 1)) / totalWeight)
    const evenly = <T,>(list: T[], count: number) => {
      const step = list.length / count
      return Array.from({ length: Math.min(count, list.length) }, (_, i) => list[Math.floor(i * step)])
    }
    const shuffle = <T,>(list: T[]) =>
      list
        .map((v) => ({ v, k: random() }))
        .sort((a, b) => a.k - b.k)
        .map((p) => p.v)

    const photos = shuffle(
      tripsOldestFirst.flatMap((trip) => {
        const images = getTripMedia(trip.slug).filter((m) => m.type === 'image' && m.thumb)
        return evenly(images, share(trip.slug, CARD_COUNT - VIDEO_COUNT)).map((m) => ({ src: m.thumb!, video: false }))
      }),
    )
    const videos = shuffle(
      tripsOldestFirst.flatMap((trip) => {
        const clips = getTripMedia(trip.slug).filter((m) => m.type === 'video' && m.mini)
        return evenly(clips, Math.max(1, share(trip.slug, VIDEO_COUNT))).map((m) => ({ src: m.mini!, video: true }))
      }),
    ).slice(0, VIDEO_COUNT)

    // videos spread evenly through the tunnel, from the 4th card on
    const picks = [...photos]
    videos.forEach((v, i) => {
      const at = Math.round(3 + ((i + 0.5) / videos.length) * (picks.length - 3))
      picks.splice(at, 0, v)
    })

    return picks.map(({ src, video }, i) => {
      // clips always go on a wall, where the camera's pans look straight at them
      const surface = video ? (i % 2 ? 'left' : 'right') : SURFACES[i % SURFACES.length]
      const z = -500 - (i / picks.length) * (TRAVEL - 1200) - random() * 180
      const jitter = (n: number) => (random() - 0.5) * n
      switch (surface) {
        case 'left':
          return { src, video, x: -36 + jitter(4), y: jitter(28), z, rotateX: 0, rotateY: 62 + jitter(10), size: 19 + random() * 6 }
        case 'right':
          return { src, video, x: 36 + jitter(4), y: jitter(28), z, rotateX: 0, rotateY: -62 + jitter(10), size: 19 + random() * 6 }
        case 'top':
          return { src, video, x: jitter(36), y: -38 + jitter(4), z, rotateX: -60 + jitter(8), rotateY: 0, size: 16 + random() * 5 }
        default:
          return { src, video, x: jitter(36), y: 38 + jitter(4), z, rotateX: 60 + jitter(8), rotateY: 0, size: 16 + random() * 5 }
      }
    })
  }, [])
}

/** one picture on the corridor wall: moves with the camera, fades in from the dark ahead, out as it passes */
function WallCard({ photo, travel, landed }: { photo: WallPhoto; travel: MotionValue<number>; landed: MotionValue<number> }) {
  const z = useTransform(travel, (t) => photo.z + t * TRAVEL)
  const transform = useTransform(
    z,
    (zz) =>
      `translate3d(calc(-50% + ${photo.x}vw), calc(-50% + ${photo.y}vh), ${zz}px) rotateY(${photo.rotateY}deg) rotateX(${photo.rotateX}deg)`,
  )
  const opacity = useTransform([z, landed, travel] as MotionValue<number>[], ([zz, l, t]: number[]) => {
    const far = Math.min(1, Math.max(0, (zz + 9000) / 2200))
    const near = Math.min(1, Math.max(0, (60 - zz) / 360))
    const started = Math.min(1, t / 0.05) // dark until the camera starts moving
    return far * near * started * (1 - l)
  })
  const className =
    'absolute top-1/2 left-1/2 aspect-[4/5] rounded-[10px] object-cover shadow-[0_25px_70px_rgba(0,0,0,0.55)]'
  const style = { width: `${photo.size}vw`, minWidth: 120, transform, opacity }
  return photo.video ? (
    <TunnelVideo src={photo.src} className={className} style={style} />
  ) : (
    <motion.img src={photo.src} alt="" draggable={false} className={className} style={style} />
  )
}

/** a moving card — tiny muted loop, autoplaying (iOS-safe via useAutoplay) */
function TunnelVideo({ src, className, style }: { src: string; className: string; style: Record<string, unknown> }) {
  const ref = useRef<HTMLVideoElement>(null)
  useAutoplay(ref, [src])
  return <motion.video ref={ref} src={src} className={className} style={style} autoPlay muted loop playsInline preload="auto" />
}

// ---- typewriter ---------------------------------------------------------------------

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

/**
 * The opening sequence, like a film's: typed title cards on black ("Hi —
 * these are some of my best memories…"), then a slow camera flight down a
 * corridor lined with photos from every trip — panning to look at the left
 * wall, then the right — landing on the hero photo as the title settles.
 * Plays once per session (any click, key, scroll or tap skips it); afterwards
 * the scene stays 3D — the mouse tilts it, scrolling pushes the photo in.
 */
export default function Hero() {
  const reduceMotion = useReducedMotion()
  const sectionRef = useRef<HTMLElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const tunnel = useTunnel()
  const lines = useLines()

  const [skipIntro] = useState(() => {
    if (reduceMotion) return true
    try {
      return sessionStorage.getItem(SEEN_KEY) === '1'
    } catch {
      return false
    }
  })

  // one linear clock drives the flight; the camera's distance follows the speed profile
  const clock = useMotionValue(skipIntro ? 1 : 0)
  const travel = useTransform(clock, distanceAt)
  const landed = useMotionValue(skipIntro ? 1 : 0)
  const [typing, setTyping] = useState(!skipIntro)
  const [showText, setShowText] = useState(skipIntro)
  const [done, setDone] = useState(skipIntro)
  const skippedRef = useRef(false)

  // the camera: a slow glide forward, panning left, then right, then a softer look back
  // One continuous sway — left, right, left — that never holds still: a sine
  // wave (so it's always moving and turns smoothly at each end) whose swing
  // grows in from 0 and dies away only as the camera arrives, flowing straight
  // into the landing rather than settling first.
  // driven by the flight's linear clock, not by the distance travelled — the
  // camera's speed varies (rushes), so tying the sway to distance made it lurch and drag
  const yaw = useTransform(clock, (t) => {
    const swell = Math.min(1, t / 0.15) // ease the sway in
    const settle = 1 - t * t * t // and out, only right at the end
    return -15 * Math.sin(t * Math.PI * 2.4) * swell * settle
  })
  const pitch = useTransform(clock, (t) => 2.2 * Math.sin(t * Math.PI * 1.6) * (1 - t * t * t))

  // flight + landing, started when the last title card is fading
  const flightRef = useRef<{ stop: () => void }[]>([])
  // stable, so the typewriter's schedule isn't restarted by a re-render
  const startFlight = useCallback(() => {
    if (skippedRef.current) return
    setTyping(false)
    // the flight eases in but never brakes — it's still moving when the landing
    // takes over, which starts before the flight ends so the two blend
    const flight = animate(clock, 1, { duration: FLIGHT_S, ease: 'linear' })
    const pull = animate(landed, 1, { duration: PULL_S, delay: FLIGHT_S - PULL_OVERLAP, ease: [0.45, 0.05, 0.25, 1] })
    flightRef.current = [flight, pull]
    const textTimer = setTimeout(() => setShowText(true), (FLIGHT_S - PULL_OVERLAP + PULL_S * 0.55) * 1000)
    const doneTimer = setTimeout(() => setDone(true), (FLIGHT_S - PULL_OVERLAP + PULL_S) * 1000)
    flightRef.current.push({ stop: () => clearTimeout(textTimer) }, { stop: () => clearTimeout(doneTimer) })
  }, [clock, landed])

  const stopListeningRef = useRef<() => void>(() => {})

  useEffect(() => {
    if (skipIntro) return
    try {
      sessionStorage.setItem(SEEN_KEY, '1')
    } catch {
      /* private mode — it'll just play again next time */
    }
    new Image().src = landscape // ready by the time the camera arrives

    // any deliberate input jumps to the end
    const skip = () => {
      skippedRef.current = true
      flightRef.current.forEach((a) => a.stop())
      setTyping(false)
      animate(clock, 1, { duration: 0.7, ease: EASE })
      animate(landed, 1, { duration: 0.7, ease: EASE })
      setShowText(true)
      setDone(true)
      cleanup()
    }
    const events = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const
    events.forEach((e) => window.addEventListener(e, skip, { passive: true }))
    function cleanup() {
      events.forEach((e) => window.removeEventListener(e, skip))
    }
    stopListeningRef.current = cleanup
    return () => {
      cleanup()
      flightRef.current.forEach((a) => a.stop())
    }
  }, [skipIntro, clock, landed])

  // once it has played out, scrolling and clicking are just scrolling and clicking again
  useEffect(() => {
    if (done) stopListeningRef.current()
  }, [done])

  // the hero photo: rides the flight from the end of the tunnel, then pulls in to fill the frame
  const heroTransform = useTransform([travel, landed] as MotionValue<number>[], ([t, l]: number[]) => {
    const z = (FINAL_Z + t * TRAVEL) * (1 - l)
    return `translate3d(0, 0, ${z}px)`
  })
  const heroRadius = useTransform(landed, [0, 1], [24, 0])
  const heroOpacity = useTransform(travel, [0, 0.4], [0, 1])

  // at rest: the mouse tilts the whole scene a little — real depth, not a flat shift
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const springX = useSpring(mouseX, { stiffness: 55, damping: 20, mass: 0.6 })
  const springY = useSpring(mouseY, { stiffness: 55, damping: 20, mass: 0.6 })
  const sceneRotateY = useTransform([yaw, springX] as MotionValue<number>[], ([y, m]: number[]) => y + m * 7)
  const sceneRotateX = useTransform([pitch, springY] as MotionValue<number>[], ([p, m]: number[]) => p - m * 5)
  const textX = useTransform(springX, [-0.5, 0.5], [-14, 14])
  const textY = useTransform(springY, [-0.5, 0.5], [-9, 9])

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!done || reduceMotion) return
    const rect = frameRef.current?.getBoundingClientRect()
    if (!rect) return
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5)
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5)
  }

  function handleMouseLeave() {
    mouseX.set(0)
    mouseY.set(0)
  }

  // scrolling away: the photo pushes in, the title drifts up and fades
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end start'] })
  const scrollScale = useTransform(scrollYProgress, (p) => 1 + p * 0.14)
  const titleLift = useTransform(scrollYProgress, (p) => p * -140)
  const titleFade = useTransform(scrollYProgress, (p) => 1 - Math.min(1, p * 1.6))

  // the "warp": the field of view widens as the camera rushes (lower perspective = wider)
  const perspective = useTransform([clock, landed] as MotionValue<number>[], ([s, l]: number[]) => {
    const rush = (speedAt(s) / MAX_SPEED) * (1 - l)
    return PERSPECTIVE - 420 * rush
  })

  return (
    <section ref={sectionRef} className="relative h-screen min-h-[640px] w-full bg-(--color-bg) p-3 sm:p-6">
      <motion.div
        ref={frameRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative h-full w-full overflow-hidden rounded-(--radius) bg-(--color-bg)"
        style={{ perspective }}
      >
        {/* the 3D scene — the camera's pan and the mouse tilt both rotate it */}
        <motion.div
          className="absolute inset-0"
          style={{
            transformStyle: 'preserve-3d',
            rotateX: reduceMotion ? 0 : sceneRotateX,
            rotateY: reduceMotion ? 0 : sceneRotateY,
          }}
        >
          <motion.div
            className="absolute inset-0 overflow-hidden"
            style={{ transform: heroTransform, borderRadius: heroRadius, opacity: heroOpacity }}
          >
            <motion.div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${landscape})`, scale: scrollScale }}
            />
          </motion.div>
          {!skipIntro && tunnel.map((photo, i) => <WallCard key={i} photo={photo} travel={travel} landed={landed} />)}
        </motion.div>

        {/* opening title cards */}
        {typing && <Typewriter lines={lines} onDone={startFlight} />}

        {/* title: directly on the photo with mix-blend-mode: difference, so it
            genuinely inverts against whatever it's over */}
        <motion.div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center mix-blend-difference"
          style={{ x: reduceMotion ? 0 : textX, y: reduceMotion ? 0 : textY }}
        >
          <motion.div style={{ y: titleLift, opacity: titleFade }}>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={showText ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
              transition={{ duration: 1.2, ease: EASE }}
              className="mb-4 text-[0.78rem] tracking-[0.28em] text-(--color-text) uppercase md:text-sm"
            >
              {/* two lines on a phone, split at the dash rather than leaving it dangling */}
              Personal travel archive<span className="hidden sm:inline"> — </span>
              <br className="sm:hidden" />
              Luca Christl
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 30, letterSpacing: '0.06em' }}
              animate={
                showText
                  ? { opacity: 1, y: 0, letterSpacing: '-0.025em' }
                  : { opacity: 0, y: 30, letterSpacing: '0.06em' }
              }
              transition={{ duration: 2, ease: EASE, delay: showText && !skipIntro ? 0.4 : 0 }}
              className="font-display text-[clamp(3.6rem,15vw,11.5rem)] leading-[0.88] font-bold text-(--color-text) uppercase"
            >
              The Archive
            </motion.h1>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: done ? 1 : 0 }}
          transition={{ duration: 1, delay: done && !skipIntro ? 0.8 : 0 }}
          className="absolute bottom-9 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2.5 text-[0.65rem] tracking-[0.16em] text-(--color-text)/60 uppercase"
        >
          <span>Scroll</span>
          <span className="h-8 w-px animate-pulse bg-(--color-text)/40" />
        </motion.div>

        {/* while the intro plays: a quiet hint that it can be skipped */}
        {!skipIntro && !done && (
          <motion.span
            className="pointer-events-none absolute right-6 bottom-6 z-30 text-[0.6rem] tracking-[0.2em] text-(--color-text)/35 uppercase"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2, duration: 1 }}
          >
            Click to skip
          </motion.span>
        )}
      </motion.div>
    </section>
  )
}
