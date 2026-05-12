<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ResetUserPasswordRequest;
use App\Http\Requests\StoreUserManagementRequest;
use App\Http\Requests\UpdateUserManagementRequest;
use App\Models\User;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class UserManagementController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'role' => ['nullable', 'string', 'max:50', 'exists:roles,slug'],
            'status' => ['nullable', 'in:active,inactive'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $users = User::query()
            ->with('role:id,name,slug')
            ->when($validated['q'] ?? null, function ($query, string $keyword) {
                $query->where(function ($search) use ($keyword) {
                    $search
                        ->where('name', 'like', "%{$keyword}%")
                        ->orWhere('username', 'like', "%{$keyword}%")
                        ->orWhere('email', 'like', "%{$keyword}%");
                });
            })
            ->when($validated['role'] ?? null, fn($query, string $role) => $query->whereHas('role', fn($roleQuery) => $roleQuery->where('slug', $role)))
            ->when($validated['status'] ?? null, fn($query, string $status) => $query->where('is_active', $status === 'active'))
            ->orderBy('name')
            ->paginate((int) ($validated['per_page'] ?? 15))
            ->through(fn(User $user) => $this->userPayload($user));

        return $this->successResponse($users, 'Data user berhasil diambil.');
    }

    public function store(StoreUserManagementRequest $request): JsonResponse
    {
        $user = User::create([
            ...$request->validated(),
            'email_verified_at' => now(),
        ]);

        return $this->successResponse($this->userPayload($user->load('role')), 'User berhasil ditambahkan.', 201);
    }

    public function show(User $user): JsonResponse
    {
        return $this->successResponse($this->userPayload($user->load('role')), 'Detail user berhasil diambil.');
    }

    public function update(UpdateUserManagementRequest $request, User $user): JsonResponse
    {
        $user->update($request->validated());

        return $this->successResponse($this->userPayload($user->fresh('role')), 'User berhasil diperbarui.');
    }

    public function resetPassword(ResetUserPasswordRequest $request, User $user): JsonResponse
    {
        $user->update(['password' => $request->validated('password')]);

        return $this->successResponse(null, 'Password user berhasil direset.');
    }

    public function destroy(User $user): JsonResponse
    {
        if ($user->id === Auth::guard('api')->id()) {
            return $this->badRequestResponse('User tidak dapat menghapus akunnya sendiri.');
        }

        $user->delete();

        return $this->successResponse(null, 'User berhasil dihapus.');
    }

    private function userPayload(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'username' => $user->username,
            'email' => $user->email,
            'role' => $user->role ? [
                'id' => $user->role->id,
                'name' => $user->role->name,
                'slug' => $user->role->slug,
            ] : null,
            'is_active' => $user->is_active,
            'status' => $user->is_active ? 'active' : 'inactive',
            'created_at' => $user->created_at,
            'updated_at' => $user->updated_at,
        ];
    }
}
