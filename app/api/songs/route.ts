import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import * as mm from "music-metadata";
import { Song } from "@/types";

const SUPPORTED_EXTS = [".mp3", ".wav", ".flac", ".ogg", ".m4a", ".aac"];
const CACHE_FILE = path.join(process.cwd(), ".library_cache.json");

interface CachedMeta {
  mtimeMs: number;
  title: string;
  artist: string;
  album: string;
  duration: number;
  durationFormatted: string;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds <= 0) return "--:--";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

function parseFilenameFallback(filename: string): { title: string; artist: string } {
  const ext = path.extname(filename);
  const cleanName = path.basename(filename, ext).trim();

  // Pattern: "Title - Artist" or "Title _ Artist"
  const separators = [" - ", " – ", " — ", " _ "];
  for (const sep of separators) {
    if (cleanName.includes(sep)) {
      const parts = cleanName.split(sep);
      return {
        title: parts[0].trim(),
        artist: parts.slice(1).join(sep).trim() || "Unknown Artist",
      };
    }
  }

  return { title: cleanName, artist: "Unknown Artist" };
}

function getMusicDir(): string {
  if (process.env.MUSIC_DIR) return process.env.MUSIC_DIR;
  const upper = path.join(process.cwd(), "Music");
  const lower = path.join(process.cwd(), "music");
  if (fs.existsSync(lower) && !fs.existsSync(upper)) {
    return lower;
  }
  return upper;
}

export async function GET() {
  const musicDir = getMusicDir();

  if (!fs.existsSync(musicDir)) {
    try {
      fs.mkdirSync(musicDir, { recursive: true });
    } catch (e) {
      console.warn("Failed to create music directory:", e);
    }
  }

  let files: string[] = [];
  try {
    files = fs.readdirSync(musicDir);
  } catch (err) {
    console.error("Failed to read music directory:", err);
    return NextResponse.json({ songs: [], total: 0, musicDir });
  }

  const audioFiles = files.filter((f) => {
    const ext = path.extname(f).toLowerCase();
    return SUPPORTED_EXTS.includes(ext);
  });

  // Load existing cache if available
  let cache: Record<string, CachedMeta> = {};
  if (fs.existsSync(CACHE_FILE)) {
    try {
      cache = JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
    } catch {
      cache = {};
    }
  }

  let cacheUpdated = false;
  const songs: Song[] = [];

  // Identify files needing metadata extraction
  const toExtract: string[] = [];

  for (const filename of audioFiles) {
    const filePath = path.join(musicDir, filename);
    try {
      const stat = fs.statSync(filePath);
      const cached = cache[filename];
      if (cached && Math.abs(cached.mtimeMs - stat.mtimeMs) < 10) {
        continue;
      } else {
        toExtract.push(filename);
      }
    } catch {
      toExtract.push(filename);
    }
  }

  // Extract metadata in parallel batches for uncached/modified files
  if (toExtract.length > 0) {
    const BATCH_SIZE = 25;
    for (let i = 0; i < toExtract.length; i += BATCH_SIZE) {
      const batch = toExtract.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (filename) => {
          const filePath = path.join(musicDir, filename);
          try {
            const stat = fs.statSync(filePath);
            const meta = await mm.parseFile(filePath, { skipCovers: true });
            const fallback = parseFilenameFallback(filename);

            const title = meta.common.title?.trim() || fallback.title;
            const artist = meta.common.artist?.trim() || fallback.artist;
            const album = meta.common.album?.trim() || "Single";
            const duration = Math.round(meta.format.duration || 0);

            cache[filename] = {
              mtimeMs: stat.mtimeMs,
              title,
              artist,
              album,
              duration,
              durationFormatted: formatTime(duration),
            };
            cacheUpdated = true;
          } catch {
            const stat = fs.existsSync(filePath) ? fs.statSync(filePath) : { mtimeMs: Date.now() };
            const fallback = parseFilenameFallback(filename);
            cache[filename] = {
              mtimeMs: stat.mtimeMs,
              title: fallback.title,
              artist: fallback.artist,
              album: "Local Music",
              duration: 0,
              durationFormatted: "--:--",
            };
            cacheUpdated = true;
          }
        })
      );
    }
  }

  // Persist updated cache
  if (cacheUpdated) {
    try {
      fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), "utf-8");
    } catch (e) {
      console.warn("Failed to save library cache:", e);
    }
  }

  // Build finalized Song objects
  for (let i = 0; i < audioFiles.length; i++) {
    const filename = audioFiles[i];
    const data = cache[filename] || {
      title: filename,
      artist: "Unknown Artist",
      album: "Local Music",
      duration: 0,
      durationFormatted: "--:--",
    };

    songs.push({
      id: i,
      filename,
      title: data.title,
      artist: data.artist,
      album: data.album,
      duration: data.duration,
      durationFormatted: data.durationFormatted,
      coverArt: `/api/cover?song=${encodeURIComponent(filename)}`,
      streamUrl: `/api/stream?song=${encodeURIComponent(filename)}`,
    });
  }

  return NextResponse.json({ songs, total: songs.length, musicDir });
}
