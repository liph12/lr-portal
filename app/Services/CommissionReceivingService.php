<?php

namespace App\Services;

use App\Models\Entities\AgentRentalTransaction;
use App\Models\Entities\AgentTransaction;
use App\Models\User;
use App\Policies\UserPolicy;
use App\Support\Areas;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

// Brokerage receiving and Rental receiving: sales encoded from their commission slips wait there until someone confirms
// (and signs for) the commission, or disapproves it. Each is its own page and permission, for the back office only
// (superadmin, admin, staff) — not office secretaries. Filtered like Sales validation: remittance dates and area.
class CommissionReceivingService
{
    public const CATEGORIES = [
        AgentTransaction::TYPE_BROKERAGE => ['permission' => 'receive_brokerage_sales', 'table' => 'agent_brokerage_transactions'],
        AgentTransaction::TYPE_RENTAL => ['permission' => 'receive_rental_sales', 'table' => 'agent_rental_transactions'],
    ];

    public const STATUSES = ['awaiting', 'received', 'disapproved'];

    private const PER_PAGE = [25, 50, 100];

    public function __construct(private SaleValidationService $validation) {}

    /**
     * The categories this user receives: back office only, by permission.
     *
     * @return list<string>
     */
    public function categories(User $user): array
    {
        if (! $user->hasAnyRole(UserPolicy::SEARCH_ROLES)) {
            return [];
        }

        return array_values(array_filter(array_keys(self::CATEGORIES), fn ($c) => $user->can(self::CATEGORIES[$c]['permission'])));
    }

    /**
     * Normalised filters: status, remittance dates (default this month, as Sales validation), area (or all).
     *
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public function filters(array $input): array
    {
        $f = $this->validation->filters($input);

        return [
            'status' => in_array($input['status'] ?? null, self::STATUSES, true) ? $input['status'] : 'awaiting',
            'from' => $f['from'],
            'to' => $f['to'],
            'area' => is_string($input['area'] ?? null) && array_key_exists($input['area'], config('areas')) ? $input['area'] : null,
        ] + array_intersect_key($input, array_flip(['q', 'sort', 'dir', 'per_page']));
    }

    /**
     * The menu badges: slips waiting this month (the range the pages open on), per category; null when they receive none.
     *
     * @return array{awaiting: int, brokerage?: int, rental?: int}|null
     */
    public function awaiting(User $user): ?array
    {
        $categories = $this->categories($user);
        if (! $categories) {
            return null;
        }
        $f = $this->filters([]);
        $counts = [];
        foreach ($categories as $category) {
            $counts[$category] = $this->query($category, 'awaiting', $f)->count();
        }

        return ['awaiting' => array_sum($counts)] + $counts;
    }

    /**
     * @param  array<string, mixed>  $f  normalised filters (dates and area apply; status doesn't)
     * @return array{awaiting: int, received: int, disapproved: int}
     */
    public function counts(string $category, array $f): array
    {
        return array_combine(self::STATUSES, array_map(fn ($status) => $this->query($category, $status, $f)->count(), self::STATUSES));
    }

