import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import * as mm from "music-metadata";
import { LyricLine, LyricsPayload } from "@/types";

const LYRICS_CACHE_FILE = path.join(process.cwd(), ".lyrics_cache.json");
const memoryLyricsCache = new Map<string, LyricsPayload>();

// Load disk cache on server start
function getCachedLyrics(key: string): LyricsPayload | null {
  if (memoryLyricsCache.has(key)) return memoryLyricsCache.get(key)!;

  if (fs.existsSync(LYRICS_CACHE_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(LYRICS_CACHE_FILE, "utf-8"));
      if (data[key]) {
        memoryLyricsCache.set(key, data[key]);
        return data[key];
      }
    } catch {}
  }
  return null;
}

function saveLyricsToCache(key: string, payload: LyricsPayload) {
  memoryLyricsCache.set(key, payload);
  try {
    let diskData: Record<string, LyricsPayload> = {};
    if (fs.existsSync(LYRICS_CACHE_FILE)) {
      diskData = JSON.parse(fs.readFileSync(LYRICS_CACHE_FILE, "utf-8"));
    }
    diskData[key] = payload;
    fs.writeFileSync(LYRICS_CACHE_FILE, JSON.stringify(diskData, null, 2), "utf-8");
  } catch {}
}

function parseLRC(lrcText: string): LyricLine[] {
  const lines = lrcText.split("\n");
  const parsed: LyricLine[] = [];
  const timeRegex = /\[(\d{2}):(\d{2})\.?(\d{1,3})?\]/g;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const matches = [...line.matchAll(timeRegex)];
    if (matches.length > 0) {
      const text = line.replace(timeRegex, "").trim();
      for (const m of matches) {
        const min = parseInt(m[1], 10);
        const sec = parseInt(m[2], 10);
        const ms = m[3] ? parseInt(m[3].padEnd(3, "0").slice(0, 3), 10) : 0;
        const total = min * 60 + sec + ms / 1000;
        parsed.push({ time: total, text: text || "♪" });
      }
    } else if (!line.startsWith("[") || !line.endsWith("]")) {
      parsed.push({ time: null, text: line });
    }
  }

  parsed.sort((a, b) => (a.time || 0) - (b.time || 0));
  return parsed;
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

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const filename = searchParams.get("filename") || "";
  const artist = searchParams.get("artist") || "";
  const title = searchParams.get("title") || "";

  if (!title && !filename) {
    return NextResponse.json({ error: "Title or filename is required" }, { status: 400 });
  }

  const cacheKey = filename || `${artist} - ${title}`;
  const cached = getCachedLyrics(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  const musicDir = getMusicDir();
  let fallbackPlainLines: LyricLine[] = [];

  // Step 1: Check Local File for Embedded SYLT (Synchronized) or Companion .lrc
  if (filename) {
    const safeFilename = path.basename(filename);
    const audioPath = path.join(musicDir, safeFilename);

    // Check companion .lrc file in Music directory
    const ext = path.extname(safeFilename);
    const lrcPath = path.join(musicDir, path.basename(safeFilename, ext) + ".lrc");
    if (fs.existsSync(lrcPath)) {
      try {
        const lrcContent = fs.readFileSync(lrcPath, "utf-8");
        const lines = parseLRC(lrcContent);
        if (lines.length > 0) {
          const payload: LyricsPayload = {
            source: "Local LRC (Synced)",
            synced: lrcContent,
            plain: null,
            lines,
          };
          saveLyricsToCache(cacheKey, payload);
          return NextResponse.json(payload);
        }
      } catch {}
    }

    // Check ID3 metadata for embedded lyrics
    if (fs.existsSync(audioPath)) {
      try {
        const meta = await mm.parseFile(audioPath);
        if (meta.common.lyrics && meta.common.lyrics.length > 0) {
          // Check for SYLT (syncText)
          const syncItem = meta.common.lyrics.find(
            (l: any) => l.syncText && Array.isArray(l.syncText) && l.syncText.length > 0
          );

          if (syncItem) {
            const lines: LyricLine[] = (syncItem as any).syncText
              .map((st: any) => ({
                time: Math.round((st.timestamp / 1000) * 100) / 100,
                text: (st.text || "").trim(),
              }))
              .filter((l: LyricLine) => l.text.length > 0);

            if (lines.length > 0) {
              const payload: LyricsPayload = {
                source: "Embedded ID3 (Synced)",
                synced: "true",
                plain: null,
                lines,
              };
              saveLyricsToCache(cacheKey, payload);
              return NextResponse.json(payload);
            }
          }

          // Check for embedded LRC timestamped text
          for (const item of meta.common.lyrics) {
            if (item.text && /\[\d{2}:\d{2}/.test(item.text)) {
              const lines = parseLRC(item.text);
              if (lines.length > 0) {
                const payload: LyricsPayload = {
                  source: "Embedded LRC (Synced)",
                  synced: item.text,
                  plain: null,
                  lines,
                };
                saveLyricsToCache(cacheKey, payload);
                return NextResponse.json(payload);
              }
            } else if (item.text && item.text.trim().length > 10) {
              fallbackPlainLines = item.text
                .split("\n")
                .map((l: string) => ({ time: null, text: l.trim() }))
                .filter((l: LyricLine) => l.text.length > 0);
            }
          }
        }
      } catch (err) {
        console.warn(`Error reading embedded lyrics for ${filename}:`, err);
      }
    }
  }

  // Step 2: Query Online LRCLIB with fast parallel requests
  const cleanTitle = title
    .replace(/\s*\((feat|ft|with|from).*?\)/gi, "")
    .replace(/\s*\[.*?\]/gi, "")
    .trim();
  const cleanArtist = artist.split(/&|,|feat|ft/i)[0].trim();

  try {
    const fetchPromises: Promise<LyricsPayload | null>[] = [];

    // Query 1: Exact search
    if (artist && title) {
      const exactUrl = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(title)}`;
      fetchPromises.push(
        fetch(exactUrl, {
          headers: { "User-Agent": "Harmonify/2.0.0" },
          signal: AbortSignal.timeout(3000),
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            if (data?.syncedLyrics) {
              return {
                source: "LRCLIB (Synced)",
                synced: data.syncedLyrics,
                plain: data.plainLyrics || null,
                lines: parseLRC(data.syncedLyrics),
              };
            }
            return null;
          })
          .catch(() => null)
      );
    }

    // Query 2: Cleaned title and artist search
    if (cleanTitle !== title || cleanArtist !== artist) {
      const cleanUrl = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(cleanArtist)}&track_name=${encodeURIComponent(cleanTitle)}`;
      fetchPromises.push(
        fetch(cleanUrl, {
          headers: { "User-Agent": "Harmonify/2.0.0" },
          signal: AbortSignal.timeout(3000),
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            if (data?.syncedLyrics) {
              return {
                source: "LRCLIB (Synced)",
                synced: data.syncedLyrics,
                plain: data.plainLyrics || null,
                lines: parseLRC(data.syncedLyrics),
              };
            }
            return null;
          })
          .catch(() => null)
      );
    }

    // Query 3: Search endpoint fallback
    const searchUrl = `https://lrclib.net/api/search?track_name=${encodeURIComponent(cleanTitle || title)}&artist_name=${encodeURIComponent(cleanArtist || artist)}`;
    fetchPromises.push(
      fetch(searchUrl, {
        headers: { "User-Agent": "Harmonify/2.0.0" },
        signal: AbortSignal.timeout(3000),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((list) => {
          if (Array.isArray(list)) {
            const match = list.find((item: any) => Boolean(item.syncedLyrics));
            if (match) {
              return {
                source: "LRCLIB (Synced)",
                synced: match.syncedLyrics,
                plain: match.plainLyrics || null,
                lines: parseLRC(match.syncedLyrics),
              };
            }
          }
          return null;
        })
        .catch(() => null)
    );

    const onlineResults = await Promise.all(fetchPromises);
    const foundSynced = onlineResults.find((r) => r !== null && r.lines.length > 0);

    if (foundSynced) {
      saveLyricsToCache(cacheKey, foundSynced);
      return NextResponse.json(foundSynced);
    }
  } catch (err) {
    console.warn("Error fetching online lyrics:", err);
  }

  // Step 3: If no synced lyrics, return embedded plain lyrics if available
  if (fallbackPlainLines.length > 0) {
    const payload: LyricsPayload = {
      source: "Embedded ID3 (Plain)",
      synced: null,
      plain: "true",
      lines: fallbackPlainLines,
    };
    saveLyricsToCache(cacheKey, payload);
    return NextResponse.json(payload);
  }

  // Step 4: Final plain fallback via Lyrics.ovh
  try {
    if (artist && title) {
      const ovhUrl = `https://api.lyrics.ovh/v1/${encodeURIComponent(cleanArtist || artist)}/${encodeURIComponent(cleanTitle || title)}`;
      const ovhRes = await fetch(ovhUrl, { signal: AbortSignal.timeout(2500) });
      if (ovhRes.ok) {
        const data = await ovhRes.json();
        if (data.lyrics) {
          const lines = data.lyrics
            .split("\n")
            .map((l: string) => ({ time: null, text: l.trim() }))
            .filter((l: LyricLine) => l.text.length > 0);

          const payload: LyricsPayload = {
            source: "Lyrics.ovh",
            synced: null,
            plain: data.lyrics,
            lines,
          };
          saveLyricsToCache(cacheKey, payload);
          return NextResponse.json(payload);
        }
      }
    }
  } catch {}

  return NextResponse.json({
    source: "None",
    synced: null,
    plain: null,
    lines: [],
  });
}
