<?php

namespace App\Services;

use App\Models\AppSetting;
use App\Models\Entities\SalesCutoff;
use App\Models\User;
use Illuminate\Support\Carbon;

// Whether a sale may be recorded right now: the global on/off switch, and the monthly cutoffs.
class SalesEncodingService
{
    private const SETTING = 'sales_encoding';

    public function __construct(private ActivityLogger $activity) {}

    /**
     * @return array{enabled: bool, message: ?string, changed_at: ?string}
     */
    public function state(): array
    {
        $value = AppSetting::find(self::SETTING)?->value ?? [];

        return [
            'enabled' => (bool) ($value['enabled'] ?? true),
            'message' => $value['message'] ?? null,
            'changed_at' => $value['changed_at'] ?? null,
        ];
    }

    public function isEnabled(): bool
    {
        return $this->state()['enabled'];
    }

    public function setEnabled(bool $enabled, ?string $message, User $by): void
    {
        $message = $enabled ? null : (trim((string) $message) ?: null);

        AppSetting::updateOrCreate(['key' => self::SETTING], [
            'value' => ['enabled' => $enabled, 'message' => $message, 'changed_at' => now()->toIso8601String()],
            'updated_by' => $by->id,
        ]);

        $this->activity->describe(
            $enabled ? 'sales.encoding_enabled' : 'sales.encoding_disabled',
            $enabled ? 'Turned sale recording back on' : 'Turned sale recording off'.($message ? ": {$message}" : ''),
            null,
            ['message' => $message],
        );
    }

    /**
     * The cutoff that has closed sales reserved on this date, or null while that month is still open.
     * A month closes at its own cutoff; a month without one is closed once a later month's cutoff has
     * passed (older months can't stay open behind a closed one).
     */
    public function closedBy(string $reservationDate, ?Carbon $now = null): ?SalesCutoff
    {
        $now ??= now();
        $month = substr($reservationDate, 0, 7);

        $own = SalesCutoff::where('month', $month)->first();
        if ($own) {
            return $own->cutoff_at->lte($now) ? $own : null;
        }

        return SalesCutoff::where('month', '>', $month)->where('cutoff_at', '<=', $now)->orderBy('month')->first();
    }

    /**
     * month => cutoff ISO time, so the record-sale forms can warn before submitting.
     *
     * @return array<string, string>
     */
    public function cutoffTimes(): array
    {
        return SalesCutoff::orderBy('month')->get(['month', 'cutoff_at'])
            ->mapWithKeys(fn (SalesCutoff $c) => [$c->month => $c->cutoff_at->toIso8601String()])
            ->all();
    }

    public function saveCutoff(?SalesCutoff $cutoff, string $month, string $cutoffAt): SalesCutoff
    {
        $creating = ! $cutoff;
        $cutoff ??= new SalesCutoff;
        $cutoff->fill(['month' => $month, 'cutoff_at' => Carbon::parse($cutoffAt)])->save();

        $this->activity->describe(
            $creating ? 'sales.cutoff_created' : 'sales.cutoff_updated',
            ($creating ? 'Set' : 'Changed')." the {$this->monthLabel($month)} sales cutoff to {$cutoff->cutoff_at->format('M j, Y g:i A')}",
            $cutoff,
        );

        return $cutoff;
    }

    public function deleteCutoff(SalesCutoff $cutoff): void
    {
        $cutoff->delete();

        $this->activity->describe('sales.cutoff_deleted', "Removed the {$this->monthLabel($cutoff->month)} sales cutoff", null, [
            'month' => $cutoff->month,
            'cutoff_at' => $cutoff->cutoff_at->toIso8601String(),
        ]);
    }

    public function monthLabel(string $month): string
    {
        return Carbon::createFromFormat('Y-m-d', "{$month}-01")->format('F Y');
    }
}