    /**
     * @param  array<string, mixed>  $f  normalised filters
     */
    public function list(string $category, array $f): LengthAwarePaginator
    {
        $filters = $f;
        $status = $f['status'];
        $sorts = ['id' => 't.id', 'remittance_date' => 'b.remittance_date', 'commission_received' => 'b.commission_received', 'received_at' => 'b.received_at', 'disapproved_at' => 'b.disapproved_at'];
        $sort = $sorts[$filters['sort'] ?? ''] ?? 'b.remittance_date';
        $dir = ($filters['dir'] ?? null) === 'asc' ? 'asc' : 'desc';
        $perPage = in_array((int) ($filters['per_page'] ?? 0), self::PER_PAGE, true) ? (int) $filters['per_page'] : self::PER_PAGE[0];
        $brokerage = $category === AgentTransaction::TYPE_BROKERAGE;

        $query = $this->query($category, $status, $f)
            ->leftJoin('agent_transaction_details as d', 'd.agent_transaction_id', '=', 't.id')
            ->leftJoin('users as au', 'au.id', '=', 'a.user_id')
            ->leftJoin('users as rb', 'rb.id', '=', 't.recorded_by')
            ->leftJoin('users as rv', 'rv.id', '=', 'b.received_by')
            ->leftJoin('users as dv', 'dv.id', '=', 'b.disapproved_by')
            ->when($brokerage, fn ($q) => $q->leftJoin('brokerage_areas as ba', 'ba.id', '=', 'b.brokerage_area_id'));

        if ($term = trim((string) ($filters['q'] ?? ''))) {
            $like = '%'.addcslashes($term, '%_\\').'%';
            $query->where(fn ($w) => $w->where('d.client_first_name', 'like', $like)->orWhere('d.client_last_name', 'like', $like)
                ->orWhere('au.name', 'like', $like)->orWhere('rb.name', 'like', $like)->orWhere('b.closing_agent', 'like', $like)
                ->orWhere('t.unit_number', 'like', $like)->orWhere('t.id', ctype_digit($term) ? (int) $term : 0));
        }

        $page = $query->select(
            't.id', 't.unit_number', 'b.remittance_date', 'b.commission_received', 'b.closing_agent', 'b.received_at', 'b.remittance_slip',
            'au.name as agent_name', 'rb.name as recorded_by', 'rv.name as received_by', 'dv.name as disapproved_by', 'b.disapproved_at', 'b.disapproval_reason',
            'd.client_first_name', 'd.client_middle_name', 'd.client_last_name',
        )
            ->when(! $brokerage, fn ($q) => $q->addSelect('b.closing_agent_id', 'b.unregistered_agent_email'))
            ->when($brokerage, fn ($q) => $q->addSelect('ba.name as place', 'b.company_share as share', 'b.company_share_rate as share_rate'))
            ->selectRaw(SaleValidationService::AREA.' as area')
            ->orderBy($sort, $dir)->orderBy('t.id', $dir)
            ->paginate($perPage)->withQueryString();

        $page->getCollection()->transform(function ($r) use ($brokerage) {
            // Rent.ph's share isn't stored: it's always 20% of the amount received.
            [, $rentShare] = RentalSaleService::amounts((float) $r->commission_received);

            return [
                'id' => $r->id,
                'remittance_date' => $r->remittance_date ? substr((string) $r->remittance_date, 0, 10) : null,
                'client' => trim(implode(' ', array_filter([$r->client_first_name, $r->client_middle_name, $r->client_last_name]))),
                'agent' => $r->agent_name ?? $r->recorded_by,
                'closing_agent' => $r->closing_agent,
                // A rental closing agent with no LR account yet (kept by name until an account links them).
                'unregistered_agent' => ! $brokerage && ! $r->closing_agent_id && $r->unregistered_agent_email !== null,
                // Brokerage: its area; rental: the unit address.
                'place' => $brokerage ? $r->place : $r->unit_number,
                'area' => $r->area ? Areas::name($r->area) : null,
                'commission_received' => (float) $r->commission_received,
                'share' => $brokerage ? (float) $r->share : $rentShare,
                'share_rate' => $brokerage ? (float) $r->share_rate : (float) AgentRentalTransaction::RENT_PH_SHARE_RATE,
                'received_at' => $r->received_at ? (string) $r->received_at : null,
                'received_by' => $r->received_by,
                'disapproved_at' => $r->disapproved_at ? (string) $r->disapproved_at : null,
                'disapproved_by' => $r->disapproved_by,
                'disapproval_reason' => $r->disapproval_reason,
                'slip' => $r->remittance_slip,
            ];
        });

        return $page;
    }

    // Whether this is a slip-encoded sale of a category the user receives (and, from a receiving page, of that page's
    // category), within their areas.
    public function canOpen(User $user, int $saleId, ?string $only = null): bool
    {
        $category = DB::table('agent_transactions')->where('id', $saleId)->value('sale_type');
        if ($only !== null && $category !== $only) {
            return false;
        }

        return in_array($category, $this->categories($user), true)
            && $this->query($category, null, null)->where('t.id', $saleId)->exists();
    }

    /**
     * @param  array<string, mixed>|null  $f  normalised filters; null = any date, any area
     */
    private function query(string $category, ?string $status, ?array $f): Builder
    {
        return $this->validation->base()
            ->join(self::CATEGORIES[$category]['table'].' as b', 'b.agent_transaction_id', '=', 't.id')
            ->where('t.sale_type', $category)
            // Encoded from the commission slip (legacy sales have no fixed rate stored).
            ->whereNotNull('b.commission_rate')
            ->when($status === 'awaiting', fn ($q) => $q->whereNull('b.received_at')->where('t.sale_status', 'pending'))
            ->when($status === 'received', fn ($q) => $q->whereNotNull('b.received_at'))
            // Disapproved here, or marked invalid in Sales validation.
            ->when($status === 'disapproved', fn ($q) => $q->where('t.sale_status', 'invalid'))
            ->when($f, fn ($q) => $q->whereBetween('b.remittance_date', [$f['from'], $f['to']]))
            ->when($f['area'] ?? null, fn ($q, $area) => $q->whereRaw(SaleValidationService::AREA.' = ?', [$area]));
    }
}
