<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\User;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserManagementController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $users = User::query()
            ->with('role')
            ->when($request->search, function ($q, $search) {
                $q->where(function ($sub) use ($search) {
                    $sub->where('name', 'like', "%{$search}%")
                        ->orWhere('username', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->when($request->role_id, fn($q, $roleId) => $q->where('role_id', $roleId))
            ->when($request->filled('is_active'), function ($q) use ($request) {
                $q->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN));
            })
            ->latest()
            ->paginate($request->integer('per_page', 15));

        return $this->successResponse($users, 'Data user berhasil diambil.');
    }

  
    public function roles(): JsonResponse
    {
        $roles = Role::all();

        return $this->successResponse($roles, 'Data role berhasil diambil.');
    }

    public function updateRole(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'role_id' => 'required|uuid|exists:roles,id',
        ]);

        $user->update(['role_id' => $validated['role_id']]);

        return $this->successResponse(
            $user->fresh('role'),
            'Role user berhasil diperbarui.'
        );
    }

 
    public function toggleStatus(User $user): JsonResponse
    {
        // Jangan biarkan manajer menonaktifkan dirinya sendiri
        if ($user->id === auth('api')->id()) {
            return $this->badRequestResponse('Anda tidak bisa menonaktifkan akun Anda sendiri.');
        }

        $user->update(['is_active' => !$user->is_active]);

        return $this->successResponse(
            $user->fresh('role'),
            $user->is_active ? 'User berhasil diaktifkan.' : 'User berhasil dinonaktifkan.'
        );
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'     => 'required|string|max:255',
            'username' => 'required|string|max:100|unique:users,username',
            'email'    => 'required|email|max:255|unique:users,email',
            'password' => 'required|string|min:6',
            'role_id'  => 'required|uuid|exists:roles,id',
        ]);

        $user = User::create([
            'role_id'           => $validated['role_id'],
            'name'              => $validated['name'],
            'username'          => $validated['username'],
            'email'             => $validated['email'],
            'email_verified_at' => now(),
            'password'          => $validated['password'],
            'is_active'         => true,
        ]);

        return $this->successResponse(
            $user->load('role'),
            'User baru berhasil ditambahkan.',
            201
        );
    }
}
