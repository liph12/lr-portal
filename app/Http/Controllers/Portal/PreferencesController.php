<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Http\Requests\Portal\Settings\UpdateGenealogyPreferenceRequest;
use App\Http\Requests\Portal\Settings\UpdatePreferencesRequest;
use App\Http\Requests\Portal\Settings\UpdateThemeRequest;
use App\Services\UserPreferenceService;

// Settings › Preferences, shared by every role with use_preferences: each user changes only their own.
class PreferencesController extends Controller
{
    public function __construct(private UserPreferenceService $preferences) {}

    public function edit()
    {
        return inertia('Portal/Settings/Preferences');
    }

    public function update(UpdatePreferencesRequest $request)
    {
        $this->preferences->update($request->user(), $request->validated());

        return back()->with('success', 'Preferences saved.');
    }

    public function updateGenealogy(UpdateGenealogyPreferenceRequest $request)
    {
        $this->preferences->setGenealogy($request->user(), $request->validated());

        return back();
    }

    public function updateTheme(UpdateThemeRequest $request)
    {
        $this->preferences->setTheme($request->user(), $request->validated('theme'));

        return back();
    }
}
