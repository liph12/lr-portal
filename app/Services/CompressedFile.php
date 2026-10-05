<?php

namespace App\Services;

final class CompressedFile
{
    public function __construct(
        public readonly string $contents,
        public readonly string $mimeType,
        public readonly string $extension,
        public readonly int $originalSize,
        public readonly ?string $contentEncoding = null,
    ) {}

    public function size(): int
    {
        return strlen($this->contents);
    }
}
