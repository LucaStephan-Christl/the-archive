import { Link } from 'react-router-dom'
import DissolveCanvas from '../components/DissolveCanvas'
import GrainOverlay from '../components/GrainOverlay'
import { homeGrid } from '../data/trips'

const typeRows = [
  { sample: 'Clash 600', size: '2.2rem', label: 'display / stack' },
  { sample: 'Clash 500', size: '1.3rem', label: 'section label' },
  { sample: 'Inter 400', size: '1rem', label: 'body' },
  { sample: 'Inter 500', size: '.75rem', label: 'eyebrow / UI' },
]

const tokenSwatches = [
  { bg: '#0d0d0f', name: 'bg default' },
  { bg: '#c9c4b6', name: 'accent default' },
  { bg: '#120d0d', name: 'bg japan' },
  { bg: '#a8402f', name: 'accent japan' },
  { bg: '#0a0f12', name: 'bg iceland' },
  { bg: '#5f93a0', name: 'accent iceland' },
]

export default function ArchiveHome() {
  return (
    <div className="relative min-h-screen bg-(--color-bg) text-(--color-text)">
      <GrainOverlay />

      <header className="relative z-10 px-8 pt-6">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <span className="font-display text-[1.15rem] font-semibold tracking-tight">The Archive</span>
          <span className="text-[0.68rem] tracking-[0.1em] uppercase text-(--color-text-soft) [font-variant-numeric:tabular-nums]">
            Vol. 01 — Personal travel record
          </span>
        </div>
        <hr className="mt-4 border-t-2 border-(--color-text)" />
        <hr className="mt-1 border-t border-(--color-line)" />
        <nav className="flex gap-7 py-3.5">
          <span className="border-b-2 border-(--color-accent) pb-1.5 text-[0.74rem] text-(--color-text)">
            <b className="mr-1.5 font-medium text-(--color-accent)">01</b>All trips
          </span>
          <Link to="/japan" className="border-b-2 border-transparent pb-1.5 text-[0.74rem] text-(--color-text-soft) hover:text-(--color-text)">
            <b className="mr-1.5 font-medium">02</b>Japan
          </Link>
          <Link to="/iceland" className="border-b-2 border-transparent pb-1.5 text-[0.74rem] text-(--color-text-soft) hover:text-(--color-text)">
            <b className="mr-1.5 font-medium">03</b>Iceland
          </Link>
        </nav>
      </header>

      <section className="relative z-10 px-8 pt-12 pb-8">
        <p className="mb-4 text-[0.72rem] tracking-[0.16em] uppercase text-(--color-accent)">Currently viewing — all trips</p>
        <h1 className="relative mb-10 max-w-[1200px]">
          <span className="block font-display text-[clamp(2.8rem,10.5vw,8.6rem)] leading-[0.86] font-semibold tracking-[-0.03em] uppercase whitespace-nowrap">
            Everywhere
          </span>
          <span className="block font-display text-[clamp(2.8rem,10.5vw,8.6rem)] leading-[0.86] font-semibold tracking-[-0.03em] uppercase whitespace-nowrap ml-[clamp(0px,14vw,220px)]">
            we have
          </span>
          <span className="block font-display text-[clamp(2.8rem,10.5vw,8.6rem)] leading-[0.86] font-semibold tracking-[-0.03em] uppercase whitespace-nowrap">
            been.
          </span>
          <span
            className="hero-photo-mask absolute -bottom-5 w-[min(30vw,340px)] aspect-[4/5] [right:clamp(0px,6vw,120px)] bg-cover bg-center [filter:grayscale(1)_contrast(1.08)_brightness(0.92)] transition-transform duration-500 hover:scale-[1.045]"
            style={{ background: 'linear-gradient(160deg,#3a3630,#161513)' }}
          />
        </h1>
        <p className="max-w-[40ch] text-[0.92rem] leading-relaxed text-(--color-text-soft)">
          Clash Display, stacked and overlapping, carries the weight. Inter stays quiet underneath — captions, dates, the parts you read but don't linger on.
        </p>
      </section>

      <section className="relative z-10 flex items-center gap-3.5 px-8 pb-12">
        <DissolveCanvas text="ALL TRIPS" className="h-14 w-[220px] flex-none cursor-pointer" />
        <p className="text-[0.72rem] tracking-wide text-(--color-text-soft)">hover the mark — the place name dissolves into grain</p>
      </section>

      <p className="relative z-10 mb-5 flex items-baseline gap-2.5 px-8">
        <span className="text-[0.72rem] text-(--color-accent)">02</span>
        <span className="text-[0.72rem] tracking-[0.14em] uppercase text-(--color-text-soft)">Selected frames</span>
      </p>
      <div className="relative z-10 grid grid-cols-4 gap-3.5 px-8 pb-16 max-[760px]:grid-cols-2">
        {homeGrid.map((tile) => (
          <div key={tile.caption} className={`relative overflow-hidden rounded-[3px] aspect-[3/4] ${tile.wide ? 'col-span-2 aspect-[16/10]' : ''}`}>
            <div className="absolute inset-0" style={{ background: tile.bg }} />
            <span className="absolute bottom-2.5 left-2.5 z-10 rounded-[3px] bg-black/32 px-2.5 py-1.5 text-[0.72rem] text-white backdrop-blur-md backdrop-saturate-150">
              {tile.caption}
            </span>
          </div>
        ))}
      </div>

      <p className="relative z-10 mb-5 flex items-baseline gap-2.5 px-8">
        <span className="text-[0.72rem] text-(--color-accent)">03</span>
        <span className="text-[0.72rem] tracking-[0.14em] uppercase text-(--color-text-soft)">System</span>
      </p>
      <div className="relative z-10 grid grid-cols-[1.1fr_1fr] gap-12 border-t border-(--color-line) px-8 pt-12 pb-20 max-[760px]:grid-cols-1">
        <div>
          <h3 className="mb-5 text-[0.72rem] font-medium tracking-[0.12em] uppercase text-(--color-text-soft)">Type scale</h3>
          {typeRows.map((row) => (
            <div key={row.label} className="flex items-baseline gap-4 border-b border-(--color-line) py-2.5">
              <span className="font-display font-semibold" style={{ fontSize: row.size }}>
                Aa
              </span>
              <span className="ml-auto whitespace-nowrap text-[0.7rem] text-(--color-text-soft)">{row.label}</span>
            </div>
          ))}
        </div>
        <div>
          <h3 className="mb-5 text-[0.72rem] font-medium tracking-[0.12em] uppercase text-(--color-text-soft)">Theme tokens</h3>
          <div className="flex flex-wrap gap-2.5">
            {tokenSwatches.map((s) => (
              <div key={s.name} className="w-16">
                <div className="mb-1.5 h-16 w-16 rounded-md border border-(--color-line)" style={{ background: s.bg }} />
                <span className="text-[0.68rem] text-(--color-text-soft)">{s.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="relative z-10 flex justify-between border-t border-(--color-line) px-8 py-6 text-[0.68rem] tracking-[0.08em] uppercase text-(--color-text-soft)">
        <span>The Archive — est. 2024</span>
        <span>142 trips · 08,412 frames</span>
      </div>
    </div>
  )
}
