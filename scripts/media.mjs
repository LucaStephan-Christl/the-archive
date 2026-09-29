#!/usr/bin/env node
/**
 * Turns a folder of raw trip photos/videos into web-ready files + a manifest.
 *
 *   media/<trip>/*            ← drop originals here (any mix, any names; gitignored)
 *   public/media/<trip>/*     → generated web versions (resized webp / mp4 + posters)
 *   src/data/media/<trip>.json → generated manifest the timeline renders from
 *   src/data/places/<trip>.json ← optional hand-written places (names + map
 *                                 positions by time range) — see its _readme
 *
 * Usage:  yarn media            (all trips)
 *         yarn media japan      (one trip)
 *
 * Re-running is incremental: unchanged originals are skipped, and outputs for
 * originals you've deleted are removed.
 *
 * Capture dates, in order of preference (all converted to the trip's local time):
 *   photos — EXIF DateTimeOriginal / CreateDate, using its recorded UTC offset
 *            when present (so a camera left on home time still dates correctly)
 *   videos — Apple's creationdate (time + offset), else the QuickTime
 *            creation_time (UTC)
 *   both   — the file's modified time as a last resort (flagged in the log)
 */
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import exifr from "exifr";
import ffmpegPath from "ffmpeg-static";
import sharp from "sharp";

const run = promisify(execFile);
const ROOT = path.resolve(import.meta.dirname, "..");
const IN_DIR = path.join(ROOT, "media");
const OUT_DIR = path.join(ROOT, "public", "media");
const MANIFEST_DIR = path.join(ROOT, "src", "data", "media");
const PLACES_DIR = path.join(ROOT, "src", "data", "places");

/**
 * Default local timezone per trip — used to turn UTC video timestamps into
 * local days. Override (and fix a camera left on home time) with an optional
 * media/<trip>/trip.json:
 *   { "timezone": "Asia/Tokyo", "clockShiftHours": { "DC-S9": 8 } }
 * where clockShiftHours is keyed by the EXIF camera Model.
 */
const TIMEZONES = { japan: "Asia/Tokyo", iceland: "Atlantic/Reykjavik" };

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff", ".heic", ".heif"]);
const VIDEO_EXT = new Set([".mov", ".mp4", ".m4v"]);

// Grid images are shown ~300–600 CSS px wide (×2 on Retina); the lightbox
// version is sized for a full screen. Videos cap their long edge at 1920.
const GRID_EDGE = 1400;
const FULL_EDGE = 2800;
const VIDEO_EDGE = 1920;
const THUMB_EDGE = 240;

async function main() {
  await fs.mkdir(IN_DIR, { recursive: true });
  const only = process.argv[2];
  const trips = (await fs.readdir(IN_DIR, { withFileTypes: true }))
    .filter((d) => d.isDirectory() && (!only || d.name === only))
    .map((d) => d.name);

  if (!trips.length) {
    console.log(`No trip folders found. Create e.g. media/japan/ and drop files in it.`);
    return;
  }
  for (const trip of trips) await processTrip(trip);
}

