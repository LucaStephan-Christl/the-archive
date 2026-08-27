import { Link } from "react-router-dom";
import Reveal from "./Reveal";
import type { Destination } from "../data/trips";

interface ExperienceProps {
  destination: Destination;
}

/** The post-portal view: a scroll-driven timeline whose days each unfold into a small grid. */
export default function Experience({ destination }: ExperienceProps) {
  return (
    <section className="relative bg-(--color-bg) text-(--color-text)">
      <div className="sticky top-0 z-10 flex items-center justify-between bg-gradient-to-b from-(--color-bg) via-(--color-bg)/85 to-transparent px-8 py-5">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 border-none bg-transparent p-0 text-[0.74rem] tracking-wide text-(--color-text-soft) hover:text-(--color-text)"
        >
          ← All destinations
        </Link>
        <span className="font-display text-base font-semibold tracking-tight">
          The Archive
        </span>
      </div>

      <div className="px-8 pt-4 pb-8">
        <p className="mb-3 text-[0.72rem] tracking-[0.16em] uppercase text-(--color-accent)">
          {destination.eyebrow}
        </p>
        <h1 className="font-display text-[clamp(2rem,6.5vw,4.6rem)] leading-[0.92] font-semibold tracking-[-0.03em] uppercase">
          {destination.headline}
        </h1>
      </div>

      <div className="relative px-8 pb-20">
        <div className="pointer-events-none absolute top-0 bottom-8 left-[2.65rem] w-px bg-(--color-text)/15" />
        {destination.days.map((day) => (
          <div key={day.n} className="relative pt-9 pl-10">
            <span className="absolute top-9 left-[-0.6rem] h-2.5 w-2.5 rounded-full bg-(--color-accent)" />
            <Reveal className="mb-4 flex items-baseline gap-3">
              <span className="font-display text-lg font-semibold">
                {day.n}
              </span>
              <span className="text-[0.74rem] tracking-[0.08em] uppercase text-(--color-text-soft)">
                {day.label}
              </span>
            </Reveal>
            <div className="grid grid-cols-4 gap-3 max-[700px]:grid-cols-2">
              {day.tiles.map((tile, i) => (
                <Reveal
                  key={i}
                  delay={(i % 4) * 60}
                  className={`rounded-(--radius) grayscale-[0.4] aspect-[3/4] ${
                    tile.wide ? "col-span-2 aspect-[16/10]" : ""
                  }`}
                >
                  <div
                    className="h-full w-full rounded-(--radius)"
                    style={{ background: tile.bg }}
                  />
                </Reveal>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
