import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

const EMAIL = "luca.christl4221@gmail.com";
const SOCIALS = [
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/luca-christl-36a783308/",
  },
  { label: "GitHub", href: "https://github.com/LucaStephan-Christl" },
  { label: "Instagram", href: "https://www.instagram.com/luca.christl01/" },
];

function useZurichClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Zurich",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(now);
  const zone =
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Zurich",
      timeZoneName: "short",
    })
      .formatToParts(now)
      .find((p) => p.type === "timeZoneName")?.value ?? "CET";
  return `${time} ${zone}`;
}

/**
 * A tall scroll-driven wrapper: the sticky inner viewport holds a black
 * circle that clip-paths open from the bottom as you scroll through it,
 * revealing the contact footer underneath — an eclipse-style wipe rather
 * than a hard cut.
 */
export default function Footer() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: wrapperRef,
    offset: ["start end", "end end"],
  });
  const radius = useTransform(scrollYProgress, [0, 1], ["0vmax", "145vmax"]);
  const clipPath = useTransform(radius, (r) => `circle(${r} at 50% 100%)`);
  const contentOpacity = useTransform(scrollYProgress, [0.45, 0.8], [0, 1]);
  const time = useZurichClock();
  const [copied, setCopied] = useState(false);

  function fallbackCopy() {
    const textarea = document.createElement("textarea");
    textarea.value = EMAIL;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
    } catch {
      /* nothing more we can do — the email is still selectable/readable */
    }
    document.body.removeChild(textarea);
  }

  async function copyEmail() {
    try {
      if (!navigator.clipboard) throw new Error("clipboard API unavailable");
      // some contexts leave clipboard.writeText perpetually pending instead of
      // rejecting (e.g. without a trusted user gesture) — never let that hang
      // the "Copied!" feedback, race it against a short timeout
      await Promise.race([
        navigator.clipboard.writeText(EMAIL),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 400),
        ),
      ]);
    } catch {
      fallbackCopy();
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div ref={wrapperRef} className="relative h-[220vh]">
      <div className="sticky top-0 h-screen overflow-hidden">
        <motion.div
          style={{ clipPath }}
          className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_100%,#2c2d2f_0%,var(--color-bg)_55%,#000_100%)]"
        >
          <motion.div
            style={{ opacity: contentOpacity }}
            className="flex gap-2 h-full flex-col justify-end px-8 py-10 text-(--color-text)"
          >
            <div
              onClick={() => copyEmail()}
              aria-label={`Copy email address ${EMAIL}`}
              className="inline-flex w-fit items-center gap-2 border-none bg-transparent p-0 text-[0.8rem] font-semibold text-(--color-text)/90 hover:text-(--color-text) cursor-pointer"
            >
              {copied ? "Copied!" : <span aria-hidden="true">{EMAIL}</span>}
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <rect x="9" y="9" width="12" height="12" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </div>

            <div className="flex items-end justify-between gap-6">
              <a
                href={`mailto:${EMAIL}`}
                className="group flex items-center gap-3 font-display text-[clamp(2.6rem,9vw,6rem)] leading-[0.9] font-bold tracking-tight text-(--color-text)/95 uppercase"
              >
                Talk to me
                <svg
                  width="0.6em"
                  height="0.6em"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1"
                  aria-hidden="true"
                >
                  <path d="M7 17 17 7M8 7h9v9" />
                </svg>
              </a>
              <nav className="mb-2 hidden gap-8 text-[0.78rem] font-semibold tracking-wide text-(--color-text)/80 uppercase sm:flex">
                {SOCIALS.map((s) => (
                  <a
                    target="_blank"
                    key={s.label}
                    href={s.href}
                    className="hover:text-(--color-text)"
                  >
                    {s.label}
                  </a>
                ))}
              </nav>
            </div>

            <div className="flex items-end justify-between gap-6">
              <div className="text-[0.85rem] font-semibold text-(--color-text)/80">
                <p>Aargau, Switzerland</p>
                <p className="[font-variant-numeric:tabular-nums]">{time}</p>
              </div>
            </div>

            <div className="border-t border-(--color-text)/15 pt-5 text-center text-[0.78rem] font-semibold text-(--color-text)/70">
              © {new Date().getFullYear()} Luca Christl · Frontend Developer
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