async function processTrip(trip) {
  const srcDir = path.join(IN_DIR, trip);
  const outDir = path.join(OUT_DIR, trip);
  const manifestPath = path.join(MANIFEST_DIR, `${trip}.json`);
  await fs.mkdir(outDir, { recursive: true });
  await fs.mkdir(MANIFEST_DIR, { recursive: true });

  const previous = await readJson(manifestPath);
  const cache = new Map((previous?.items ?? []).map((item) => [item.source, item]));
  const config = (await readJson(path.join(srcDir, "trip.json"))) ?? {};
  const timeZone = config.timezone ?? TIMEZONES[trip] ?? "UTC";
  const clockShift = config.clockShiftHours ?? {};

  const files = (await fs.readdir(srcDir))
    .filter((f) => !f.startsWith(".") && f !== "trip.json")
    .filter((f) => {
      const ext = path.extname(f).toLowerCase();
      return IMAGE_EXT.has(ext) || VIDEO_EXT.has(ext);
    })
    .sort();

  console.log(`\n${trip}: ${files.length} files`);
  const items = [];
  let done = 0;

  for (const file of files) {
    const srcPath = path.join(srcDir, file);
    const stat = await fs.stat(srcPath);
    const fingerprint = `${stat.size}-${Math.round(stat.mtimeMs)}`;
    const isVideo = VIDEO_EXT.has(path.extname(file).toLowerCase());
    const id = makeId(file);
    const label = `[${++done}/${files.length}] ${file}`;

    try {
      // Dates are re-read on every run (cheap) and kept separate from the
      // expensive encode, so date logic / trip.json changes never re-encode.
      const date = isVideo
        ? await readVideoDate(srcPath, timeZone)
        : await readImageDate(srcPath, timeZone, clockShift);

      const cached = cache.get(file);
      let media;
      if (cached?.fingerprint === fingerprint && (await outputsExist(outDir, cached))) {
        // keep only the encode results — dates and places are recomputed below
        const { id, type, src, full, poster, width, height, duration } = cached;
        media = { id, type, src, full, poster, width, height, duration };
      } else {
        media = isVideo
          ? await encodeVideo(srcPath, outDir, trip, id)
          : await encodeImage(srcPath, outDir, trip, id);
        console.log(`  ✓ ${label}`);
      }
      media.thumb = await ensureThumb(outDir, trip, media);
      items.push({ ...media, takenAt: date.takenAt, source: file, fingerprint, _date: date });
    } catch (err) {
      console.warn(`  ✗ ${label}  ${err.message.split("\n")[0]}`);
    }
  }

  repairDates(items);
  const placesFile = await readJson(path.join(PLACES_DIR, `${trip}.json`));
  assignPlaces(items, placesFile?.places ?? [], placesFile?.cities);
  for (const item of items) {
    if (item.dateEstimated) console.log(`  ~ ${item.source}  date looked re-saved/unreliable → estimated ${item.takenAt} from neighbouring files`);
    else if (item._date.fallback) console.log(`  ! ${item.source}  no capture date — used file date ${item.takenAt}`);
    delete item._date;
  }

  items.sort((a, b) => a.takenAt.localeCompare(b.takenAt) || a.id.localeCompare(b.id));
  await pruneOrphans(outDir, items);
  await fs.writeFile(manifestPath, JSON.stringify({ trip, items }, null, 2) + "\n");
  console.log(`  → ${path.relative(ROOT, manifestPath)} (${items.length} items)`);
}

// ---------------------------------------------------------------- dates

/**
 * Photos re-saved by an editing app often lose the camera model and get a
 * wrong timestamp. Cameras number files sequentially (P1000850, IMG_9292…),
 * so estimate an unreliable file's time from the nearest reliable files in
 * the same numbered series: interpolated when both neighbours are on the
 * same day, otherwise just after (or before) the one neighbour, so the day
 * and the shooting order still come out right.
 */
function repairDates(items) {
  const seq = (file) => {
    const m = path.basename(file, path.extname(file)).match(/^([A-Za-z_]*)(\d{3,})$/);
    return m ? { prefix: m[1].toUpperCase(), n: Number(m[2]) } : null;
  };
  const anchors = items
    .filter((i) => i._date.trusted)
    .map((i) => ({ ...seq(i.source), t: Date.parse(`${i.takenAt}Z`), day: i.takenAt.slice(0, 10) }))
    .filter((a) => a.n !== undefined);

  for (const item of items) {
    if (item._date.trusted) continue;
    const s = seq(item.source);
    if (!s) continue;
    let prev, next;
    for (const a of anchors) {
      if (a.prefix !== s.prefix) continue;
      if (a.n < s.n && (!prev || a.n > prev.n)) prev = a;
      if (a.n > s.n && (!next || a.n < next.n)) next = a;
    }
    if (!prev && !next) continue;

    // With only one usable neighbour, step 30s per unreliable file between
    // them (not per file number — numbering can jump, e.g. P100xxxx →
    // P101xxxx on a new folder), which keeps the shooting order intact.
    const rank = (lo, hi) =>
      items.filter((i) => {
        const q = !i._date.trusted && seq(i.source);
        return q && q.prefix === s.prefix && q.n > lo && q.n <= hi;
      }).length;
    let t;
    if (prev && next && prev.day === next.day) t = prev.t + ((next.t - prev.t) * (s.n - prev.n)) / (next.n - prev.n);
    else if (prev) t = prev.t + 30_000 * rank(prev.n, s.n);
    else t = next.t - 30_000 * rank(s.n - 1, next.n - 1);
    item.takenAt = new Date(t).toISOString().slice(0, 19);
    item.dateEstimated = true;
  }
}

