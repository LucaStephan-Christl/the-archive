import { getTripHero, getTripMedia } from "./media";

// Hero clips are encoded by `yarn media` from media/<trip>/hero/ (Japan and
// Budapest: triptychs of three vertical clips; Iceland: a landscape montage).
// Until a clip is there, a trip keeps its gradient hero.
const japanHero = getTripHero("japan");
const icelandHero = getTripHero("iceland");
const budapestHero = getTripHero("budapest");
const franceHero = getTripHero("france");
/** Flag-portal shape: Japan's hinomaru, Iceland's Nordic cross, Hungary's horizontal tricolour, France's vertical one. */
export type DestinationKind = "circle" | "cross" | "stripes" | "tricolour";

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
  slug: "japan" | "iceland" | "budapest" | "france";
  kind: DestinationKind;
  vTop: string;
  vBottom: string;
  portalBg: string;
  heroBg: string;
  /** Optional video to use instead of heroBg for the destination hero and the
   * homepage hover-cursor preview — falls back to heroBg when unset. */
  heroVideo?: string;
  /** Portrait cut of the hero for small frames — the hover-cursor circle and the globe card. */
  preview?: { video: string; poster: string };
  /** object-fit / background-size for heroVideo / heroBg — "contain" for portrait media so it isn't cropped. */
  heroFit: "cover" | "contain";
  accent: string;
  eyebrow: string;
  headline: string;
  /** The destination in its own language/script, shown alongside the English. */
  local?: {
    /** BCP-47 language tag, e.g. "ja" */
    lang: string;
    /** 日本 — left out when it's the same as the English (France) */
    name?: string;
    /** headline translation, under the English one */
    headline?: string;
  };
  /** "2025-08-01" — when the trip was, for sorting until it has photos (after that, the first photo decides). */
  startDate?: string;
  /** Optional place name per capture date, shown next to it in the timeline
   * ("Jan 16 — Kyoto"). Days come from the photos themselves (`yarn media`). */
  dayLabels?: Record<string, string>;
  /** Placeholder timeline, shown only until the trip has real media. */
  days: DaySection[];
}

