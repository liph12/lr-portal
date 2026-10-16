<?php

namespace App\Models\Entities;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// A short link on the portal's domain (/url/{code}) that an agent made for a QR code (ShortLinkService).
class ShortLink extends Model
{
    protected $fillable = ['user_id', 'code', 'url', 'title'];

    protected function casts(): array
    {
        return ['clicks' => 'integer', 'last_clicked_at' => 'datetime'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function shortUrl(): string
    {
        return url('/url/'.$this->code);
    }
}
