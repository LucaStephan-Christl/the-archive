import { Link } from "react-router-dom";
import Footer from "../components/Footer";
import Hero from "../components/Hero";
import Manifesto from "../components/Manifesto";
import Nav from "../components/Nav";
import Reveal from "../components/Reveal";
import { destinations, homeGrid } from "../data/trips";

const DESTINATION_LIST = Object.values(destinations);

export default function ArchiveHome() {
  return (
    <div className="relative min-h-screen bg-(--color-bg) text-(--color-text)">
      <Nav />
      <Hero />
      <Manifesto />

      <Reveal className="relative z-10 mb-5 flex items-baseline gap-2.5 px-8">
        <span className="text-[0.72rem] text-(--color-accent)">02</span>
        <span className="text-[0.72rem] tracking-[0.14em] uppercase text-(--color-text-soft)">
          Destinations
        </span>
      </Reveal>
      <div className="relative z-10 grid grid-cols-2 gap-3.5 px-8 pb-16 max-[640px]:grid-cols-1">
        {DESTINATION_LIST.map((destination, i) => (
          <Reveal key={destination.slug} delay={i * 90}>
            <Link
              to={`/${destination.slug}`}
              className="group relative block overflow-hidden rounded-(--radius) aspect-[4/3]"
            >
              <div
                className="absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-105"
                style={{ background: destination.heroBg }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />
              <div className="absolute bottom-0 left-0 p-5">
                <p className="mb-1 text-[0.68rem] tracking-[0.18em] text-white/75 uppercase">{destination.eyebrow}</p>
                <p className="font-display text-2xl font-semibold tracking-tight text-white uppercase sm:text-3xl">
                  {destination.slug}
                </p>
              </div>
              <span className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-black/32 text-white opacity-0 backdrop-blur-md transition-opacity duration-300 group-hover:opacity-100">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M7 17 17 7M8 7h9v9" />
                </svg>
              </span>
            </Link>
          </Reveal>
        ))}
      </div>

      <Reveal className="relative z-10 mb-5 flex items-baseline gap-2.5 px-8">
        <span className="text-[0.72rem] text-(--color-accent)">03</span>
        <span className="text-[0.72rem] tracking-[0.14em] uppercase text-(--color-text-soft)">
          Selected frames
        </span>
      </Reveal>
      <div className="relative z-10 grid grid-cols-4 gap-3.5 px-8 pb-16 max-[760px]:grid-cols-2">
        {homeGrid.map((tile, i) => (
          <Reveal
            key={tile.caption}
            delay={(i % 4) * 70}
            className={`relative overflow-hidden rounded-(--radius) aspect-[3/4] ${tile.wide ? "col-span-2 aspect-[16/10]" : ""}`}
          >
            <div className="absolute inset-0" style={{ background: tile.bg }} />
            <span className="absolute bottom-2.5 left-2.5 z-10 rounded-(--radius) bg-black/32 px-2.5 py-1.5 text-[0.72rem] text-white backdrop-blur-md backdrop-saturate-150">
              {tile.caption}
            </span>
          </Reveal>
        ))}
      </div>

      <Reveal className="relative z-10 flex justify-between border-t border-(--color-line) px-8 py-6 text-[0.68rem] tracking-[0.08em] uppercase text-(--color-text-soft)">
        <span>The Archive — est. 2026</span>
        <span>2 trips · 256 frames</span>
      </Reveal>

      <Footer />
    </div>
  );
}