export const destinations: Record<Destination["slug"], Destination> = {
  japan: {
    slug: "japan",
    kind: "circle",
    vTop: "JAPAN 2026",
    vBottom: "TOKYO / KYOTO / OSAKA",
    portalBg:
      "radial-gradient(circle at 32% 30%, #e0563a 0%, #7a2418 40%, #1a0e0c 78%)",
    heroBg: japanHero
      ? `url(${japanHero.poster})`
      : "radial-gradient(120% 90% at 30% 20%, #f0a58f 0%, #e0563a 30%, #7a2418 62%, #1a0e0c 100%)",
    heroVideo: japanHero?.video,
    preview: japanHero?.preview && japanHero.previewPoster ? { video: japanHero.preview, poster: japanHero.previewPoster } : undefined,
    heroFit: japanHero && japanHero.height > japanHero.width ? "contain" : "cover",
    accent: "#e0563a",
    eyebrow: "Japan, Jan 2026",
    headline: "Tokyo to Osaka.",
    local: {
      lang: "ja",
      name: "日本",
      headline: "東京から大阪へ",
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
    heroBg: icelandHero
      ? `url(${icelandHero.poster})`
      : "radial-gradient(120% 90% at 70% 20%, #a9dce7 0%, #5fa3b8 32%, #29616e 62%, #0a1518 100%)",
    heroVideo: icelandHero?.video,
    preview: icelandHero?.preview && icelandHero.previewPoster ? { video: icelandHero.preview, poster: icelandHero.previewPoster } : undefined,
    // portrait clips letterbox (with the accent glow either side), landscape ones fill the frame
    heroFit: icelandHero && icelandHero.height > icelandHero.width ? "contain" : "cover",
    accent: "#5fa3b8",
    eyebrow: "Iceland, Apr & May 2026",
    headline: "Ice, ash and water.",
    local: {
      lang: "is",
      name: "Ísland",
      headline: "Ís, aska og vatn.",
    },
    dayLabels: {
      // "2026-03-03": "Reykjavik",
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
  budapest: {
    slug: "budapest",
    kind: "stripes",
    vTop: "BUDAPEST 2025",
    vBottom: "BUDA / PEST",
    portalBg:
      "radial-gradient(circle at 32% 30%, #d9b46a 0%, #8a6a35 40%, #15110b 78%)",
    // hero: a triptych of three vertical clips (media/budapest/hero/budapest-triptych.mp4);
    // phones crop to its middle panel. Gradient is the fallback without it.
    heroBg: budapestHero
      ? `url(${budapestHero.poster})`
      : "radial-gradient(120% 90% at 30% 20%, #f2d49a 0%, #c9a45c 30%, #5b4524 62%, #15110b 100%)",
    heroVideo: budapestHero?.video,
    preview: budapestHero?.preview && budapestHero.previewPoster ? { video: budapestHero.preview, poster: budapestHero.previewPoster } : undefined,
    heroFit: budapestHero && budapestHero.height > budapestHero.width ? "contain" : "cover",
    accent: "#c9a45c",
    eyebrow: "Budapest, Apr 2025",
    headline: "Bridges and ruin bars.",
    local: {
      lang: "hu",
      name: "Magyarország",
      headline: "Hidak és romkocsmák.",
    },
    dayLabels: {
      // "2026-06-12": "Buda",
    },
    days: [
      {
        n: "01",
        label: "Day one — Buda",
        tiles: [
          { wide: true, bg: "linear-gradient(160deg,#3d3222,#14100a)" },
          { bg: "linear-gradient(160deg,#352b1d,#120e09)" },
          { bg: "linear-gradient(160deg,#41352a,#15110c)" },
        ],
      },
      {
        n: "02",
        label: "Day two — Pest",
        tiles: [
          { bg: "linear-gradient(160deg,#33291c,#110d08)" },
          { wide: true, bg: "linear-gradient(160deg,#43372a,#16120c)" },
          { bg: "linear-gradient(160deg,#3a2f21,#130f0a)" },
        ],
      },
    ],
  },
  france: {
    slug: "france",
    kind: "tricolour",
    vTop: "FRANCE 2025",
    vBottom: "PARIS / CRIEL-SUR-MER",
    portalBg:
      "radial-gradient(circle at 32% 30%, #a9b8ee 0%, #4f63a8 40%, #0c0d14 78%)",
    // placeholder until media/france/hero/ has a clip
    heroBg: franceHero
      ? `url(${franceHero.poster})`
      : "radial-gradient(120% 90% at 30% 20%, #dfe5fb 0%, #8fa2e6 30%, #3d4f8f 62%, #0c0d14 100%)",
    heroVideo: franceHero?.video,
    preview: franceHero?.preview && franceHero.previewPoster ? { video: franceHero.preview, poster: franceHero.previewPoster } : undefined,
    heroFit: franceHero && franceHero.height > franceHero.width ? "contain" : "cover",
    accent: "#7d93d8",
    eyebrow: "France, Aug 2025",
    startDate: "2025-08-01",
    headline: "Paris and the sea.",
    local: {
      lang: "fr",
      name: "La France",
      headline: "Paris et la mer.",
    },
    dayLabels: {
      // "2025-08-10": "Paris",
    },
    days: [
      {
        n: "01",
        label: "Paris",
        tiles: [
          { wide: true, bg: "linear-gradient(160deg,#2a3048,#0d0f18)" },
          { bg: "linear-gradient(160deg,#252b40,#0c0e16)" },
          { bg: "linear-gradient(160deg,#2e344c,#0e1019)" },
        ],
      },
      {
        n: "02",
        label: "Criel-sur-Mer",
        tiles: [
          { bg: "linear-gradient(160deg,#283247,#0c1017)" },
          { wide: true, bg: "linear-gradient(160deg,#2d3850,#0e111a)" },
          { bg: "linear-gradient(160deg,#27304a,#0c0f18)" },
        ],
      },
    ],
  },
};

/** When a trip started — its earliest photo ("" for a trip with no media yet, which sorts as newest). */
function tripStart(d: Destination) {
  return getTripMedia(d.slug)[0]?.takenAt ?? d.startDate ?? "";
}

const byStart = (a: Destination, b: Destination) => {
  const sa = tripStart(a) || "9999";
  const sb = tripStart(b) || "9999";
  return sa.localeCompare(sb);
};

/** Oldest trip first — the globe's travel order. */
export const tripsOldestFirst: Destination[] = Object.values(destinations).sort(byStart);

/** Newest trip first — homepage list and nav. */
export const tripsNewestFirst: Destination[] = [...tripsOldestFirst].reverse();

/**
 * Homepage "Selected frames" picks. The homepage shows the same number per
 * trip (the smallest trip's count) and shuffles them on every visit, so keep
 * these balanced — 4 per trip fills 3 rows of 4.
 */
/** A homepage "Selected frames" pick — `id` is a media id from src/data/media/<trip>.json. */
export interface HomeTile {
  trip: Destination["slug"];
  id: string;
  caption: string;
}

export const homeGrid: HomeTile[] = [
  { trip: "japan", id: "p1011355-8ea45d", caption: "Kyoto — Jan 2026" }, // Fushimi Inari
  { trip: "japan", id: "img-8332-6dcda9", caption: "Tokyo — Jan 2026" }, // teamLab (video)
  { trip: "japan", id: "p1011039-5008bf", caption: "Kamakura — Jan 2026" }, // Enoden at sunset
  { trip: "japan", id: "p1011799-74e964", caption: "Tokyo — Jan 2026" }, // Shibuya from above
  { trip: "iceland", id: "img-0372-3791c6", caption: "Kirkjufell — Apr 2026" },
  { trip: "iceland", id: "img-0526-79fe0c", caption: "Lóndrangar — Apr 2026" }, // video
  { trip: "iceland", id: "p1022344-e02595", caption: "Hafnarhólmi — May 2026" }, // puffin
  { trip: "iceland", id: "p1022363-f1f509", caption: "Múlagljúfur — May 2026" },
  { trip: "budapest", id: "img-6028-00c4e0", caption: "Liberty Bridge — Apr 2025" },
  { trip: "budapest", id: "img-6065-afe3c5", caption: "St. Stephen's — Apr 2025" },
  { trip: "budapest", id: "img-6109-46ed54", caption: "Danube — Apr 2025" },
  { trip: "budapest", id: "img-6175-430a89", caption: "Ruin bars — Apr 2025" },
  { trip: "france", id: "img-6710-0428f4", caption: "Paris — Aug 2025" }, // Eiffel Tower at night
  { trip: "france", id: "img-8016-cf6da0", caption: "Notre-Dame — Aug 2025" },
  { trip: "france", id: "img-8249-5b4c02", caption: "Mers-les-Bains — Aug 2025" }, // Belle Époque villas
  { trip: "france", id: "img-8447-b79f0c", caption: "Criel-sur-Mer — Aug 2025" }, // sunset from the cliffs
];
