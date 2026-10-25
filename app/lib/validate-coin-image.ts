import sharp from "sharp";
import { IMAGE_TYPES, MAX_IMAGE_BYTES, MAX_IMAGE_PIXELS } from "./coin-image";
export class ImageUploadError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function validateImageRequest(request: Request) {
  const type = request.headers.get("content-type")?.split(";")[0].trim() || "";
  if (!IMAGE_TYPES.includes(type))
    throw new ImageUploadError(
      "Only PNG, JPEG, and WebP images are supported.",
      415,
    );
  if (Number(request.headers.get("content-length")) > MAX_IMAGE_BYTES)
    throw new ImageUploadError("Image must be smaller than 3 MB.", 413);
  if (!request.body)
    throw new ImageUploadError("Choose an image to upload.", 400);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_IMAGE_BYTES) {
        await reader.cancel();
        throw new ImageUploadError("Image must be smaller than 3 MB.", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  if (!size) throw new ImageUploadError("The image file is empty.", 400);
  const bytes = Buffer.concat(chunks);
  try {
    const image = sharp(bytes, {
      limitInputPixels: MAX_IMAGE_PIXELS,
      failOn: "warning",
    });
    const meta = await image.metadata();
    const formats: Record<string, { type: string; extension: string }> = {
      png: { type: "image/png", extension: "png" },
      jpeg: { type: "image/jpeg", extension: "jpg" },
      webp: { type: "image/webp", extension: "webp" },
    };
    const format = meta.format ? formats[meta.format] : undefined;
    if (!format || format.type !== type) throw new Error("Type mismatch");
    if ((meta.pages || 1) > 1) throw new Error("Animated image");
    // Fully decode and re-encode the raster; header/MIME checks alone accept corrupt files.
    const data = await image.rotate().toBuffer();
    if (data.byteLength > MAX_IMAGE_BYTES)
      throw new ImageUploadError(
        "The processed image exceeds 3 MB. Choose a smaller image.",
        413,
      );
    return { data, ...format };
  } catch (error) {
    if (error instanceof ImageUploadError) throw error;
    throw new ImageUploadError(
      "Choose a valid, non-animated PNG, JPEG, or WebP image (up to 16 megapixels).",
      415,
    );
  }
}
