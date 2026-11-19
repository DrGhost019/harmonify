import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const ALLOWED_EXTS = [".mp3", ".wav", ".flac", ".ogg", ".m4a", ".aac"];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }

    const musicDir = process.env.MUSIC_DIR || path.join(process.cwd(), "Music");
    if (!fs.existsSync(musicDir)) {
      fs.mkdirSync(musicDir, { recursive: true });
    }

    const uploadedNames: string[] = [];

    for (const file of files) {
      const ext = path.extname(file.name).toLowerCase();
      if (!ALLOWED_EXTS.includes(ext)) continue;

      const safeName = path.basename(file.name);
      const targetPath = path.join(musicDir, safeName);
      const buffer = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(targetPath, buffer);
      uploadedNames.push(safeName);
    }

    return NextResponse.json({
      success: true,
      count: uploadedNames.length,
      files: uploadedNames,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 500 });
  }
}
