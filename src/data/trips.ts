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
  eyebrow: string;
  headline: string;
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
    eyebrow: "Japan, Oct 2024",
    headline: "Kyoto to Nara.",
    days: [
      {
        n: "01",
        label: "Oct 12 — Kyoto",
        tiles: [
          { wide: true, bg: "linear-gradient(160deg,#4a2a24,#1a0e0c)" },
          { bg: "linear-gradient(160deg,#3d221c,#150b09)" },
          { bg: "linear-gradient(160deg,#452a22,#170f0a)" },
        ],
      },
      {
        n: "02",
        label: "Oct 15 — Nara",
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
    vTop: "ICELAND 2025",
    vBottom: "REYKJAVIK / VIK / JOKULSARLON",
    portalBg:
      "radial-gradient(circle at 32% 30%, #6fb0c2 0%, #29616e 40%, #0a1518 78%)",
    eyebrow: "Iceland, Feb 2025",
    headline: "Ice, ash and water.",
    days: [
      {
        n: "01",
        label: "Feb 03 — Reykjavik",
        tiles: [
          { wide: true, bg: "linear-gradient(160deg,#243a40,#0b1518)" },
          { bg: "linear-gradient(160deg,#1e343a,#0a1315)" },
          { bg: "linear-gradient(160deg,#2a4045,#0c1719)" },
        ],
      },
      {
        n: "02",
        label: "Feb 06 — Vik & Jokulsarlon",
        tiles: [
          { bg: "linear-gradient(160deg,#203338,#091214)" },
          { wide: true, bg: "linear-gradient(160deg,#264148,#0a1518)" },
          { bg: "linear-gradient(160deg,#233c41,#0a1417)" },
        ],
      },
    ],
  },
};

export interface HomeTile extends Tile {
  caption: string;
}

export const homeGrid: HomeTile[] = [
  {
    wide: true,
    bg: "linear-gradient(160deg,#3a3630,#161513)",
    caption: "Kyoto — Oct 2024",
  },
  {
    bg: "linear-gradient(160deg,#2f2a26,#121110)",
    caption: "Tokyo — Oct 2024",
  },
  { bg: "linear-gradient(160deg,#26333a,#0e1417)", caption: "Vik — Feb 2025" },
  { bg: "linear-gradient(160deg,#332e26,#141210)", caption: "Nara — Oct 2024" },
  {
    wide: true,
    bg: "linear-gradient(160deg,#2a2f33,#101214)",
    caption: "Jokulsarlon — Feb 2025",
  },
];
