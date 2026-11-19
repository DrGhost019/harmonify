import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import * as mm from "music-metadata";

// In-memory cache for cover art buffers
const coverCache = new Map<string, { buffer: Buffer; format: string }>();

const DEFAULT_COVER_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e1e28" />
      <stop offset="100%" stop-color="#121218" />
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#grad)" />
  <circle cx="150" cy="150" r="75" fill="none" stroke="#ffffff" stroke-opacity="0.06" stroke-width="4" />
  <circle cx="150" cy="150" r="35" fill="none" stroke="#ffffff" stroke-opacity="0.06" stroke-width="4" />
  <g transform="translate(105, 105) scale(3.75)" fill="none" stroke="#22c55e" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </g>
</svg>
`.trim();

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
  const songParam = request.nextUrl.searchParams.get("song");

  if (!songParam) {
    return new NextResponse(DEFAULT_COVER_SVG, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=86400",
      },
    });
  }

  let decoded = songParam;
  try {
    decoded = decodeURIComponent(songParam);
  } catch {}

  const safeFilename = path.basename(decoded);

  // Check in-memory cache
  if (coverCache.has(safeFilename)) {
    const cached = coverCache.get(safeFilename)!;
    return new NextResponse(new Uint8Array(cached.buffer), {
      headers: {
        "Content-Type": cached.format,
        "Cache-Control": "public, max-age=604800, immutable",
      },
    });
  }

  const musicDir = getMusicDir();
  const filePath = path.join(musicDir, safeFilename);

  if (!fs.existsSync(filePath)) {
    return new NextResponse(DEFAULT_COVER_SVG, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=86400",
      },
    });
  }

  try {
    const meta = await mm.parseFile(filePath, { skipCovers: false });
    if (meta.common.picture && meta.common.picture.length > 0) {
      const pic = meta.common.picture[0];
      const buffer = Buffer.from(pic.data);
      const format = pic.format || "image/jpeg";

      // Limit memory cache size to 400 entries to prevent excessive memory usage
      if (coverCache.size > 400) {
        const firstKey = coverCache.keys().next().value;
        if (firstKey) coverCache.delete(firstKey);
      }
      coverCache.set(safeFilename, { buffer, format });

      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": format,
          "Cache-Control": "public, max-age=604800, immutable",
        },
      });
    }
  } catch (err) {
    console.warn(`Failed to extract cover for ${safeFilename}:`, err);
  }

  return new NextResponse(DEFAULT_COVER_SVG, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
