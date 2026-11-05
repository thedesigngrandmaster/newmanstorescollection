// Client-side image compression for bulk product uploads.
// Phone photos are often 5–10 MB each; shrinking them before upload makes a
// batch of products much faster and keeps storage use reasonable.

const MAX_SIDE = 1600;
const QUALITY = 0.82;
const SKIP_BELOW_BYTES = 1_200_000;

type Bitmap = ImageBitmap | HTMLImageElement;

async function loadBitmap(file: File): Promise<Bitmap> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      // Fall through to the <img> path (older Safari / unusual formats).
    }
  }

  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read this image."));
    };
    img.src = url;
  });
}

function closeBitmap(bitmap: Bitmap) {
  if ("close" in bitmap && typeof bitmap.close === "function") bitmap.close();
}

/**
 * Returns a smaller JPEG when possible, otherwise the original file.
 * Never throws — a failed compression just falls back to the original.
 */
export async function compressImage(file: File): Promise<File> {
  if (
    !file.type.startsWith("image/") ||
    file.type === "image/gif" ||
    file.type === "image/svg+xml"
  ) {
    return file;
  }

  try {
    const bitmap = await loadBitmap(file);
    const longest = Math.max(bitmap.width, bitmap.height);
    const scale = Math.min(1, MAX_SIDE / longest);

    if (scale === 1 && file.size <= SKIP_BELOW_BYTES) {
      closeBitmap(bitmap);
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      closeBitmap(bitmap);
      return file;
    }

    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    closeBitmap(bitmap);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", QUALITY),
    );

    if (!blob || blob.size >= file.size) return file;

    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}
