<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Http\Requests\Portal\Contact\StoreContactInquiryRequest;
use App\Models\Entities\ContactInquiry;
use App\Services\ContactInquiryService;
use App\Services\ContactLinkService;

// An agent's public contact page: no sign-in, found by the slug in their "Your links" card.
class ContactController extends Controller
{
    public function __construct(
        private ContactLinkService $links,
        private ContactInquiryService $inquiries,
    ) {}

    // The social-media-style public profile: about, contact details, social links, and the way to the inquiry form.
    public function profile(string $slug)
    {
        $agent = $this->links->resolve($slug) ?? abort(404);

        return inertia('BusinessProfile/Show', [
            'slug' => $slug,
            'agent' => $this->links->profile($agent->load('profile')),
        ]);
    }

    public function show(string $slug)
    {
        $agent = $this->links->resolve($slug) ?? abort(404);

        return inertia('Contact/Show', [
            'slug' => $slug,
            'agent' => $this->links->card($agent),
            'options' => [
                'roles' => ContactInquiry::ROLES,
                'types' => ContactInquiry::TYPES,
            ],
        ]);
    }

    public function store(StoreContactInquiryRequest $request, string $slug)
    {
        $agent = $this->links->resolve($slug) ?? abort(404);

        $this->inquiries->submit($agent, $request->validated());

        return back()->with('success', 'Your inquiry has been sent.');
    }

    public function vcard(string $slug)
    {
        $agent = $this->links->resolve($slug) ?? abort(404);

        return response($this->links->vcard($agent), 200, [
            'Content-Type' => 'text/vcard; charset=utf-8',
            'Content-Disposition' => 'attachment; filename="'.$slug.'.vcf"',
        ]);
    }
}
