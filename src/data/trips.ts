// Web encode of JapanHero.mov (2160×3840 source → 1440×2560, 60fps, CRF 21);
// the poster is its first frame, shown while the video loads.
import japanHero from "../assets/videos/japan/japan-hero-poster.webp";
import japanHeroVideo from "../assets/videos/japan/japan-hero.mp4";
export type DestinationKind = "circle" | "cross";

export interface Tile {
  wide?: boolean;
  bg: string;
}

export interface DaySection {
  n: string;
  label: string;
  tiles: Tile[];
}

export interface Destination {
  slug: "japan" | "iceland";
  kind: DestinationKind;
  vTop: string;
  vBottom: string;
  portalBg: string;
  heroBg: string;
  /** Optional video to use instead of heroBg for the destination hero and the
   * homepage hover-cursor preview — falls back to heroBg when unset. */
  heroVideo?: string;
  /** object-fit / background-size for heroVideo / heroBg — "contain" for portrait media so it isn't cropped. */
  heroFit: "cover" | "contain";
  accent: string;
  eyebrow: string;
  headline: string;
  /** The destination in its own language/script, shown alongside the English. */
  local?: {
    /** BCP-47 language tag, e.g. "ja" */
    lang: string;
    /** 日本 */
    name: string;
    /** headline translation, under the English one */
    headline?: string;
    /** vertical line of text on the destination hero */
    hero?: string;
  };
  /** Optional place name per capture date, shown next to it in the timeline
   * ("Jan 16 — Kyoto"). Days come from the photos themselves (`yarn media`). */
  dayLabels?: Record<string, string>;
  /** Placeholder timeline, shown only until the trip has real media. */
  days: DaySection[];
}

export const destinations: Record<"japan" | "iceland", Destination> = {
  japan: {
    slug: "japan",
    kind: "circle",
    vTop: "JAPAN 2026",
    vBottom: "TOKYO / KYOTO / OSAKA",
    portalBg:
      "radial-gradient(circle at 32% 30%, #e0563a 0%, #7a2418 40%, #1a0e0c 78%)",
    heroBg: `url(${japanHero})`,
    heroVideo: japanHeroVideo,
    heroFit: "contain",
    accent: "#e0563a",
    eyebrow: "Japan, Jan 2026",
    headline: "Tokyo to Osaka.",
    local: {
      lang: "ja",
      name: "日本",
      headline: "東京から大阪へ",
      hero: "日本・二〇二六年一月",
    },
    dayLabels: {
      // "2026-01-16": "Kyoto",
    },
    days: [
      {
        n: "01",
        label: "Jan 12 — Kyoto",
        tiles: [
          { wide: true, bg: "linear-gradient(160deg,#4a2a24,#1a0e0c)" },
          { bg: "linear-gradient(160deg,#3d221c,#150b09)" },
          { bg: "linear-gradient(160deg,#452a22,#170f0a)" },
        ],
      },
      {
        n: "02",
        label: "Jan 15 — Nara",
        tiles: [
          { bg: "linear-gradient(160deg,#38201a,#130a08)" },
          { wide: true, bg: "linear-gradient(160deg,#4a2e26,#1a100c)" },
          { bg: "linear-gradient(160deg,#41251f,#160c09)" },
        ],
      },
    ],
  },
  iceland: {
    slug: "iceland",
    kind: "cross",
    vTop: "ICELAND 2026",
    vBottom: "REYKJAVIK / AKUREYRI / HUSAVIK",
    portalBg:
      "radial-gradient(circle at 32% 30%, #6fb0c2 0%, #29616e 40%, #0a1518 78%)",
    heroBg:
      "radial-gradient(120% 90% at 70% 20%, #a9dce7 0%, #5fa3b8 32%, #29616e 62%, #0a1518 100%)",
    heroFit: "cover",
    accent: "#5fa3b8",
    eyebrow: "Iceland, Mar & May 2026",
    headline: "Ice, ash and water.",
    local: {
      lang: "is",
      name: "Ísland",
      headline: "Ís, aska og vatn.",
    },
    days: [
      {
        n: "01",
        label: "Mar 03 — Reykjavik",
        tiles: [
          { wide: true, bg: "linear-gradient(160deg,#243a40,#0b1518)" },
          { bg: "linear-gradient(160deg,#1e343a,#0a1315)" },
          { bg: "linear-gradient(160deg,#2a4045,#0c1719)" },
        ],
      },
      {
        n: "02",
        label: "May 06 — Akureyri & Husavik",
        tiles: [
          { bg: "linear-gradient(160deg,#203338,#091214)" },
          { wide: true, bg: "linear-gradient(160deg,#264148,#0a1518)" },
          { bg: "linear-gradient(160deg,#233c41,#0a1417)" },
        ],
      },
    ],
  },
};

/** A homepage "Selected frames" pick — `id` is a media id from src/data/media/<trip>.json. */
export interface HomeTile {
  trip: Destination["slug"];
  id: string;
  caption: string;
}

export const homeGrid: HomeTile[] = [
  { trip: "japan", id: "p1011355-8ea45d", caption: "Kyoto — Jan 2026" }, // Fushimi Inari
  { trip: "japan", id: "img-8332-6dcda9", caption: "Tokyo — Jan 2026" }, // teamLab (video)
  { trip: "japan", id: "p1000358-d4d10c", caption: "Tokyo — Jan 2026" }, // Tokyo Tower
  { trip: "japan", id: "p1011039-5008bf", caption: "Kamakura — Jan 2026" }, // Enoden at sunset
  { trip: "japan", id: "img-9292-889d9a", caption: "Kyoto — Jan 2026" }, // Kiyomizu-dera
  { trip: "japan", id: "p1011195-78023f", caption: "Nara — Jan 2026" }, // deer
  { trip: "japan", id: "p1011559-b3fe3c", caption: "Osaka — Jan 2026" }, // Osaka Castle
  { trip: "japan", id: "p1011799-74e964", caption: "Tokyo — Jan 2026" }, // Shibuya from above
];
