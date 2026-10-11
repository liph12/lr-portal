<?php

namespace App\Services;

use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

// Compresses and uploads sale documents to the sale files disk, remembering what it put there so a
// failed save can take the objects back out (the bucket doesn't roll back with the database).
class SaleFileStorage
{
    /** @var array<int, string> */
    private array $uploaded = [];

    /** @var array<int, CompressedFile> */
    private array $compressed = [];

    public function __construct(private FileCompressionService $compressor) {}

    /**
     * @return string the object's full URL
     */
    public function store(UploadedFile $file, string $folder): string
    {
        $compressed = $this->compressor->compress($file);
        $path = sprintf('%s/%s.%s', trim($folder, '/'), Str::uuid(), $compressed->extension);
        $originalName = $file->getClientOriginalName();

        // No ACL is sent: the stored URL is the plain object URL, so access follows the bucket policy.
        $options = array_filter([
            'ContentType' => $compressed->mimeType,
            'ContentEncoding' => $compressed->contentEncoding,
            'ContentDisposition' => 'inline; filename="'.addcslashes(Str::ascii($originalName), '"\\').'"',
        ]);

        if (! $this->disk()->put($path, $compressed->contents, $options)) {
            throw new RuntimeException("Could not upload {$originalName} to the [{$this->diskName()}] disk.");
        }

        $this->uploaded[] = $path;
        $this->compressed[] = $compressed;

        return $this->disk()->url($path);
    }

    public function discardUploaded(): void
    {
        foreach ($this->uploaded as $path) {
            $this->disk()->delete($path);
        }

        $this->uploaded = [];
        $this->compressed = [];
    }

    /**
     * @return array{bytes_uploaded: int, bytes_stored: int}
     */
    public function totals(): array
    {
        return [
            'bytes_uploaded' => array_sum(array_map(fn (CompressedFile $c) => $c->originalSize, $this->compressed)),
            'bytes_stored' => array_sum(array_map(fn (CompressedFile $c) => $c->size(), $this->compressed)),
        ];
    }

    private function disk(): Filesystem
    {
        return Storage::disk($this->diskName());
    }

    private function diskName(): string
    {
        return config('filesystems.sale_files_disk');
    }
}
