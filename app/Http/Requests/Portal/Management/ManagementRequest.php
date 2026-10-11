<?php

namespace App\Http\Requests\Portal\Management;

use App\Models\Entities\Team;
use Illuminate\Foundation\Http\FormRequest;

// Every write in Management is for admins and superadmins (TeamPolicy::manage).
abstract class ManagementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('manage', Team::class);
    }
}