/** A date is "trusted" when the camera itself wrote it (model present) — re-saved copies lose that. */
async function readImageDate(srcPath, timeZone, clockShift) {
  const exif = await exifr
    .parse(srcPath, {
      pick: ["DateTimeOriginal", "CreateDate", "OffsetTimeOriginal", "OffsetTime", "Model"],
      reviveValues: false,
    })
    .catch(() => null);
  const gpsTags = await exifr.gps(srcPath).catch(() => null);
  const gps = gpsTags && Number.isFinite(gpsTags.latitude) ? [gpsTags.latitude, gpsTags.longitude] : null;
  const exifDate = exif?.DateTimeOriginal ?? exif?.CreateDate;
  if (!exifDate) return { ...(await fileDate(srcPath)), trusted: false, gps };

  const offset = exif.OffsetTimeOriginal ?? exif.OffsetTime;
  // Camera recorded its UTC offset — convert to the trip's local time. This
  // fixes a camera left on home time automatically.
  const takenAt = offset
    ? utcToZone(new Date(`${exifToIso(exifDate)}${offset}`), timeZone)
    : shiftIso(exifToIso(exifDate), clockShift[exif.Model] ?? 0);
  return { takenAt, trusted: !!exif.Model, fallback: false, gps };
}

async function readVideoDate(srcPath, timeZone) {
  const info = await probe(srcPath);
  const loc = info.match(/location(?:\.ISO6709)?\s*:\s*([+-]\d+(?:\.\d+)?)([+-]\d+(?:\.\d+)?)/);
  const gps = loc ? [Number(loc[1]), Number(loc[2])] : null;
  const apple = info.match(/com\.apple\.quicktime\.creationdate\s*:\s*(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d[+-]\d\d:?\d\d)/);
  const qt = info.match(/creation_time\s*:\s*(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z)/);
  if (apple) return { takenAt: utcToZone(new Date(apple[1].replace(/([+-]\d\d)(\d\d)$/, "$1:$2")), timeZone), trusted: true, fallback: false, gps };
  if (qt) return { takenAt: utcToZone(new Date(qt[1]), timeZone), trusted: true, fallback: false, gps };
  return { ...(await fileDate(srcPath)), trusted: false, gps };
}

/**
 * Attach a location to every item from src/data/places/<trip>.json: the
 * place whose `files` lists it, else whose [from, to) time range contains
 * it. The item's own GPS (if any) wins for the position ("exact"); the
 * place supplies the name. Places without lat/lon only label the city.
 */
function assignPlaces(items, places, cities = {}) {
  for (const item of items) {
    const t = item.takenAt.slice(0, 16);
    const place =
      places.find((p) => p.files?.includes(item.source)) ??
      places.find((p) => p.from && p.to && t >= p.from && t < p.to);
    const gps = item._date.gps;

    if (place) {
      item.city = place.city;
      if (cities[place.city]) item.cityJa = cities[place.city];
      if (place.name !== place.city) {
        item.place = place.name;
        if (place.ja) item.placeJa = place.ja;
      }
    }
    if (gps) {
      [item.lat, item.lon] = gps.map((v) => Math.round(v * 1e5) / 1e5);
      item.exact = true;
    } else if (place?.lat !== undefined) {
      item.lat = place.lat;
      item.lon = place.lon;
      item.exact = false;
    }
  }
}

// ---------------------------------------------------------------- images

