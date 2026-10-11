<?php

namespace App\Http\Controllers\Portal\SuperAdmin\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\SuperAdmin\Settings\UpdateUserStatusRequest;
use App\Models\User;
use App\Services\UserAccountService;

class UserStatusController extends Controller
{
    public function __construct(private UserAccountService $accounts) {}

    public function update(UpdateUserStatusRequest $request, User $user)
    {
        $status = $request->validated('status');

        $this->accounts->changeStatus($request->user(), $user, $status);

        return back()
            ->with('selected_role', $user->roles()->value('id'))
            ->with('success', "{$user->name} is now ".ucfirst($status).'.');
    }
}
