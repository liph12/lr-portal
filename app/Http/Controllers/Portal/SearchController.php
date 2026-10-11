<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\Entities\AgentTransaction;
use App\Models\Entities\Team;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

// Typeahead data for the navbar search. JSON rather than Inertia props because it is fetched on every
// keystroke from whichever page is open, without a visit or URL change.
class SearchController extends Controller
{
    private const LIMIT = 8;

    public function users(Request $request): JsonResponse
    {
        Gate::authorize('search', User::class);

        $term = trim((string) $request->query('q', ''));

        if (mb_strlen($term) < 2) {
            return response()->json(['users' => []]);
        }

        $like = '%'.addcslashes($term, '%_\\').'%';
        $canManage = $request->user()->can('manage', User::class);

        $users = User::query()
            ->where(fn ($q) => $q->where('name', 'like', $like)->orWhere('email', 'like', $like))
            ->with(['roles:id,name,label', 'agent:id,user_id,avatar'])
            ->orderByRaw('CASE WHEN name LIKE ? THEN 0 ELSE 1 END', [addcslashes($term, '%_\\').'%'])
            ->orderBy('name')
            ->limit(self::LIMIT)
            ->get(['id', 'name', 'email', 'status'])
            ->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'avatar' => $user->agent?->avatar,
                'role_id' => $user->roles->first()?->id,
                'role_label' => $user->roles->first()?->label,
                'status' => $user->status,
            ]);

        return response()->json([
            'users' => $users,
            // Only superadmins get the option lists that drive the inline role/status controls.
            'roles' => $canManage ? Role::orderBy('id')->get(['id', 'label']) : [],
            'statuses' => $canManage ? User::STATUSES : [],
        ]);
    }

    // Agent picker (sale agents, team leaders, transfers): active agents only, id is agents.id.
    public function agents(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('create', AgentTransaction::class) || $request->user()->can('manage', Team::class), 403);

        $term = trim((string) $request->query('q', ''));

        if (mb_strlen($term) < 2) {
            return response()->json(['agents' => []]);
        }

        $like = '%'.addcslashes($term, '%_\\').'%';

        $agents = User::query()
            ->join('agents', 'agents.user_id', '=', 'users.id')
            ->where('users.status', 'active')
            ->where(fn ($q) => $q->where('users.name', 'like', $like)->orWhere('users.email', 'like', $like))
            ->orderByRaw('CASE WHEN users.name LIKE ? THEN 0 ELSE 1 END', [addcslashes($term, '%_\\').'%'])
            ->orderBy('users.name')
            ->limit(self::LIMIT)
            ->get(['agents.id', 'users.name', 'users.email', 'agents.avatar']);

        return response()->json(['agents' => $agents]);
    }
}
