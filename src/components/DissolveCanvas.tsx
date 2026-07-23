import { useEffect, useRef } from 'react'

interface Particle {
  ox: number
  oy: number
  x: number
  y: number
}

/**
 * Renders `text` as scattered points; on hover the points drift into grain
 * and settle back when the pointer leaves. Rebuilds whenever `text` changes
 * so the same canvas can represent different destinations/states.
 */
export default function DissolveCanvas({ text, className = '' }: { text: string; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hoveringRef = useRef(false)
  const particlesRef = useRef<Particle[]>([])
  const sizeRef = useRef({ width: 0, height: 0 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let rafId = 0

    function buildParticles() {
      const { width, height } = sizeRef.current
      if (!width || !height) return
      const off = document.createElement('canvas')
      off.width = width
      off.height = height
      const octx = off.getContext('2d')
      if (!octx) return
      const size = Math.min(height * 0.62, width / (Math.max(text.length, 1) * 0.6))
      octx.font = `600 ${size}px "Clash Display", sans-serif`
      octx.textAlign = 'center'
      octx.textBaseline = 'middle'
      octx.fillStyle = '#fff'
      octx.fillText(text, width / 2, height / 2)
      const data = octx.getImageData(0, 0, width, height).data
      const step = 2
      const particles: Particle[] = []
      for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
          const alpha = data[(y * width + x) * 4 + 3]
          if (alpha > 120) particles.push({ ox: x, oy: y, x, y })
        }
      }
      particlesRef.current = particles
    }

    function layout() {
      const rect = canvas!.getBoundingClientRect()
      sizeRef.current = { width: rect.width, height: rect.height }
      canvas!.width = rect.width * dpr
      canvas!.height = rect.height * dpr
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      buildParticles()
    }

    function draw() {
      const { width, height } = sizeRef.current
      ctx!.clearRect(0, 0, width, height)
      const accent = getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim() || '#c9c4b6'
      const hovering = hoveringRef.current
      ctx!.fillStyle = hovering ? accent : '#f1efe9'
      for (let i = 0; i < particlesRef.current.length; i++) {
        const p = particlesRef.current[i]
        const target = hovering
          ? { x: p.ox + Math.sin(i * 13.1) * 22, y: p.oy + Math.cos(i * 7.3) * 22 }
          : { x: p.ox, y: p.oy }
        p.x += (target.x - p.x) * 0.09
        p.y += (target.y - p.y) * 0.09
        ctx!.globalAlpha = hovering ? 0.6 : 1
        ctx!.fillRect(p.x, p.y, 2, 2)
      }
      ctx!.globalAlpha = 1
      rafId = requestAnimationFrame(draw)
    }

    const ro = new ResizeObserver(layout)
    ro.observe(canvas)

    const onEnter = () => (hoveringRef.current = true)
    const onLeave = () => (hoveringRef.current = false)
    canvas.addEventListener('mouseenter', onEnter)
    canvas.addEventListener('mouseleave', onLeave)
    canvas.addEventListener('touchstart', () => (hoveringRef.current = !hoveringRef.current), { passive: true })

    document.fonts.ready.then(layout)
    layout()

    if (reduceMotion) {
      const { width, height } = sizeRef.current
      ctx.fillStyle = '#f1efe9'
      ctx.font = '600 28px "Clash Display", sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(text, width / 2, height / 2)
    } else {
      draw()
    }

    return () => {
      cancelAnimationFrame(rafId)
      ro.disconnect()
      canvas.removeEventListener('mouseenter', onEnter)
      canvas.removeEventListener('mouseleave', onLeave)
    }
  }, [text])

  return <canvas ref={canvasRef} className={className} />
}
