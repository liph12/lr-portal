<?php

namespace App\Services;

use App\Models\Entities\DashboardPoster;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

// The dashboard's posters (Settings › Dashboard posters): images compressed and stored on the photos disk under posters/,
// shown to everyone in order while switched on and within their dates.
class DashboardPosterService
{
    private const FOLDER = 'posters/';

    public function __construct(private FileCompressionService $compressor, private ActivityLogger $activity) {}

    /**
     * What the dashboard's carousel shows.
     *
     * @return array<int, array{id: int, title: string, image_url: string, link_url: ?string}>
     */
    public function showing(): array
    {
        return DashboardPoster::showing()->orderBy('sort_order')->orderBy('id')->get(['id', 'title', 'image_url', 'link_url'])
            ->map(fn (DashboardPoster $p) => ['id' => $p->id, 'title' => $p->title, 'image_url' => $p->image_url, 'link_url' => $p->link_url])->all();
    }

    /**
     * Every poster, for Settings.
     *
     * @return array<int, array<string, mixed>>
     */
    public function all(): array
    {
        $today = now()->toDateString();

        return DashboardPoster::orderBy('sort_order')->orderBy('id')->get()->map(fn (DashboardPoster $p) => [
            'id' => $p->id,
            'title' => $p->title,
            'image_url' => $p->image_url,
            'link_url' => $p->link_url,
            'starts_on' => $p->starts_on?->toDateString(),
            'ends_on' => $p->ends_on?->toDateString(),
            'is_active' => $p->is_active,
            // What the dashboard does with it today.
            'state' => match (true) {
                ! $p->is_active => 'hidden',
                $p->starts_on && $p->starts_on->toDateString() > $today => 'scheduled',
                $p->ends_on && $p->ends_on->toDateString() < $today => 'ended',
                default => 'showing',
            },
        ])->all();
    }

    /**
     * @param  array{title: string, link_url?: ?string, starts_on?: ?string, ends_on?: ?string, is_active?: bool}  $data
     */
    public function create(array $data, UploadedFile $image, User $by): DashboardPoster
    {
        $url = $this->store($image);
        $poster = DashboardPoster::create($this->fields($data) + [
            'image_url' => $url,
            'sort_order' => (int) DashboardPoster::max('sort_order') + 1,
            'created_by' => $by->id,
            'updated_by' => $by->id,
        ]);
        $this->activity->describe('poster.created', "Added the dashboard poster \"{$poster->title}\"", $poster);

        return $poster;
    }

    /**
     * @param  array{title: string, link_url?: ?string, starts_on?: ?string, ends_on?: ?string, is_active?: bool}  $data
     */
    public function update(DashboardPoster $poster, array $data, ?UploadedFile $image, User $by): void
    {
        $previous = $poster->image_url;
        $poster->update($this->fields($data) + ($image ? ['image_url' => $this->store($image)] : []) + ['updated_by' => $by->id]);
        if ($image) {
            $this->deleteStored($previous);
        }
        $this->activity->describe('poster.updated', "Updated the dashboard poster \"{$poster->title}\"", $poster);
    }

    public function setActive(DashboardPoster $poster, bool $active, User $by): void
    {
        $poster->update(['is_active' => $active, 'updated_by' => $by->id]);
        $this->activity->describe('poster.'.($active ? 'shown' : 'hidden'), ($active ? 'Showed' : 'Hid')." the dashboard poster \"{$poster->title}\"", $poster);
    }

    /**
     * @param  array<int, int>  $ids  every poster's id, in the new order
     */
    public function reorder(array $ids): void
    {
        DB::transaction(function () use ($ids) {
            foreach (array_values($ids) as $i => $id) {
                DashboardPoster::whereKey($id)->update(['sort_order' => $i + 1]);
            }
        });
    }

    public function delete(DashboardPoster $poster): void
    {
        $title = $poster->title;
        $url = $poster->image_url;
        $poster->delete();
        $this->deleteStored($url);
        $this->activity->describe('poster.deleted', "Deleted the dashboard poster \"{$title}\"");
    }

    private function fields(array $data): array
    {
        return [
            'title' => $data['title'],
            'link_url' => ($data['link_url'] ?? null) ?: null,
            'starts_on' => ($data['starts_on'] ?? null) ?: null,
            'ends_on' => ($data['ends_on'] ?? null) ?: null,
            'is_active' => (bool) ($data['is_active'] ?? true),
        ];
    }

    private function store(UploadedFile $image): string
    {
        $compressed = $this->compressor->compress($image);
        $disk = Storage::disk(config('filesystems.profile_photos_disk'));
        $path = self::FOLDER.Str::uuid().'.'.$compressed->extension;
        if (! $disk->put($path, $compressed->contents, array_filter(['ContentType' => $compressed->mimeType, 'CacheControl' => 'public, max-age=31536000, immutable']))) {
            throw new RuntimeException('Could not upload the poster image.');
        }

        return $disk->url($path);
    }

    // Only images this service stored (not the bundled first poster).
    private function deleteStored(?string $url): void
    {
        $disk = Storage::disk(config('filesystems.profile_photos_disk'));
        $base = rtrim($disk->url(''), '/').'/';
        if ($url && str_starts_with($url, $base) && str_starts_with($path = substr($url, strlen($base)), self::FOLDER)) {
            $disk->delete($path);
        }
    }
}
