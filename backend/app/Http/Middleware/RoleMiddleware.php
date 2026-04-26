<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Auth;

class RoleMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        if (!Auth::guard('api')->check()) {
            return response()->json(['error' => 'Unauthorized. Please login.'], 401);
        }

        $user = Auth::guard('api')->user();

        if (!in_array($user->role, $roles)) {
            return response()->json(['error' => 'Forbidden. Akses ditolak untuk role anda.'], 403);
        }

        return $next($request);
    }
}
