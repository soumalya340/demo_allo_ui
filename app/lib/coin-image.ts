export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 16_000_000;
export const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
export function validateImageFile(file: { size: number; type: string }) {
  if (!IMAGE_TYPES.includes(file.type))
    throw new Error("Choose a PNG, JPEG, or WebP image.");
  if (!file.size) throw new Error("The image file is empty.");
  if (file.size > MAX_IMAGE_BYTES)
    throw new Error("Choose an image smaller than 3 MB.");
}
export async function uploadCoinImage(
  file: File,
  signal?: AbortSignal,
): Promise<string> {
  validateImageFile(file);
  const response = await fetch(
    `/api/coin-image/upload?${new URLSearchParams({ filename: file.name })}`,
    {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(55000)])
        : AbortSignal.timeout(55000),
    },
  );
  const data = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(data?.error || "Image upload failed. Please try again.");
  let url: URL;
  try {
    url = new URL(data.url);
  } catch {
    throw new Error("The upload did not return a valid image URL.");
  }
  if (
    url.protocol !== "https:" ||
    !url.hostname.endsWith(".public.blob.vercel-storage.com")
  )
    throw new Error("The upload did not return a public Vercel Blob URL.");
  return url.href;
}
