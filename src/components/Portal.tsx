import GrainOverlay from './GrainOverlay'
import type { DestinationKind } from '../data/trips'

interface PortalProps {
  kind: DestinationKind
  background: string
  zooming: boolean
  onEnter: () => void
}

/**
 * The flag-homage portal: Japan gets the hinomaru circle, Iceland the
 * Nordic cross (offset toward the hoist, official 18:25 proportions).
 * The shape is a mask over a photo/video — clicking zooms it fullscreen.
 */
export default function Portal({ kind, background, zooming, onEnter }: PortalProps) {
  const shapeClass = kind === 'circle' ? 'portal-circle' : 'portal-cross-inner'

  return (
    <div className="relative w-[min(38vw,460px)] h-[min(38vw,460px)] [animation:rise-fade_0.8s_cubic-bezier(0.2,0.7,0.3,1)_both] [animation-delay:0.25s]">
      <button
        type="button"
        onClick={onEnter}
        aria-label={`Enter the ${kind === 'circle' ? 'Japan' : 'Iceland'} archive`}
        className="absolute inset-0 cursor-pointer overflow-hidden border-none bg-transparent p-0 transition-transform duration-500 ease-[cubic-bezier(0.2,0.7,0.3,1)] hover:scale-[1.025]"
      >
        {kind === 'cross' && <span className="portal-cross-white absolute inset-0 bg-white" />}
        <span
          className={`absolute inset-0 bg-cover bg-center transition-[transform,filter] duration-[1150ms] ease-[cubic-bezier(0.6,0,0.2,1)] ${shapeClass} ${
            zooming ? 'scale-[26] brightness-[1.12] saturate-[1.1]' : ''
          }`}
          style={{ background }}
        />
        <GrainOverlay className={shapeClass} />
      </button>
      <span
        className={`absolute left-1/2 -bottom-9 -translate-x-1/2 whitespace-nowrap text-[0.68rem] tracking-[0.14em] uppercase text-(--color-landing-soft) transition-opacity duration-300 ${
          zooming ? 'opacity-0' : ''
        }`}
      >
        click to enter
      </span>
    </div>
  )
}
