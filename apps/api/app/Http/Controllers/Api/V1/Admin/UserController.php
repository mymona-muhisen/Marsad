<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\IndexUsersRequest;
use App\Http\Requests\Admin\SyncRolesRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\Admin\RoleAssignmentService;
use App\Services\Admin\UserDirectoryService;
use Illuminate\Http\JsonResponse;

class UserController extends Controller
{
    public function __construct(
        private readonly UserDirectoryService $directory,
        private readonly RoleAssignmentService $roles,
    ) {}

    public function index(IndexUsersRequest $request): JsonResponse
    {
        $users = $this->directory
            ->search($request->validated('q'), $request->validated('role'))
            ->paginate(min($request->integer('per_page', 25), 100));

        return UserResource::collection($users)->response();
    }

    /**
     * Replace a user's roles wholesale.
     *
     * A sync rather than add/remove endpoints: the console edits the whole set
     * at once, and two half-applied calls could leave someone with neither
     * their old role nor their new one.
     */
    public function syncRoles(SyncRolesRequest $request, User $user): JsonResponse
    {
        $updated = $this->roles->sync(
            $request->user(),
            $user,
            $request->validated('roles'),
        );

        return (new UserResource($updated))->response();
    }
}