async function encodeImage(srcPath, outDir, trip, id) {
  const ext = path.extname(srcPath).toLowerCase();
  // sharp's prebuilt libvips can't decode HEIC — let macOS's `sips` convert it first.
  let input = srcPath;
  let tmp;
  if (ext === ".heic" || ext === ".heif") {
    tmp = path.join(outDir, `.${id}.tmp.jpg`);
    await run("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "95", srcPath, "--out", tmp]);
    input = tmp;
  }

  try {
    const base = sharp(input, { failOn: "none" }).rotate(); // apply EXIF orientation
    const grid = await base.clone()
      .resize(GRID_EDGE, GRID_EDGE, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(path.join(outDir, `${id}.webp`));
    await base.clone()
      .resize(FULL_EDGE, FULL_EDGE, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 86 })
      .toFile(path.join(outDir, `${id}-full.webp`));

    return {
      id,
      type: "image",
      src: `/media/${trip}/${id}.webp`,
      full: `/media/${trip}/${id}-full.webp`,
      width: grid.width,
      height: grid.height,
    };
  } finally {
    if (tmp) await fs.rm(tmp, { force: true });
  }
}

// ---------------------------------------------------------------- videos

async function encodeVideo(srcPath, outDir, trip, id) {
  const info = await probe(srcPath);

  // iPhone HDR (HLG / PQ) footage looks grey and washed out if squashed
  // straight to 8-bit SDR — tone-map it properly first.
  const isHdr = /arib-std-b67|smpte2084/.test(info);
  const scale = `scale='if(gte(iw,ih),min(${VIDEO_EDGE},iw),-2)':'if(gte(iw,ih),-2,min(${VIDEO_EDGE},ih))':flags=lanczos`;
  const tonemap =
    "zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709," +
    "tonemap=tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,";
  const srcFps = parseFloat(info.match(/, ([\d.]+) fps/)?.[1] ?? "0");
  const vf = `${isHdr ? tonemap : ""}${scale}${srcFps > 60 ? ",fps=60" : ""},format=yuv420p`;

  const mp4 = path.join(outDir, `${id}.mp4`);
  await run(ffmpegPath, [
    "-hide_banner", "-loglevel", "error", "-y", "-i", srcPath,
    "-vf", vf,
    "-c:v", "libx264", "-preset", "slow", "-crf", "22", "-profile:v", "high",
    "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
    "-c:a", "aac", "-b:a", "128k",
    "-movflags", "+faststart",
    mp4,
  ], { maxBuffer: 1 << 26 });

  const out = await probe(mp4);
  const [, w, h] = out.match(/Video:.*?(\d{2,5})x(\d{2,5})/) ?? [];
  const dur = out.match(/Duration: (\d+):(\d+):([\d.]+)/);
  const duration = dur ? +dur[1] * 3600 + +dur[2] * 60 + +dur[3] : 0;

  // Poster from a moment in, not frame 0 (often black or mid-fade).
  await run(ffmpegPath, [
    "-hide_banner", "-loglevel", "error", "-y",
    "-ss", String(Math.min(0.5, duration / 2)), "-i", mp4,
    "-frames:v", "1", "-c:v", "libwebp", "-quality", "82",
    path.join(outDir, `${id}-poster.webp`),
  ]);

  return {
    id,
    type: "video",
    src: `/media/${trip}/${id}.mp4`,
    poster: `/media/${trip}/${id}-poster.webp`,
    width: +w,
    height: +h,
    duration: Math.round(duration * 10) / 10,
  };
}

/**
 * Small square-ish preview (map markers, place panels) made from the grid
 * image / video poster already on disk, so adding it never re-encodes.
 */
async function ensureThumb(outDir, trip, media) {
  const name = `${media.id}-thumb.webp`;
  const file = path.join(outDir, name);
  const exists = await fs.access(file).then(() => true, () => false);
  if (!exists) {
    const from = path.join(outDir, path.basename(media.poster ?? media.src));
    await sharp(from).resize(THUMB_EDGE, THUMB_EDGE, { fit: "cover" }).webp({ quality: 78 }).toFile(file);
  }
  return `/media/${trip}/${name}`;
}

/** ffmpeg prints stream/format metadata to stderr for `-i` with no output (and exits 1). */
async function probe(file) {
  try {
    await run(ffmpegPath, ["-hide_banner", "-i", file]);
    return "";
  } catch (err) {
    return err.stderr ?? "";
  }
}

// ---------------------------------------------------------------- helpers

function makeId(file) {
  const ext = path.extname(file);
  const slug = path.basename(file, ext).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  // short hash of the full name keeps "IMG_1.jpg" and "IMG_1.mov" (or odd
  // characters that slug to the same thing) from colliding
  const hash = createHash("sha1").update(file).digest("hex").slice(0, 6);
  return `${slug.slice(0, 40) || "item"}-${hash}`;
}

/** "2026:01:12 14:03:22" → "2026-01-12T14:03:22" */
function exifToIso(value) {
  if (value instanceof Date) return utcToZone(value, "UTC");
  const m = String(value).match(/(\d{4})[:-](\d\d)[:-](\d\d)[ T](\d\d):(\d\d):(\d\d)/);
  if (!m) throw new Error(`unreadable EXIF date "${value}"`);
  return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`;
}

/** Shift a wall-clock ISO string by whole/fractional hours (treated as UTC so no DST games). */
function shiftIso(iso, hours) {
  if (!hours) return iso;
  return new Date(new Date(`${iso}Z`).getTime() + hours * 3_600_000).toISOString().slice(0, 19);
}

function utcToZone(date, timeZone) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
    }).formatToParts(date).map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
}

async function fileDate(file) {
  const { mtime } = await fs.stat(file);
  return { takenAt: utcToZone(mtime, Intl.DateTimeFormat().resolvedOptions().timeZone), fallback: true };
}

async function outputsExist(outDir, item) {
  const names = [item.src, item.full, item.poster].filter(Boolean).map((p) => path.basename(p));
  const checks = await Promise.all(names.map((n) => fs.access(path.join(outDir, n)).then(() => true, () => false)));
  return checks.every(Boolean);
}

async function pruneOrphans(outDir, items) {
  const keep = new Set(items.flatMap((i) => [i.src, i.full, i.poster, i.thumb]).filter(Boolean).map((p) => path.basename(p)));
  for (const f of await fs.readdir(outDir)) {
    if (!keep.has(f)) await fs.rm(path.join(outDir, f), { force: true });
  }
}

async function readJson(file) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    return null;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
