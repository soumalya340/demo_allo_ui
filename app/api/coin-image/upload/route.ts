import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import {
  ImageUploadError,
  validateImageRequest,
} from "../../../lib/validate-coin-image";
export const maxDuration = 60;
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return NextResponse.json(
      { error: "Upload from this site only." },
      { status: 403 },
    );
  try {
    const image = await validateImageRequest(request);
    if (!process.env.BLOB_READ_WRITE_TOKEN)
      return NextResponse.json(
        {
          error:
            "Image storage is not configured. Connect a public Vercel Blob store and set BLOB_READ_WRITE_TOKEN.",
        },
        { status: 503 },
      );
    const filename =
      new URL(request.url).searchParams.get("filename") || "coin";
    const stem =
      filename
        .split(/[\\/]/)
        .pop()!
        .replace(/\.[^.]+$/, "")
        .replace(/[^a-zA-Z0-9_-]/g, "-")
        .slice(0, 80) || "coin";
    const blob = await put(
      `coin-images/${stem}.${image.extension}`,
      image.data,
      { access: "public", addRandomSuffix: true, contentType: image.type },
    );
    return NextResponse.json(
      { url: blob.url, pathname: blob.pathname, contentType: blob.contentType },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof ImageUploadError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    return NextResponse.json(
      { error: "Image upload failed. Please try again." },
      { status: 502 },
    );
  }
}
