<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    /**
     * Login via Role Selection & Optional Node
     */
    public function login(Request $request)
    {
        $request->validate([
            'role' => 'required|in:operator_checker,admin_gudang,supervisor,manajer',
            'node_id' => 'required_if:role,operator_checker|exists:nodes,id'
        ]);

        // Find or create a distinct generic user purely representing this role (since passwordless)
        $user = User::firstOrCreate(
            ['role' => $request->role],
            ['name' => 'Generik ' . ucfirst(str_replace('_', ' ', $request->role))]
        );

        // Generate token and inject node_id if operator
        /** @var \PHPOpenSourceSaver\JWTAuth\JWTGuard $guard */
        $guard = Auth::guard('api');
        
        $claims = [];
        if ($request->node_id) {
            $claims['node_id'] = $request->node_id;
        }
        
        $token = $guard->claims($claims)->tokenById($user->id);

        if (!$token) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        return $this->respondWithToken($token, $user, $request->node_id, $guard);
    }

    /**
     * Get the authenticated User
     */
    public function me()
    {
        return response()->json(Auth::guard('api')->user());
    }

    /**
     * Log the user out (Invalidate the token)
     */
    public function logout()
    {
        Auth::guard('api')->logout();
        return response()->json(['message' => 'Successfully logged out']);
    }

    /**
     * Get the token array structure
     */
    protected function respondWithToken($token, $user, $node_id, $guard)
    {
        return response()->json([
            'access_token' => $token,
            'token_type' => 'bearer',
            'expires_in' => $guard->factory()->getTTL() * 60,
            'user' => [
                'role' => $user->role,
                'name' => $user->name,
                'node_id' => $node_id
            ]
        ]);
    }
}
