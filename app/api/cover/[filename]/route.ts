import { NextRequest, NextResponse } from "next/server";
import { GET as getCover } from "../route";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  const url = new URL(request.url);
  url.searchParams.set("song", filename);
  const forwardReq = new NextRequest(url, request);
  return getCover(forwardReq);
}
