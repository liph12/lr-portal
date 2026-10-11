<?php

namespace App\Services;

use App\Models\User;
use GdImage;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

class ProfilePhotoService
{
    // Shown at most ~120px; 512 keeps it sharp on 3x screens while staying around 30–60KB.
    private const SIZE = 512;
    private const WEBP_QUALITY = 82;

    public function __construct(
        private ProfileService $profiles,
        private ActivityLogger $activity,
    ) {}

    // Folders this service owns on the photos disk; only objects under them are ever deleted.
    private const FOLDERS = ['avatars/', 'team-logos/'];

    public function replace(User $user, UploadedFile $photo, string $description = 'Updated profile photo'): string
    {
        [$url, $bytesStored] = $this->uploadSquare($photo, "avatars/{$user->id}");

        $agent = $this->profiles->agentFor($user);
        $previous = $agent->avatar;
        $agent->update(['avatar' => $url]);

        $this->deleteStored($previous);

        $this->activity->describe('profile.photo_updated', $description, $agent, [
            'avatar' => $agent->avatar,
            'bytes_uploaded' => $photo->getSize(),
            'bytes_stored' => $bytesStored,
        ]);

        return $agent->avatar;
    }

    /**
     * Square-crops the photo to a 512px WebP and uploads it under the folder.
     *
     * @return array{0: string, 1: int} [full URL, bytes stored]
     */
    public function uploadSquare(UploadedFile $photo, string $folder): array
    {
        $diskName = config('filesystems.profile_photos_disk');
        $disk = Storage::disk($diskName);

        $contents = $this->squareWebp($photo);
        $path = sprintf('%s/%s.webp', trim($folder, '/'), Str::uuid());

        if (! $disk->put($path, $contents, ['ContentType' => 'image/webp', 'CacheControl' => 'public, max-age=31536000, immutable'])) {
            throw new RuntimeException("Could not upload the photo to the [{$diskName}] disk.");
        }

        return [$disk->url($path), strlen($contents)];
    }

    public function remove(User $user): void
    {
        $agent = $user->agent()->first();

        if (! $agent?->avatar) {
            return;
        }

        $previous = $agent->avatar;
        $agent->update(['avatar' => null]);
        $this->deleteStored($previous);

        $this->activity->describe('profile.photo_removed', 'Removed profile photo', $agent);
    }

    private function squareWebp(UploadedFile $photo): string
    {
        $source = @imagecreatefromstring($photo->get());

        if (! $source instanceof GdImage) {
            throw new RuntimeException('The photo could not be read as an image.');
        }

        $source = $this->applyExifOrientation($source, $photo);

        // Center-crop to a square so avatars never stretch.
        $width = imagesx($source);
        $height = imagesy($source);
        $side = min($width, $height);
        $target = min(self::SIZE, $side);

        $square = imagecreatetruecolor($target, $target);
        imagealphablending($square, false);
        imagesavealpha($square, true);
        imagecopyresampled(
            $square, $source,
            0, 0,
            intdiv($width - $side, 2), intdiv($height - $side, 2),
            $target, $target,
            $side, $side,
        );
        imagedestroy($source);

        ob_start();
        imagewebp($square, null, self::WEBP_QUALITY);
        $contents = (string) ob_get_clean();
        imagedestroy($square);

        if ($contents === '') {
            throw new RuntimeException('The photo could not be compressed.');
        }

        return $contents;
    }

    private function applyExifOrientation(GdImage $image, UploadedFile $photo): GdImage
    {
        if ($photo->getMimeType() !== 'image/jpeg' || ! function_exists('exif_read_data')) {
            return $image;
        }

        $angle = match ((int) ((@exif_read_data($photo->getRealPath()) ?: [])['Orientation'] ?? 1)) {
            3 => 180,
            6 => -90,
            8 => 90,
            default => 0,
        };

        $rotated = $angle ? imagerotate($image, $angle, 0) : false;

        if (! $rotated instanceof GdImage) {
            return $image;
        }

        imagedestroy($image);

        return $rotated;
    }

    // Only deletes objects this app put under its own folders on the configured disk; foreign URLs
    // (e.g. legacy photos on the old site) are left alone.
    public function deleteStored(?string $url): void
    {
        if (! $url) {
            return;
        }

        $disk = Storage::disk(config('filesystems.profile_photos_disk'));
        $base = rtrim($disk->url(''), '/').'/';

        if (str_starts_with($url, $base) && $this->ownsPath($path = substr($url, strlen($base)))) {
            $disk->delete($path);
        }
    }

    private function ownsPath(string $path): bool
    {
        foreach (self::FOLDERS as $folder) {
            if (str_starts_with($path, $folder)) {
                return true;
            }
        }

        return false;
    }
}
