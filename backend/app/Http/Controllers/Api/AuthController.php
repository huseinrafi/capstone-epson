<?php

namespace App\Http\Controllers\Api;

use App\Constants\RoleConstant;
use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Models\Role;
use App\Models\User;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    use ApiResponse;

    public function register(RegisterRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $role = Role::find(RoleConstant::DEFAULT_REGISTER_ROLE_ID);

        if (!$role) {
            return $this->serverErrorResponse('Role default operator checker belum tersedia.');
        }

        $user = User::create([
            'role_id' => $role->id,
            'name' => $validated['name'],
            'username' => $validated['username'],
            'email' => $validated['email'],
            'email_verified_at' => now(),
            'password' => $validated['password'],
        ]);

        $token = Auth::guard('api')->login($user);

        return $this->successResponse([
            'token_type' => 'Bearer',
            'access_token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'username' => $user->username,
                'email' => $user->email,
                'role' => $role->slug,
            ],
        ], 'Register berhasil.', 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        if (!$token = Auth::guard('api')->attempt($request->validated())) {
            return $this->unauthorizedResponse('Email atau password salah.');
        }

        $user = Auth::guard('api')->user()->load('role');

        if (!$user->is_active) {
            Auth::guard('api')->logout();

            return $this->forbiddenResponse('Akun tidak aktif.');
        }

        return $this->successResponse([
            'token_type' => 'Bearer',
            'access_token' => $token,
            'expires_in' => Auth::guard('api')->factory()->getTTL() * 60,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'username' => $user->username,
                'email' => $user->email,
                'role' => $user->role?->slug,
            ],
        ], 'Login berhasil.');
    }

    public function me(): JsonResponse
    {
        return $this->successResponse(
            Auth::guard('api')->user()->load('role'),
            'Data user berhasil diambil.'
        );
    }

    public function logout(): JsonResponse
    {
        Auth::guard('api')->logout();

        return $this->successResponse(null, 'Logout berhasil.');
    }
}
