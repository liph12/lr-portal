const COMPRESSIBLE = ["image/jpeg", "image/png", "image/webp"];

interface CompressOptions {
    maxDimension?: number;
    quality?: number;
}

export function isCompressibleImage(file: File): boolean {
    return COMPRESSIBLE.indexOf(file.type) !== -1;
}

// Shrinks a photo before upload so 20MB phone shots don't hit PHP's request limits.
// Returns the original file when compression can't run or wouldn't make it smaller.
export async function compressImage(
    file: File,
    { maxDimension = 2400, quality = 0.8 }: CompressOptions = {},
): Promise<File> {
    if (!isCompressibleImage(file) || typeof createImageBitmap !== "function") return file;

    let bitmap: ImageBitmap;
    try {
        // from-image applies EXIF orientation, so phone photos aren't stored sideways.
        bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
        return file;
    }

    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        bitmap.close();
        return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    // PNG/WebP keep transparency as WebP; JPEG stays JPEG.
    const type = file.type === "image/jpeg" ? "image/jpeg" : "image/webp";
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

    if (!blob || blob.size >= file.size) return file;

    const ext = type === "image/jpeg" ? "jpg" : "webp";
    const name = file.name.replace(/\.[^.]+$/, "") + `.${ext}`;

    return new File([blob], name, { type, lastModified: file.lastModified });
}
