<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Http\Requests\Portal\QrMaker\DeleteShortLinkRequest;
use App\Http\Requests\Portal\QrMaker\StoreShortLinkRequest;
use App\Models\Entities\ShortLink;
use App\Services\ShortLinkService;
use Illuminate\Http\Request;

// Dashboard › QR Code Maker (every signed-in role): a QR code for any link, drawn in the browser, with an optional short link
// on the LR domain in front of it; and the public /url/{code} redirect those short links use.
class QrMakerController extends Controller
{
    public function __construct(private ShortLinkService $links) {}

    public function index(Request $request)
    {
        return inertia('Portal/Dashboard/QrMaker/Index', [
            'links' => $this->links->mine($request->user()),
            // Where short links live, so the page can show what one will look like before it is made.
            'short_base' => url('/url'),
            'alias_reserved' => ShortLinkService::RESERVED,
        ]);
    }

    public function storeLink(StoreShortLinkRequest $request)
    {
        $link = $this->links->shorten($request->user(), (string) $request->input('url'), $request->input('alias'), $request->input('title'));

        return back()->with('success', 'Short link ready: '.$link['short_url']);
    }

    public function destroyLink(DeleteShortLinkRequest $request, ShortLink $link)
    {
        $this->links->delete($link);

        return back()->with('success', 'Short link removed. QR codes that used it no longer open.');
    }

    // Public: a short link opens what it stands for, counting the visit.
    public function open(string $code)
    {
        $url = $this->links->open($code) ?? abort(404);

        return redirect()->away($url, 302, ['Cache-Control' => 'no-store']);
    }
}
