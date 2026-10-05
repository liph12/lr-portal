<?php

namespace App\Services;

use GdImage;
use Illuminate\Http\UploadedFile;

class FileCompressionService
{
    private const MAX_IMAGE_DIMENSION = 2400;
    private const JPEG_QUALITY = 80;
    private const WEBP_QUALITY = 80;
    // Below this saving, gzip isn't worth making every download go through Content-Encoding.
    private const MIN_GZIP_SAVING = 0.10;

    private const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

    public function compress(UploadedFile $file): CompressedFile
    {
        $contents = $file->get();
        $mimeType = $file->getMimeType() ?? 'application/octet-stream';
        $extension = strtolower($file->guessExtension() ?? $file->getClientOriginalExtension());

        if (in_array($mimeType, self::IMAGE_TYPES, true)) {
            return $this->compressImage($file, $contents, $mimeType, $extension)
                ?? new CompressedFile($contents, $mimeType, $extension, strlen($contents));
        }

        return $this->gzip($contents, $mimeType, $extension);
    }

    private function compressImage(UploadedFile $file, string $contents, string $mimeType, string $extension): ?CompressedFile
    {
        $image = @imagecreatefromstring($contents);

        if (! $image instanceof GdImage) {
            return null;
        }

        $rotated = $mimeType === 'image/jpeg' && $this->applyExifOrientation($image, $file->getRealPath());
        $image = $this->downscale($image);

        // PNGs become WebP: it keeps transparency and is far smaller for photos of documents.
        [$encoded, $outMime, $outExt] = $mimeType === 'image/jpeg'
            ? [$this->encode(fn () => imagejpeg($image, null, self::JPEG_QUALITY)), 'image/jpeg', 'jpg']
            : [$this->encodeWebp($image), 'image/webp', 'webp'];

        imagedestroy($image);

        // A rotated photo must be kept even if bigger, or it would be stored sideways.
        if ($encoded === null || (! $rotated && strlen($encoded) >= strlen($contents))) {
            return null;
        }

        return new CompressedFile($encoded, $outMime, $outExt, strlen($contents));
    }

    private function applyExifOrientation(GdImage &$image, string|false $path): bool
    {
        if (! $path || ! function_exists('exif_read_data')) {
            return false;
        }

        $orientation = (@exif_read_data($path) ?: [])['Orientation'] ?? 1;
        $angle = match ((int) $orientation) {
            3 => 180,
            6 => -90,
            8 => 90,
            default => 0,
        };

        if ($angle === 0) {
            return false;
        }

        $rotated = imagerotate($image, $angle, 0);

        if (! $rotated instanceof GdImage) {
            return false;
        }

        imagedestroy($image);
        $image = $rotated;

        return true;
    }

    private function downscale(GdImage $image): GdImage
    {
        $width = imagesx($image);
        $height = imagesy($image);
        $longest = max($width, $height);

        if ($longest <= self::MAX_IMAGE_DIMENSION) {
            return $image;
        }

        $ratio = self::MAX_IMAGE_DIMENSION / $longest;
        $scaled = imagescale($image, (int) round($width * $ratio), (int) round($height * $ratio));

        if (! $scaled instanceof GdImage) {
            return $image;
        }

        imagedestroy($image);

        return $scaled;
    }

    private function encodeWebp(GdImage $image): ?string
    {
        imagepalettetotruecolor($image);
        imagealphablending($image, false);
        imagesavealpha($image, true);

        return $this->encode(fn () => imagewebp($image, null, self::WEBP_QUALITY));
    }

    private function encode(callable $writer): ?string
    {
        ob_start();
        $ok = $writer();
        $output = ob_get_clean();

        return $ok && $output !== false && $output !== '' ? $output : null;
    }

    private function gzip(string $contents, string $mimeType, string $extension): CompressedFile
    {
        $original = strlen($contents);
        $gzipped = gzencode($contents, 9);

        if ($gzipped !== false && strlen($gzipped) <= $original * (1 - self::MIN_GZIP_SAVING)) {
            return new CompressedFile($gzipped, $mimeType, $extension, $original, 'gzip');
        }

        return new CompressedFile($contents, $mimeType, $extension, $original);
    }
}
