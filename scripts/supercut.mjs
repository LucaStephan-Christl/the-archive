#!/usr/bin/env node
/**
 * Builds the homepage hero: a hard-cut supercut of the clips listed in
 * src/data/supercut.json, cut from the raw originals in media/<trip>/ (for
 * full resolution), tone-mapped if HDR, at 30fps — in two shapes:
 *
 *   landscape 1920×1080 (portrait clips cropped to a 16:9 band at their `y`)
 *     → public/media/home/supercut.mp4 + supercut-poster.webp
 *   portrait 1080×1920 for phones (landscape clips cropped to a 9:16 band at their `x`)
 *     → public/media/home/supercut-portrait.mp4 + supercut-portrait-poster.webp
 *
 * Usage:  yarn supercut
 */
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import ffmpegPath from "ffmpeg-static";

const run = promisify(execFile);
const ROOT = path.resolve(import.meta.dirname, "..");
const OUT_DIR = path.join(ROOT, "public", "media", "home");
const FPS = 30;
// CRF 29/30: on a fast-cut background loop hard to tell from 25, at about half the size
const VARIANTS = [
  { name: "supercut", w: 1920, h: 1080, crf: "29" },
  { name: "supercut-portrait", w: 1080, h: 1920, crf: "30" },
];
const TONEMAP =
  "zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709," +
  "tonemap=tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,";

const config = JSON.parse(await fs.readFile(path.join(ROOT, "src", "data", "supercut.json"), "utf8"));
const manifests = {};
const manifest = async (trip) =>
  (manifests[trip] ??= JSON.parse(await fs.readFile(path.join(ROOT, "src", "data", "media", `${trip}.json`), "utf8")));

await fs.mkdir(OUT_DIR, { recursive: true });
for (const variant of VARIANTS) await build(variant);

async function build({ name, w, h, crf }) {
  console.log(`${name} (${w}×${h})`);
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "supercut-"));
  try {
    const parts = [];
    for (const [i, clip] of config.clips.entries()) {
      const item = (await manifest(clip.trip)).items.find((m) => m.id === clip.id);
      if (!item) throw new Error(`${clip.trip}/${clip.id} isn't in the manifest`);
      // the raw original when it's there (full resolution), else the web version
      const original = path.join(ROOT, "media", clip.trip, item.source);
      const src = (await exists(original)) ? original : path.join(ROOT, "public", item.src);
      const info = await probe(src);
      const isHdr = /arib-std-b67|smpte2084/.test(info);
      // the largest w:h window the frame allows, placed at the clip's x / y (default: centred)
      const x = clip.x ?? 0.5;
      const y = clip.y ?? 0.5;
      const crop = `crop='min(iw,ih*${w}/${h})':'min(ih,iw*${h}/${w})':'(iw-ow)*${x}':'(ih-oh)*${y}'`;
      const vf = `${isHdr ? TONEMAP : ""}${crop},scale=${w}:${h}:flags=lanczos,fps=${FPS},setsar=1,format=yuv420p`;
      const part = path.join(tmp, `${String(i).padStart(2, "0")}.mp4`);
      await run(ffmpegPath, [
        "-hide_banner", "-loglevel", "error", "-y",
        "-ss", String(clip.start ?? 0), "-i", src, "-t", String(clip.length ?? config.cut),
        "-an", "-vf", vf,
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "12",
        part,
      ], { maxBuffer: 1 << 26 });
      parts.push(part);
      console.log(`  ✓ [${i + 1}/${config.clips.length}] ${clip.trip}/${item.source}${isHdr ? " (HDR)" : ""}`);
    }

    const list = path.join(tmp, "list.txt");
    await fs.writeFile(list, parts.map((p) => `file '${p}'`).join("\n"));
    const mp4 = path.join(OUT_DIR, `${name}.mp4`);
    await run(ffmpegPath, [
      "-hide_banner", "-loglevel", "error", "-y",
      "-f", "concat", "-safe", "0", "-i", list,
      "-an", "-c:v", "libx264", "-preset", "slow", "-crf", crf, "-profile:v", "high", "-tune", "film",
      "-g", String(FPS * 2),
      "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
      "-movflags", "+faststart",
      mp4,
    ], { maxBuffer: 1 << 26 });
    await run(ffmpegPath, [
      "-hide_banner", "-loglevel", "error", "-y", "-i", mp4,
      "-frames:v", "1", "-c:v", "libwebp", "-quality", "82", path.join(OUT_DIR, `${name}-poster.webp`),
    ]);
    const { size } = await fs.stat(mp4);
    console.log(`  → public/media/home/${name}.mp4 (${(size / 1e6).toFixed(1)} MB)`);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
}

async function exists(file) {
  return fs.access(file).then(() => true, () => false);
}

/** ffmpeg prints stream metadata to stderr for `-i` with no output (and exits 1). */
async function probe(file) {
  try {
    await run(ffmpegPath, ["-hide_banner", "-i", file]);
    return "";
  } catch (err) {
    return err.stderr ?? "";
  }
}
