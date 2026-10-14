<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Http\Requests\Profile\UpdateBusinessProfileRequest;
use App\Http\Requests\Profile\UpdatePasswordRequest;
use App\Http\Requests\Profile\UpdateProfilePhotoRequest;
use App\Http\Requests\Profile\UpdateProfileRequest;
use App\Models\Entities\Agent;
use App\Services\ContactLinkService;
use App\Services\ProfilePhotoService;
use App\Services\ProfileService;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;

// Shared by every role: each signed-in user edits only their own profile.
class ProfileController extends Controller
{
    public function __construct(
        private ProfileService $profiles,
        private ProfilePhotoService $photos,
    ) {}

    public function edit(Request $request)
    {
        $user = $request->user();
        $agent = $user->agent?->load('profile');
        [$firstName, $lastName] = $agent
            ? [$agent->first_name, $agent->last_name]
            : array_pad(preg_split('/\s+(?=\S+$)/', trim($user->name)) ?: [], 2, '');

        return inertia('Profile/Edit', [
            'profile' => [
                'first_name' => $firstName ?? '',
                'middle_name' => $agent?->middle_name ?? '',
                'last_name' => $lastName ?? '',
                'email' => $user->email,
                'mobile' => $agent?->mobile ?? '',
                'phone' => $agent?->phone ?? '',
                'gender' => $agent ? ($agent->gender ? 'Male' : 'Female') : null,
                'marital_status' => $agent?->marital_status,
                'address' => $agent?->address ?? '',
                'city' => $agent?->city ?? '',
                'state' => $agent?->state ?? '',
                'about' => $agent?->profile?->about ?? '',
                'facebook' => $agent?->profile?->facebook ?? '',
                'instagram' => $agent?->profile?->instagram ?? '',
                'twitter' => $agent?->profile?->twitter ?? '',
                'linkedin' => $agent?->profile?->linkedin ?? '',
                'whatsapp' => $agent?->profile?->whatsapp ?? '',
            ],
            'maritalStatuses' => Agent::MARITAL_STATUSES,
            // To share with people they invite (agents only).
            'referralLink' => $agent ? Agent::referralLink($agent) : null,
            // Photos are compressed in the browser first; this is the ceiling PHP will actually accept.
            'maxPhotoKb' => min(UpdateProfilePhotoRequest::MAX_FILE_KB, intdiv(UploadedFile::getMaxFilesize(), 1024)),
        ]);
    }

    public function update(UpdateProfileRequest $request)
    {
        $this->profiles->update($request->user(), $request->validated());

        return back()->with('success', 'Profile saved.');
    }

    // Profile › Business profile: only what the public business profile shows.
    public function business(Request $request, ContactLinkService $links)
    {
        $user = $request->user();
        $agent = $user->agent?->load('profile');

        return inertia('Profile/Business', [
            'business' => [
                'about' => $agent?->profile?->about ?? '',
                'mobile' => $agent?->mobile ?? '',
                'facebook' => $agent?->profile?->facebook ?? '',
                'instagram' => $agent?->profile?->instagram ?? '',
                'twitter' => $agent?->profile?->twitter ?? '',
                'linkedin' => $agent?->profile?->linkedin ?? '',
                'whatsapp' => $agent?->profile?->whatsapp ?? '',
                'links' => $agent?->profile?->links ?? [],
            ],
            'slug' => $links->slugForUser($user),
        ]);
    }

    public function updateBusiness(UpdateBusinessProfileRequest $request)
    {
        $this->profiles->updateBusiness($request->user(), $request->validated());

        return back()->with('success', 'Business profile saved.');
    }

    public function updatePhoto(UpdateProfilePhotoRequest $request)
    {
        $this->photos->replace($request->user(), $request->file('photo'));

        return back()->with('success', 'Profile photo updated.');
    }

    public function destroyPhoto(Request $request)
    {
        $this->photos->remove($request->user());

        return back()->with('success', 'Profile photo removed.');
    }

    public function updatePassword(UpdatePasswordRequest $request)
    {
        $this->profiles->updatePassword($request->user(), $request->validated('password'));

        return back()->with('success', 'Password changed.');
    }
}
