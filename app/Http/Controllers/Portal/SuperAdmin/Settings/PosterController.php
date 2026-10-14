<?php

namespace App\Http\Controllers\Portal\SuperAdmin\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\SuperAdmin\Settings\DeletePosterRequest;
use App\Http\Requests\SuperAdmin\Settings\ReorderPostersRequest;
use App\Http\Requests\SuperAdmin\Settings\SavePosterRequest;
use App\Http\Requests\SuperAdmin\Settings\TogglePosterRequest;
use App\Models\Entities\DashboardPoster;
use App\Services\DashboardPosterService;
use Illuminate\Http\UploadedFile;

// Settings › Dashboard posters: the announcements every user sees in the dashboard's carousel.
class PosterController extends Controller
{
    public function __construct(private DashboardPosterService $posters) {}

    public function index()
    {
        return inertia('SuperAdmin/Settings/Posters/Index', [
            'posters' => $this->posters->all(),
            // Photos are compressed in the browser first; this is the ceiling PHP will actually accept.
            'maxImageKb' => min(SavePosterRequest::MAX_IMAGE_KB, intdiv(UploadedFile::getMaxFilesize(), 1024)),
        ]);
    }

    public function store(SavePosterRequest $request)
    {
        $this->posters->create($request->safe()->except('image'), $request->file('image'), $request->user());

        return back()->with('success', 'Poster added to the dashboard.');
    }

    public function update(SavePosterRequest $request, DashboardPoster $poster)
    {
        $this->posters->update($poster, $request->safe()->except('image'), $request->file('image'), $request->user());

        return back()->with('success', 'Poster saved.');
    }

    public function toggle(TogglePosterRequest $request, DashboardPoster $poster)
    {
        $this->posters->setActive($poster, $request->boolean('is_active'), $request->user());

        return back()->with('success', $request->boolean('is_active') ? 'Poster is showing.' : 'Poster hidden.');
    }

    public function reorder(ReorderPostersRequest $request)
    {
        $this->posters->reorder($request->validated('ids'));

        return back();
    }

    public function destroy(DeletePosterRequest $request, DashboardPoster $poster)
    {
        $this->posters->delete($poster);

        return back()->with('success', 'Poster deleted.');
    }
}
