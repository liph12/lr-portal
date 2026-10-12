<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\GenealogyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;

// The recruit network as a tree, shared by every role with view_genealogy: your own downline, or — back office and
// office secretaries — anyone's within reach (?agent=ID).
class GenealogyController extends Controller
{
    public function __construct(private GenealogyService $genealogy) {}

    public function index(Request $request)
    {
        $user = $request->user();
        $own = $user->agent()->value('id');
        $rootId = (int) $request->query('agent') ?: ($own ? (int) $own : null);
        abort_unless($rootId || $this->genealogy->canPick($user), 403);
        abort_if($rootId && ! $this->genealogy->canView($user, $rootId), 403);
        $root = $rootId ? $this->genealogy->node($rootId) : null;
        // Recruits per opened card and the layout: the viewer's Preferences, else the smallest step (the best few), top-down.
        $preferences = $user->can(User::PREFERENCES_PERMISSION) ? $user->preferences() : null;
        $perBranch = $preferences['genealogy_per_branch'] ?? User::GENEALOGY_SIZES[0];

        return inertia('Portal/Genealogy/Index', [
            'root' => $root,
            'upline' => fn () => $root ? $this->genealogy->upline($user, $root['id']) : [],
            'firstBranch' => fn () => $root ? $this->genealogy->branch($root['id'], 0, $perBranch) : null,
            // One more page of recruits under any card in reach, asked for by the tree as you expand it.
            'branch' => Inertia::optional(function () use ($request, $user) {
                $parent = (int) $request->query('parent');
                abort_unless($parent && $this->genealogy->canView($user, $parent), 403);

                $limit = in_array((int) $request->query('limit'), User::GENEALOGY_SIZES, true) ? (int) $request->query('limit') : User::GENEALOGY_SIZES[0];

                return $this->genealogy->branch($parent, max(0, (int) $request->query('offset')), $limit);
            }),
            'ownId' => $own ? (int) $own : null,
            'perBranch' => $perBranch,
            'sizes' => User::GENEALOGY_SIZES,
            'layout' => $preferences['genealogy_layout'] ?? User::GENEALOGY_LAYOUTS[0],
            'canSaveSize' => $user->can(User::PREFERENCES_PERMISSION),
            'canPick' => $this->genealogy->canPick($user),
            'roles' => GenealogyService::ROLES,
        ]);
    }

    // Typeahead for choosing whose tree to open — a JSON endpoint because it can't be an Inertia visit.
    public function search(Request $request): JsonResponse
    {
        abort_unless($this->genealogy->canPick($request->user()), 403);
        $term = trim((string) $request->query('q', ''));
        $role = in_array($request->query('role'), GenealogyService::ROLES, true) ? $request->query('role') : null;

        return response()->json(['agents' => mb_strlen($term) < 2 ? [] : $this->genealogy->search($request->user(), $term, $role)]);
    }
}
