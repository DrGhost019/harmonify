import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import * as mm from "music-metadata";

// In-memory cache for fast repeat lookups
const metaCache = new Map<
  string,
  { title: string | null; artist: string | null; album: string | null; duration: number | null; coverArt: string | null }
>();

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
    return NextResponse.json({ error: "Song parameter required" }, { status: 400 });
  }

  const decodedSong = decodeURIComponent(songParam);
  const safeFilename = path.basename(decodedSong);
  const musicDir = getMusicDir();
  const filePath = path.join(musicDir, safeFilename);

  if (metaCache.has(safeFilename)) {
    return NextResponse.json(metaCache.get(safeFilename));
  }

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  try {
    const meta = await mm.parseFile(filePath, { skipCovers: false });
    let coverArt: string | null = null;

    if (meta.common && meta.common.picture && meta.common.picture.length > 0) {
      const pic = meta.common.picture[0];
      const base64 = Buffer.from(pic.data).toString("base64");
      coverArt = `data:${pic.format};base64,${base64}`;
    }

    const payload = {
      title: meta.common ? meta.common.title || null : null,
      artist: meta.common ? meta.common.artist || null : null,
      album: meta.common ? meta.common.album || null : null,
      duration: meta.format ? meta.format.duration || null : null,
      coverArt,
    };

    metaCache.set(safeFilename, payload);
    return NextResponse.json(payload);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
