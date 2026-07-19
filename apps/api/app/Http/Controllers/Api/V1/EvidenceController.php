<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Cases\SupersedeEvidenceRequest;
use App\Http\Resources\EvidenceItemResource;
use App\Models\EvidenceItem;
use App\Services\Cases\EvidenceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Symfony\Component\HttpFoundation\StreamedResponse;

class EvidenceController extends Controller
{
    public function __construct(private readonly EvidenceService $evidence) {}

    public function supersede(SupersedeEvidenceRequest $request, EvidenceItem $evidence): JsonResponse
    {
        $replacement = $this->evidence->supersede($evidence, $request->user(), $request->file('file'));

        return (new EvidenceItemResource($replacement))->response()->setStatusCode(201);
    }

    /**
     * Signed temporary URL (CLAUDE.md hardening): evidence media is never
     * served from a permanent public path — only a short-lived, signed link.
     */
    public function downloadUrl(Request $request, EvidenceItem $evidence): JsonResponse
    {
        $this->authorize('view', $evidence);

        $url = URL::temporarySignedRoute('evidence.download', now()->addMinutes(30), ['evidence' => $evidence->id]);

        return response()->json(['data' => ['url' => $url, 'expires_in_minutes' => 30]]);
    }

    /**
     * The signature itself is the access credential (matching the
     * `cases/join/{token}` / `reports/verify/{qrToken}` pattern) — no
     * separate Sanctum auth is required here, only a valid signature.
     */
    public function download(Request $request, EvidenceItem $evidence): StreamedResponse
    {
        return Storage::disk('public')->download($evidence->file_path);
    }
}
