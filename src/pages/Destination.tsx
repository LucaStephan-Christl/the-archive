import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import Portal from '../components/Portal'
import Experience from '../components/Experience'
import { destinations } from '../data/trips'

export default function Destination() {
  const { slug } = useParams<{ slug: string }>()
  const destination = slug === 'japan' || slug === 'iceland' ? destinations[slug] : undefined

  const [zooming, setZooming] = useState(false)
  const [landingLeaving, setLandingLeaving] = useState(false)
  const [experienceActive, setExperienceActive] = useState(false)

  useEffect(() => {
    if (!destination) return
    document.documentElement.dataset.dest = destination.slug
    return () => {
      delete document.documentElement.dataset.dest
    }
  }, [destination])

  if (!destination) return <Navigate to="/" replace />

  function handleEnter() {
    setZooming(true)
    setTimeout(() => setLandingLeaving(true), 550)
    setTimeout(() => setExperienceActive(true), 750)
  }

  function handleBack() {
    setExperienceActive(false)
    setZooming(false)
    setLandingLeaving(false)
  }

  return (
    <div className="relative h-screen min-h-[640px] overflow-hidden">
      <section
        className={`flex h-full items-center justify-center bg-(--color-landing-bg) text-(--color-landing-ink) transition-opacity duration-400 delay-[550ms] ${
          landingLeaving ? 'opacity-0' : 'opacity-100'
        } ${zooming ? 'pointer-events-none' : ''}`}
      >
        <span
          className={`vlabel absolute top-7 left-7 text-[0.78rem] font-medium tracking-[0.1em] uppercase transition-opacity duration-300 [animation:rise-fade_0.7s_cubic-bezier(0.2,0.7,0.3,1)_both] [animation-delay:0.05s] ${
            zooming ? 'opacity-0' : ''
          }`}
        >
          {destination.vTop}
        </span>
        <span
          className={`vlabel absolute bottom-7 left-7 text-[0.78rem] font-medium tracking-[0.1em] uppercase transition-opacity duration-300 [animation:rise-fade_0.7s_cubic-bezier(0.2,0.7,0.3,1)_both] [animation-delay:0.15s] ${
            zooming ? 'opacity-0' : ''
          }`}
        >
          {destination.vBottom}
        </span>
        <Link
          to="/"
          className={`absolute top-7 right-7 text-[0.74rem] tracking-wide text-(--color-landing-soft) transition-opacity duration-300 hover:text-(--color-landing-ink) [animation:rise-fade_0.6s_ease_both] ${
            zooming ? 'opacity-0' : ''
          }`}
        >
          ← The Archive
        </Link>

        <Portal kind={destination.kind} background={destination.portalBg} zooming={zooming} onEnter={handleEnter} />
      </section>

      <Experience destination={destination} active={experienceActive} onBack={handleBack} />
    </div>
  )
}
