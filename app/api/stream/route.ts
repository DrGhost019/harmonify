import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const MIME_MAP: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".flac": "audio/flac",
  ".ogg": "audio/ogg",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
};

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
    return new NextResponse("Song query parameter required", { status: 400 });
  }

  const decodedFilename = decodeURIComponent(songParam);
  const safeFilename = path.basename(decodedFilename);
  const musicDir = getMusicDir();
  const filePath = path.join(musicDir, safeFilename);

  if (!fs.existsSync(filePath)) {
    return new NextResponse("Song not found", { status: 404 });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_MAP[ext] || "audio/mpeg";

  const range = request.headers.get("range");

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = end - start + 1;

    const stream = fs.createReadStream(filePath, { start, end });

    const webStream = new ReadableStream({
      start(controller) {
        stream.on("data", (chunk) => controller.enqueue(chunk));
        stream.on("end", () => controller.close());
        stream.on("error", (err) => controller.error(err));
      },
      cancel() {
        stream.destroy();
      },
    });

    return new NextResponse(webStream, {
      status: 206,
      headers: {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize.toString(),
        "Content-Type": contentType,
      },
    });
  } else {
    const stream = fs.createReadStream(filePath);
    const webStream = new ReadableStream({
      start(controller) {
        stream.on("data", (chunk) => controller.enqueue(chunk));
        stream.on("end", () => controller.close());
        stream.on("error", (err) => controller.error(err));
      },
      cancel() {
        stream.destroy();
      },
    });

    return new NextResponse(webStream, {
      status: 200,
      headers: {
        "Content-Length": fileSize.toString(),
        "Content-Type": contentType,
        "Accept-Ranges": "bytes",
      },
    });
  }
}
