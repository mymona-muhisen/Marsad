<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\AuditLogResource;
use App\Services\Audit\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function __construct(private readonly AuditLogService $auditLog) {}

    /**
     * The audit trail (doc 01 §B.4 — super_admin's "audit log access").
     *
     * The table has been written to since Sprint 7 and had no reader at all.
     */
    public function index(Request $request): JsonResponse
    {
        $logs = $this->auditLog
            ->recent($request->string('entity_type')->toString() ?: null)
            ->paginate(min($request->integer('per_page', 50), 100));

        return AuditLogResource::collection($logs)->response();
    }
}
