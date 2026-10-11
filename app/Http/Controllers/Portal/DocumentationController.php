<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Http\Requests\Portal\Documentation\CommentDocumentRequest;
use App\Http\Requests\Portal\Documentation\ReviewDocumentRequest;
use App\Models\Entities\AgentDocument;
use App\Services\AgentDocumentService;
use Illuminate\Http\Request;

// Documentation (superadmin, admin and staff portals; manage_documents): review agents' uploaded requirements.
class DocumentationController extends Controller
{
    public function __construct(private AgentDocumentService $documents) {}

    public function index(Request $request)
    {
        $filters = $this->documents->filters($request->query());
        $page = $this->documents->table($filters);
        $open = (int) $request->query('document');

        return inertia('Portal/Documentation/Index', [
            'documents' => ['data' => $page->items(), 'total' => $page->total(), 'page' => $page->currentPage(), 'per_page' => $page->perPage()],
            'filters' => $filters,
            'counts' => fn () => $this->documents->counts(['status' => null] + $filters),
            'types' => AgentDocument::TYPES,
            'statuses' => AgentDocument::STATUSES,
            // The review panel, for ?document=ID.
            'document' => fn () => $open ? (($d = AgentDocument::find($open)) ? $this->documents->detail($d) : null) : null,
        ]);
    }

    public function review(ReviewDocumentRequest $request, AgentDocument $document)
    {
        $this->documents->review($document, $request->user(), $request->validated());

        return back()->with('success', 'Review saved.');
    }

    public function comment(CommentDocumentRequest $request, AgentDocument $document)
    {
        $this->documents->comment($document, $request->user(), $request->validated('body'));

        return back();
    }
}
